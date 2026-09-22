/**
 * Scope filtering. Pure and framework-free.
 *
 * State belongs to a facility; technology, status and commencement belong to
 * units. So unit-level filters are applied to units, and a facility is retained
 * when at least one of its units survives (DATA_GUIDE.md, "Selection and
 * totals"). The surviving units — not the facility's full unit list — are what
 * every downstream total is computed from.
 */

import type { Commencement, Facility, StateCode, Technology, Unit, UnitStatus } from '@/data/types'

/**
 * Inclusive year bounds; `null` leaves that end open. Year granularity is
 * deliberate — a year is the one field every known commencement date has,
 * whatever its precision.
 */
export type CommencementFilter =
  | { readonly kind: 'any' }
  | { readonly kind: 'range'; readonly fromYear: number | null; readonly toYear: number | null }

export const ANY_COMMENCEMENT: CommencementFilter = { kind: 'any' }

/** An empty list means "all", which is the unnarrowed default for that filter. */
export interface Scope {
  readonly states: readonly StateCode[]
  readonly technologies: readonly Technology[]
  readonly statuses: readonly UnitStatus[]
  readonly commencement: CommencementFilter
}

export const DEFAULT_SCOPE: Scope = {
  states: [],
  technologies: [],
  statuses: [],
  commencement: ANY_COMMENCEMENT,
}

/** A facility retained by the scope, paired with only the units that matched. */
export interface ScopedFacility {
  readonly facility: Facility
  /** Never empty — a facility with no matching units is not in scope. */
  readonly matchingUnits: readonly Unit[]
}

export function commencementMatches(
  commencement: Commencement | null,
  filter: CommencementFilter,
): boolean {
  if (filter.kind === 'any') return true
  // An unknown date cannot be shown to fall inside a range, so it is excluded
  // rather than assumed.
  if (commencement === null) return false
  if (filter.fromYear !== null && commencement.year < filter.fromYear) return false
  if (filter.toYear !== null && commencement.year > filter.toYear) return false
  return true
}

function unitMatches(unit: Unit, scope: Scope): boolean {
  // Linear scans: these lists hold at most a handful of entries.
  if (scope.technologies.length > 0 && !scope.technologies.includes(unit.technology)) return false
  if (scope.statuses.length > 0 && !scope.statuses.includes(unit.status)) return false
  return commencementMatches(unit.commencement, scope.commencement)
}

function facilityMatches(facility: Facility, scope: Scope): boolean {
  if (scope.states.length === 0) return true
  return facility.state !== null && scope.states.includes(facility.state)
}

export function applyScope(facilities: readonly Facility[], scope: Scope): ScopedFacility[] {
  const scoped: ScopedFacility[] = []

  for (const facility of facilities) {
    if (!facilityMatches(facility, scope)) continue

    const matchingUnits = facility.units.filter((unit) => unitMatches(unit, scope))
    if (matchingUnits.length === 0) continue

    scoped.push({ facility, matchingUnits })
  }

  return scoped
}
