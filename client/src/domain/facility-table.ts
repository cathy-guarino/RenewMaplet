/**
 * Per-facility rows for the inline table shown when a grouped row is opened.
 * Pure and framework-free.
 *
 * A row is one facility, restricted to the units that put it in the selected
 * group (within the current scope). MW and Units aggregate those units.
 * Technology and Unit status list every distinct value across those units, in
 * canonical order — a facility that is solar and battery shows both. Under a
 * technology or status breakdown every matching unit shares that attribute, so
 * the list holds exactly the group; only a state breakdown can carry more than
 * one, and there the row shows the full mix rather than collapsing it.
 */

import {
  TECHNOLOGIES,
  UNIT_STATUSES,
  type StateCode,
  type Technology,
  type Unit,
  type UnitStatus,
} from '@/data/types'
import type { ScopedFacility } from './scope'
import type { Breakdown } from './summary'

export interface FacilityRow {
  readonly code: string
  readonly name: string
  readonly state: StateCode | null
  /** Distinct technologies across the matching units, in canonical order. */
  readonly technologies: readonly Technology[]
  /** Distinct unit statuses across the matching units, in canonical order. */
  readonly statuses: readonly UnitStatus[]
  /** Sum of matching units with known capacity, in MW. */
  readonly registeredMw: number
  readonly hasUnknownCapacity: boolean
  /** Number of matching units. */
  readonly unitCount: number
}

/** Stable key for the "All in scope" row, kept out of the state breakdown. */
const UNKNOWN_STATE = 'unknown'

function unitsInGroup(entry: ScopedFacility, breakdown: Breakdown, groupKey: string): Unit[] {
  switch (breakdown) {
    case 'technology':
      return entry.matchingUnits.filter((u) => u.technology === groupKey)
    case 'status':
      return entry.matchingUnits.filter((u) => u.status === groupKey)
    case 'state': {
      const key = entry.facility.state ?? UNKNOWN_STATE
      return key === groupKey ? [...entry.matchingUnits] : []
    }
  }
}

/** Distinct values a unit accessor takes across the units, in canonical order. */
function distinct<T extends string>(
  units: readonly Unit[],
  pick: (unit: Unit) => T,
  order: readonly T[],
): T[] {
  const present = new Set(units.map(pick))
  return order.filter((value) => present.has(value))
}

function buildRow(entry: ScopedFacility, units: readonly Unit[]): FacilityRow {
  let registeredMw = 0
  let hasUnknownCapacity = false
  for (const unit of units) {
    if (unit.capacityMw === null) hasUnknownCapacity = true
    else registeredMw += unit.capacityMw
  }

  return {
    code: entry.facility.code,
    name: entry.facility.name,
    state: entry.facility.state,
    technologies: distinct(units, (u) => u.technology, TECHNOLOGIES),
    statuses: distinct(units, (u) => u.status, UNIT_STATUSES),
    registeredMw,
    hasUnknownCapacity,
    unitCount: units.length,
  }
}

export function groupFacilities(
  scoped: readonly ScopedFacility[],
  breakdown: Breakdown,
  groupKey: string,
): FacilityRow[] {
  const rows: FacilityRow[] = []
  for (const entry of scoped) {
    const units = unitsInGroup(entry, breakdown, groupKey)
    if (units.length > 0) rows.push(buildRow(entry, units))
  }
  return rows
}

/**
 * Every scoped facility, one row each, over all its matching units — the table
 * behind the "All in scope" row. Multi-technology facilities show all their
 * technologies, as everywhere else.
 */
export function scopeFacilities(scoped: readonly ScopedFacility[]): FacilityRow[] {
  // `matchingUnits` is never empty (applyScope drops facilities with no match).
  return scoped.map((entry) => buildRow(entry, entry.matchingUnits))
}

export type SortField = 'technology' | 'facility' | 'status' | 'mw' | 'units'
export type SortDirection = 'asc' | 'desc'
export interface FacilitySort {
  readonly field: SortField
  readonly direction: SortDirection
}

/** Opening a group sorts by facility name, matching reference/05. */
export const DEFAULT_FACILITY_SORT: FacilitySort = { field: 'facility', direction: 'asc' }

// Multi-value columns sort by their leading (canonical-first) value.
const lead = <T extends string>(values: readonly T[], order: readonly T[]) =>
  values.length === 0 ? order.length : order.indexOf(values[0]!)

const COMPARATORS: Record<SortField, (a: FacilityRow, b: FacilityRow) => number> = {
  facility: (a, b) => a.name.localeCompare(b.name),
  technology: (a, b) => lead(a.technologies, TECHNOLOGIES) - lead(b.technologies, TECHNOLOGIES),
  status: (a, b) => lead(a.statuses, UNIT_STATUSES) - lead(b.statuses, UNIT_STATUSES),
  mw: (a, b) => a.registeredMw - b.registeredMw,
  units: (a, b) => a.unitCount - b.unitCount,
}

export function sortFacilityRows(rows: readonly FacilityRow[], sort: FacilitySort): FacilityRow[] {
  const compare = COMPARATORS[sort.field]
  const direction = sort.direction === 'asc' ? 1 : -1
  // Name ascending is the stable tie-breaker, so equal rows keep a fixed order
  // as the direction flips.
  return [...rows].sort((a, b) => {
    const primary = compare(a, b)
    return primary !== 0 ? primary * direction : a.name.localeCompare(b.name)
  })
}

/** Next sort when a header is clicked: flip if active, else ascending. */
export function toggleSort(current: FacilitySort, field: SortField): FacilitySort {
  if (current.field !== field) return { field, direction: 'asc' }
  return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}
