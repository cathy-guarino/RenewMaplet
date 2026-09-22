/**
 * Counting, capacity totals and breakdowns over an already-scoped selection.
 * Pure and framework-free.
 *
 * Two rules shape everything here:
 *
 * - Missing capacity stays unknown. It is excluded from MW totals and never
 *   contributes a zero, so `registeredMw` is "the total of what we know",
 *   with `hasUnknownCapacity` flagging that the figure is partial.
 * - Facilities overlap groups but units do not. A facility with a wind unit and
 *   a battery unit is counted once in each technology group, so group facility
 *   counts sum to more than the scope total, while group MW sums to exactly it.
 */

import { TECHNOLOGY_LABELS, UNIT_STATUS_LABELS, type Unit } from '@/data/types'
import type { ScopedFacility } from './scope'

export type Breakdown = 'technology' | 'status' | 'state'

/** Which number the view leads with. Both are always calculated. */
export type Measure = 'facilities' | 'capacity'

export interface Totals {
  /** Distinct facilities. */
  readonly facilityCount: number
  /** Distinct matching units. */
  readonly unitCount: number
  /** Sum of matching units with a known capacity, in MW. */
  readonly registeredMw: number
  /** True when at least one matching unit reports no capacity. */
  readonly hasUnknownCapacity: boolean
}

export interface Group extends Totals {
  /** Stable identity for keys and selection. */
  readonly key: string
  readonly label: string
}

const UNKNOWN_KEY = 'unknown'

function sumCapacity(units: Iterable<Unit>): { registeredMw: number; hasUnknown: boolean } {
  let registeredMw = 0
  let hasUnknown = false

  for (const unit of units) {
    if (unit.capacityMw === null) {
      hasUnknown = true
      continue
    }
    registeredMw += unit.capacityMw
  }

  return { registeredMw, hasUnknown }
}

/**
 * The "All in scope" row: distinct facilities and units across the whole scope.
 *
 * `applyScope` already yields one entry per facility with a distinct unit list,
 * so deduplication is structural; the sets below make that explicit and keep the
 * total correct if a caller ever passes overlapping input.
 */
export function totalsForScope(scoped: readonly ScopedFacility[]): Totals {
  const facilityCodes = new Set<string>()
  const seenUnits = new Set<string>()
  const units: Unit[] = []

  for (const { facility, matchingUnits } of scoped) {
    facilityCodes.add(facility.code)
    for (const unit of matchingUnits) {
      const id = `${facility.code}:${unit.code}`
      if (seenUnits.has(id)) continue
      seenUnits.add(id)
      units.push(unit)
    }
  }

  const { registeredMw, hasUnknown } = sumCapacity(units)

  return {
    facilityCount: facilityCodes.size,
    unitCount: units.length,
    registeredMw,
    hasUnknownCapacity: hasUnknown,
  }
}

interface Bucket {
  label: string
  readonly facilityCodes: Set<string>
  readonly units: Unit[]
}

function bucketFor(
  unit: Unit,
  scoped: ScopedFacility,
  breakdown: Breakdown,
): { key: string; label: string } {
  switch (breakdown) {
    case 'technology':
      return { key: unit.technology, label: TECHNOLOGY_LABELS[unit.technology] }
    case 'status':
      return { key: unit.status, label: UNIT_STATUS_LABELS[unit.status] }
    case 'state': {
      const state = scoped.facility.state
      return state === null ? { key: UNKNOWN_KEY, label: 'Unknown' } : { key: state, label: state }
    }
  }
}

/**
 * Breaks a scope down by technology, unit status or state.
 *
 * Empty groups are omitted: the breakdown describes what is in scope, not the
 * full vocabulary. Groups are ordered by label so the columns stay stable as
 * data changes, with any "Unknown" bucket pinned last.
 */
export function groupScope(scoped: readonly ScopedFacility[], breakdown: Breakdown): Group[] {
  const buckets = new Map<string, Bucket>()

  for (const entry of scoped) {
    for (const unit of entry.matchingUnits) {
      const { key, label } = bucketFor(unit, entry, breakdown)

      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = { label, facilityCodes: new Set(), units: [] }
        buckets.set(key, bucket)
      }

      // A facility joins a group once however many of its units qualify; its
      // units all contribute to that group's capacity.
      bucket.facilityCodes.add(entry.facility.code)
      bucket.units.push(unit)
    }
  }

  const groups: Group[] = []
  for (const [key, bucket] of buckets) {
    const { registeredMw, hasUnknown } = sumCapacity(bucket.units)
    groups.push({
      key,
      label: bucket.label,
      facilityCount: bucket.facilityCodes.size,
      unitCount: bucket.units.length,
      registeredMw,
      hasUnknownCapacity: hasUnknown,
    })
  }

  return groups.sort((a, b) => {
    if (a.key === UNKNOWN_KEY) return 1
    if (b.key === UNKNOWN_KEY) return -1
    return a.label.localeCompare(b.label)
  })
}

/** The value a row leads with, for the selected measure. */
export function measureValue(totals: Totals, measure: Measure): number {
  return measure === 'facilities' ? totals.facilityCount : totals.registeredMw
}

/**
 * A group's bar length, as a fraction of the whole scope.
 *
 * The denominator is the "All in scope" row — the largest applicable figure,
 * since no group can hold more distinct facilities or more capacity than the
 * scope containing it. That keeps "All in scope" semantically distinct: it is
 * the reference the others are read against, and always renders full.
 *
 * Under an overlapping breakdown the group fractions therefore sum to more
 * than one, which is correct — each bar answers "how much of the scope is
 * this?", not "what slice of a pie is this?".
 */
export function relativeShare(value: number, scopeTotal: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(scopeTotal) || scopeTotal <= 0) return 0
  return Math.min(Math.max(value / scopeTotal, 0), 1)
}
