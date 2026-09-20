/**
 * Boundary normalisation: raw OpenElectricity vocabulary in, application
 * vocabulary out. Every function here is total — unrecognised input falls back
 * rather than throwing, so one odd record cannot lose the whole response.
 */

import {
  STATES,
  type Commencement,
  type StateCode,
  type Technology,
  type UnitStatus,
} from './types'

const REGION_TO_STATE: Record<string, StateCode> = {
  NSW1: 'NSW',
  QLD1: 'QLD',
  SA1: 'SA',
  TAS1: 'TAS',
  VIC1: 'VIC',
  // The WEM is a whole network rather than a NEM region, and covers WA.
  WEM: 'WA',
}

/** `NSW1` → `NSW`, `WEM` → `WA`. Returns `null` for anything unrecognised. */
export function normaliseState(region: string | null | undefined): StateCode | null {
  if (typeof region !== 'string') return null
  const raw = region.trim().toUpperCase()
  if (raw === '') return null

  const mapped = REGION_TO_STATE[raw]
  if (mapped) return mapped

  // Tolerate an already-bare state code, or an unseen region suffix (`NSW2`).
  const bare = raw.replace(/\d+$/, '')
  return (STATES as readonly string[]).includes(bare) ? (bare as StateCode) : null
}

const FUELTECH_TO_TECHNOLOGY: Record<string, Technology> = {
  battery: 'battery',
  battery_charging: 'battery',
  battery_discharging: 'battery',
  coal_black: 'coal',
  coal_brown: 'coal',
  distillate: 'distillate',
  gas_ccgt: 'gas',
  gas_ocgt: 'gas',
  gas_recip: 'gas',
  gas_steam: 'gas',
  gas_wcmg: 'gas',
  wind: 'wind',
  solar_utility: 'solar',
  hydro: 'other',
  bioenergy_biogas: 'other',
  bioenergy_biomass: 'other',
  pumps: 'other',
}

/**
 * Prefix fallbacks are deliberately limited to the families whose members all
 * share one technology. `wind_` and `solar_` are excluded: the labels are
 * "Onshore wind" and "Utility solar", so an unseen `wind_offshore` or
 * `solar_rooftop` must not silently inherit the wrong name — it lands in
 * "Other" until given its own technology.
 */
const TECHNOLOGY_PREFIXES: ReadonlyArray<readonly [string, Technology]> = [
  ['battery_', 'battery'],
  ['coal_', 'coal'],
  ['gas_', 'gas'],
]

export function normaliseTechnology(fueltechId: string | null | undefined): Technology {
  if (typeof fueltechId !== 'string') return 'other'
  const raw = fueltechId.trim().toLowerCase()

  const mapped = FUELTECH_TO_TECHNOLOGY[raw]
  if (mapped) return mapped

  for (const [prefix, technology] of TECHNOLOGY_PREFIXES) {
    if (raw.startsWith(prefix)) return technology
  }
  return 'other'
}

const STATUS_IDS: Record<string, UnitStatus> = {
  committed: 'committed',
  commissioning: 'commissioning',
  operating: 'operating',
  retired: 'retired',
}

export function normaliseStatus(statusId: string | null | undefined): UnitStatus {
  if (typeof statusId !== 'string') return 'unknown'
  return STATUS_IDS[statusId.trim().toLowerCase()] ?? 'unknown'
}

/**
 * How a battery record relates to the physical asset. The feed lists one
 * battery up to three times — a canonical bidirectional record plus separate
 * generator/load records — so these roles drive deduplication.
 */
export type BatteryRole = 'canonical' | 'discharging' | 'charging'

export function batteryRole(fueltechId: string | null | undefined): BatteryRole | null {
  if (typeof fueltechId !== 'string') return null
  switch (fueltechId.trim().toLowerCase()) {
    case 'battery':
      return 'canonical'
    case 'battery_discharging':
      return 'discharging'
    case 'battery_charging':
      return 'charging'
    default:
      return null
  }
}

/** Registered capacity in MW, or `null` when unreported. `0` is a real value. */
export function normaliseCapacity(capacity: unknown): number | null {
  return typeof capacity === 'number' && Number.isFinite(capacity) ? capacity : null
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * Reads the calendar fields literally from the timestamp and ignores its UTC
 * offset.
 *
 * This looks wrong but is deliberate. The feed's offsets are not trustworthy —
 * WEM rows arrive tagged `+10:00`, NEM rows tagged `Z` — while the literal date
 * portion is consistently the *last day of the intended period*: a year-precision
 * value reads `2021-12-31T14:00:00Z` and means 2021. Converting that instant to
 * any timezone rolls it into 2022. Taking the written date and discarding the
 * fields the specificity does not support reproduces the source's intent.
 */
export function normaliseCommencement(
  commencementDate: string | null | undefined,
  specificity: string | null | undefined,
): Commencement | null {
  if (typeof commencementDate !== 'string') return null

  const match = ISO_DATE.exec(commencementDate.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null

  // A date with no stated specificity is a full date in practice: in the live
  // feed a null specificity always accompanies a null date.
  switch (typeof specificity === 'string' ? specificity.trim().toLowerCase() : 'day') {
    case 'year':
      return { precision: 'year', year }
    case 'month':
      return { precision: 'month', year, month }
    default:
      return { precision: 'day', year, month, day }
  }
}
