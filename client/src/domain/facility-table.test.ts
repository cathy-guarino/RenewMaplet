import { describe, expect, it } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { parseFacilitiesResponse } from '@/data/parse-facilities'
import { DEFAULT_SCOPE, applyScope, type Scope } from './scope'
import {
  DEFAULT_FACILITY_SORT,
  groupFacilities,
  sortFacilityRows,
  toggleSort,
  type FacilitySort,
} from './facility-table'

const facilities = parseFacilitiesResponse(facilitiesResponse)
const scopeWith = (o: Partial<Scope> = {}): Scope => ({ ...DEFAULT_SCOPE, ...o })
const scoped = (o: Partial<Scope> = {}) => applyScope(facilities, scopeWith(o))
const byCode = <T extends { code: string }>(rows: readonly T[], code: string) =>
  rows.find((r) => r.code === code)

describe('groupFacilities', () => {
  it('reflects the selected technology group, one row per facility', () => {
    const rows = groupFacilities(scoped(), 'technology', 'battery')

    // ADP (canonical battery) and DISCHONLY (discharging fallback) both qualify.
    expect(rows.map((r) => r.code).sort()).toEqual(['ADP', 'DISCHONLY'])
    const adp = byCode(rows, 'ADP')!
    expect(adp.technologies).toEqual(['battery'])
    expect(adp.registeredMw).toBe(7.76)
    expect(adp.unitCount).toBe(1)
    expect(adp.state).toBe('SA')
  })

  it('lists every distinct technology and status under a state breakdown', () => {
    // ADP (SA) is solar 24.75 + battery 7.76, both operating — the row must
    // show both technologies rather than only the dominant one.
    const rows = groupFacilities(scoped(), 'state', 'SA')
    const adp = byCode(rows, 'ADP')!

    expect(adp.technologies).toEqual(['battery', 'solar']) // canonical order
    expect(adp.statuses).toEqual(['operating'])
    expect(adp.unitCount).toBe(2)
    expect(adp.registeredMw).toBeCloseTo(32.51, 6)
  })

  it('restricts a facility to its units in the group', () => {
    // ADP also has a solar unit, but the battery group row counts only battery.
    const solar = groupFacilities(scoped(), 'technology', 'solar')
    expect(byCode(solar, 'ADP')?.registeredMw).toBe(24.75)
    expect(byCode(solar, 'ADP')?.unitCount).toBe(1)
  })

  it('aggregates units per facility under a state breakdown', () => {
    // ODDBALL (TAS) has two "other" units: 1.5 (unknown status) and 50 (operating).
    const rows = groupFacilities(scoped(), 'state', 'TAS')
    const oddball = byCode(rows, 'ODDBALL')!

    expect(oddball.unitCount).toBe(2)
    expect(oddball.registeredMw).toBe(51.5)
    // Both statuses are shown, in canonical order; technology is the single 'other'.
    expect(oddball.statuses).toEqual(['operating', 'unknown'])
    expect(oddball.technologies).toEqual(['other'])
  })

  it('excludes missing capacity from the MW total and flags it', () => {
    // MIXEDCOAL retired unit MC1 is 500; its operating unit has no capacity and
    // a different status, so the retired group sees only MC1.
    const retired = groupFacilities(scoped(), 'status', 'retired')
    const mixed = byCode(retired, 'MIXEDCOAL')!
    expect(mixed.registeredMw).toBe(500)
    expect(mixed.hasUnknownCapacity).toBe(false)

    const operating = groupFacilities(scoped(), 'status', 'operating')
    const mixedOperating = byCode(operating, 'MIXEDCOAL')!
    expect(mixedOperating.registeredMw).toBe(0)
    expect(mixedOperating.hasUnknownCapacity).toBe(true)
  })

  it('returns nothing for a group no facility belongs to', () => {
    expect(groupFacilities(scoped({ states: ['NSW'] }), 'technology', 'coal')).toEqual([])
  })
})

describe('sortFacilityRows', () => {
  const rows = groupFacilities(scoped(), 'state', 'TAS').concat(
    groupFacilities(scoped(), 'technology', 'battery'),
  )

  it('sorts by facility name, both directions', () => {
    const asc = sortFacilityRows(rows, { field: 'facility', direction: 'asc' }).map((r) => r.name)
    const desc = sortFacilityRows(rows, { field: 'facility', direction: 'desc' }).map((r) => r.name)
    expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)))
    expect(desc).toEqual([...asc].reverse())
  })

  it('sorts by MW numerically', () => {
    const mws = groupFacilities(scoped(), 'technology', 'battery')
    const desc = sortFacilityRows(mws, { field: 'mw', direction: 'desc' })
    expect(desc.map((r) => r.registeredMw)).toEqual([10, 7.76])
  })

  it('is a stable, non-mutating operation', () => {
    const input = groupFacilities(scoped(), 'technology', 'battery')
    const snapshot = input.map((r) => r.code)
    sortFacilityRows(input, { field: 'mw', direction: 'asc' })
    expect(input.map((r) => r.code)).toEqual(snapshot)
  })
})

describe('toggleSort', () => {
  it('starts a new column ascending', () => {
    expect(toggleSort(DEFAULT_FACILITY_SORT, 'mw')).toEqual({ field: 'mw', direction: 'asc' })
  })

  it('flips direction on the active column, only between asc and desc', () => {
    const asc: FacilitySort = { field: 'mw', direction: 'asc' }
    const desc = toggleSort(asc, 'mw')
    expect(desc).toEqual({ field: 'mw', direction: 'desc' })
    expect(toggleSort(desc, 'mw')).toEqual({ field: 'mw', direction: 'asc' })
  })
})
