/**
 * Parses the OpenElectricity `/v4/facilities/` response into application types.
 *
 * Validation is lenient by record and strict by envelope: a malformed envelope
 * throws because nothing can be shown, while an individual unrecognised record
 * is skipped so one bad row cannot blank the whole view.
 */

import {
  batteryRole,
  normaliseCapacity,
  normaliseCommencement,
  normaliseState,
  normaliseStatus,
  normaliseTechnology,
  type BatteryRole,
} from './normalise'
import type { Facility, Unit } from './types'

export class FacilitiesParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FacilitiesParseError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

interface CandidateUnit {
  readonly unit: Unit
  readonly role: BatteryRole | null
}

function parseUnit(raw: unknown): CandidateUnit | null {
  if (!isRecord(raw)) return null

  const code = asString(raw['code'])
  if (!code) return null

  const fueltechId = typeof raw['fueltech_id'] === 'string' ? raw['fueltech_id'] : null

  return {
    unit: {
      code,
      technology: normaliseTechnology(fueltechId),
      status: normaliseStatus(typeof raw['status_id'] === 'string' ? raw['status_id'] : null),
      capacityMw: normaliseCapacity(raw['capacity_registered']),
      commencement: normaliseCommencement(
        typeof raw['commencement_date'] === 'string' ? raw['commencement_date'] : null,
        typeof raw['commencement_date_specificity'] === 'string'
          ? raw['commencement_date_specificity']
          : null,
      ),
    },
    role: batteryRole(fueltechId),
  }
}

/**
 * Resolves the feed's triple-counting of batteries.
 *
 * One battery can appear three times in a facility: a canonical bidirectional
 * record, a discharging (generator) record and a charging (load) record, each
 * reporting the same MW. Summing all three inflates national battery capacity
 * threefold (72,010 MW against an actual 24,013 MW).
 *
 * Per DATA_GUIDE.md: prefer canonical records; fall back to discharging when a
 * facility has none; never count charging, which is load rather than generation.
 * Selection is per facility rather than per unit code — the codes do not pair
 * reliably (`BALB1` against `BALBG1`), and no facility in the live feed carries
 * more than one canonical battery record.
 */
function selectBatteryUnits(candidates: readonly CandidateUnit[]): Unit[] {
  const nonBattery = candidates.filter((c) => c.role === null)
  const canonical = candidates.filter((c) => c.role === 'canonical')
  const discharging = candidates.filter((c) => c.role === 'discharging')

  const batteries = canonical.length > 0 ? canonical : discharging

  // Preserve source order so the facility table is stable between renders.
  const keep = new Set([...nonBattery, ...batteries])
  return candidates.filter((c) => keep.has(c)).map((c) => c.unit)
}

function parseFacility(raw: unknown): Facility | null {
  if (!isRecord(raw)) return null

  const code = asString(raw['code'])
  if (!code) return null

  const rawUnits = Array.isArray(raw['units']) ? raw['units'] : []
  const candidates = rawUnits
    .map(parseUnit)
    .filter((candidate): candidate is CandidateUnit => candidate !== null)

  const units = selectBatteryUnits(candidates)
  // A facility whose only units were charging records has no generating
  // capacity to report, so it leaves the model entirely.
  if (units.length === 0) return null

  return {
    code,
    name: asString(raw['name']) ?? code,
    state: normaliseState(typeof raw['network_region'] === 'string' ? raw['network_region'] : null),
    units,
  }
}

export function parseFacilitiesResponse(raw: unknown): Facility[] {
  if (!isRecord(raw)) {
    throw new FacilitiesParseError('Expected a facilities response object.')
  }
  if (!Array.isArray(raw['data'])) {
    throw new FacilitiesParseError('Facilities response is missing a "data" array.')
  }

  return raw['data']
    .map(parseFacility)
    .filter((facility): facility is Facility => facility !== null)
}
