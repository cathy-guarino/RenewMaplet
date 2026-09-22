import { describe, expect, it } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { parseFacilitiesResponse } from '@/data/parse-facilities'
import { DEFAULT_SCOPE, applyScope, type Scope } from './scope'
import {
  DEFAULT_FACILITY_SORT,
  groupFacilities,
  sortFacilityRows,
  toggleSort,
} from './facility-table'

const facilities = parseFacilitiesResponse(facilitiesResponse)
const scoped = (o: Partial<Scope> = {}) => applyScope(facilities, { ...DEFAULT_SCOPE, ...o })
const byCode = <T extends { code: string }>(rows: readonly T[], code: string) =>
  rows.find((r) => r.code === code)

describe('groupFacilities', () => {
  it('builds one row per facility, restricted to its units in the group', () => {
    // ADP has both battery and solar units; each group row counts only its own.
    const battery = groupFacilities(scoped(), 'technology', 'battery')
    expect(battery.map((r) => r.code).sort()).toEqual(['ADP', 'DISCHONLY'])
    expect(byCode(battery, 'ADP')).toMatchObject({
      technologies: ['battery'],
      registeredMw: 7.76,
      unitCount: 1,
    })

    const solar = groupFacilities(scoped(), 'technology', 'solar')
    expect(byCode(solar, 'ADP')).toMatchObject({ registeredMw: 24.75, unitCount: 1 })
  })

  it('lists distinct technologies but one status per unit under a state breakdown', () => {
    const sa = groupFacilities(scoped(), 'state', 'SA')
    // ADP is solar + battery, both units operating — two units, two status icons.
    expect(byCode(sa, 'ADP')).toMatchObject({
      technologies: ['battery', 'solar'], // distinct, canonical order
      unitStatuses: ['operating', 'operating'], // one per unit
      unitCount: 2,
    })

    const tas = groupFacilities(scoped(), 'state', 'TAS')
    // ODDBALL has two "other" units with different statuses; both are listed.
    expect(byCode(tas, 'ODDBALL')).toMatchObject({
      technologies: ['other'],
      unitStatuses: ['operating', 'unknown'], // canonical order
      registeredMw: 51.5,
    })
  })

  it('excludes missing capacity from the MW total and flags it', () => {
    // MIXEDCOAL: retired unit MC1 is 500; its operating unit has no capacity.
    expect(byCode(groupFacilities(scoped(), 'status', 'retired'), 'MIXEDCOAL')).toMatchObject({
      registeredMw: 500,
      hasUnknownCapacity: false,
    })
    expect(byCode(groupFacilities(scoped(), 'status', 'operating'), 'MIXEDCOAL')).toMatchObject({
      registeredMw: 0,
      hasUnknownCapacity: true,
    })
  })

  it('returns nothing for a group no facility belongs to', () => {
    expect(groupFacilities(scoped({ states: ['NSW'] }), 'technology', 'coal')).toEqual([])
  })
})

describe('sortFacilityRows', () => {
  const battery = () => groupFacilities(scoped(), 'technology', 'battery')

  it('sorts by facility name in both directions', () => {
    const asc = sortFacilityRows(battery(), { field: 'facility', direction: 'asc' }).map(
      (r) => r.name,
    )
    const desc = sortFacilityRows(battery(), { field: 'facility', direction: 'desc' }).map(
      (r) => r.name,
    )
    expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)))
    expect(desc).toEqual([...asc].reverse())
  })

  it('sorts by MW numerically without mutating the input', () => {
    const input = battery()
    const snapshot = input.map((r) => r.code)
    const desc = sortFacilityRows(input, { field: 'mw', direction: 'desc' })
    expect(desc.map((r) => r.registeredMw)).toEqual([10, 7.76])
    expect(input.map((r) => r.code)).toEqual(snapshot)
  })
})

describe('toggleSort', () => {
  it('starts a new column ascending and flips the active column', () => {
    const asc = toggleSort(DEFAULT_FACILITY_SORT, 'mw')
    expect(asc).toEqual({ field: 'mw', direction: 'asc' })
    expect(toggleSort(asc, 'mw')).toEqual({ field: 'mw', direction: 'desc' })
  })
})
