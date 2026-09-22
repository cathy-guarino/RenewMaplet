import { describe, expect, it } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { parseFacilitiesResponse } from '@/data/parse-facilities'
import { DEFAULT_SCOPE, applyScope, type Scope } from './scope'
import { groupScope, measureValue, relativeShare, totalsForScope, type Breakdown } from './summary'

/**
 * Aggregation rules from DATA_GUIDE.md: distinct counts, capacity totals that
 * exclude unknowns, overlapping groups, and shares read against the whole scope.
 *
 * Kept units after parsing:
 *   ADP (SA)        ADPPV1 solar 24.75 operating | ADPBA1 battery 7.76 operating
 *   DISCHONLY (NSW) DOB1G battery 10 operating
 *   MIXEDCOAL (VIC) MC1 coal 500 retired | MC2 coal null operating
 *   WESTWIND (WA)   WW1 wind 100 committed
 *   ODDBALL (TAS)   UK1 other 1.5 unknown | HY1 other 50 operating
 */
const facilities = parseFacilitiesResponse(facilitiesResponse)
const scopeWith = (o: Partial<Scope> = {}): Scope => ({ ...DEFAULT_SCOPE, ...o })
const scopedBy = (o: Partial<Scope> = {}) => applyScope(facilities, scopeWith(o))
const groupsBy = (breakdown: Breakdown, o: Partial<Scope> = {}) =>
  groupScope(scopedBy(o), breakdown)
const TOTAL_MW = 24.75 + 7.76 + 10 + 500 + 100 + 1.5 + 50

describe('all in scope', () => {
  it('counts distinct facilities and units', () => {
    const totals = totalsForScope(scopedBy())
    expect(totals.facilityCount).toBe(5)
    expect(totals.unitCount).toBe(8) // 8 units survive; MC2 is one but has no capacity
  })

  it('totals only known capacity and flags that some is unknown', () => {
    const totals = totalsForScope(scopedBy())
    expect(totals.registeredMw).toBeCloseTo(TOTAL_MW, 6)
    expect(totals.hasUnknownCapacity).toBe(true)
  })
})

describe('grouping', () => {
  it('orders technology groups by label, with no empty groups', () => {
    expect(groupsBy('technology').map((g) => g.label)).toEqual([
      'Battery',
      'Coal',
      'Onshore wind',
      'Other',
      'Utility solar',
    ])
  })

  it('sums deduplicated battery capacity across facilities', () => {
    const battery = groupsBy('technology').find((g) => g.key === 'battery')
    expect(battery?.registeredMw).toBeCloseTo(17.76, 6) // 7.76 (ADP) + 10 (DISCHONLY)
    expect(battery?.facilityCount).toBe(2)
  })

  it('excludes missing capacity from a total instead of adding zero', () => {
    const coal = groupsBy('technology').find((g) => g.key === 'coal')
    expect(coal?.registeredMw).toBe(500) // MC1 500 known, MC2 unknown
    expect(coal?.hasUnknownCapacity).toBe(true)
  })

  it('answers "upcoming committed capacity" for a state scope (Bob)', () => {
    const groups = groupsBy('status', {
      states: ['WA'],
      technologies: ['wind', 'solar', 'battery'],
      statuses: ['committed'],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0]?.registeredMw).toBe(100)
  })

  it('produces no groups when nothing is in scope', () => {
    expect(groupsBy('technology', { states: ['QLD'] })).toEqual([])
  })
})

describe('overlapping groups', () => {
  it('counts a facility once in each technology group its units reach', () => {
    const groups = groupsBy('technology')
    // ADP is both battery and solar.
    expect(groups.find((g) => g.key === 'battery')?.facilityCount).toBe(2)
    expect(groups.find((g) => g.key === 'solar')?.facilityCount).toBe(1)
  })

  it('sums group counts above the distinct total, but capacity exactly to it', () => {
    const scoped = scopedBy()
    const groups = groupScope(scoped, 'technology')
    const totals = totalsForScope(scoped)

    const summedFacilities = groups.reduce((n, g) => n + g.facilityCount, 0)
    const summedMw = groups.reduce((mw, g) => mw + g.registeredMw, 0)
    expect(summedFacilities).toBeGreaterThan(totals.facilityCount) // overlap
    expect(summedMw).toBeCloseTo(totals.registeredMw, 6) // units belong to one group
  })

  it('does not overlap by state, because state belongs to the facility', () => {
    const groups = groupsBy('state')
    expect(groups.map((g) => g.label)).toEqual(['NSW', 'SA', 'TAS', 'VIC', 'WA'])
    expect(groups.reduce((n, g) => n + g.facilityCount, 0)).toBe(5)
  })
})

describe('measure and relative share', () => {
  const scoped = scopedBy()
  const totals = totalsForScope(scoped)

  it('reads the leading value for each measure', () => {
    expect(measureValue(totals, 'facilities')).toBe(5)
    expect(measureValue(totals, 'capacity')).toBeCloseTo(TOTAL_MW, 6)
  })

  it('scales a group against the whole scope, and guards divide-by-zero', () => {
    const coal = groupScope(scoped, 'technology').find((g) => g.key === 'coal')!
    // Coal holds the most MW but only 1 of 5 facilities, so by facilities its
    // bar is short — the behaviour in reference/01-default.png.
    expect(relativeShare(measureValue(coal, 'facilities'), totals.facilityCount)).toBeCloseTo(
      0.2,
      6,
    )
    expect(relativeShare(measureValue(coal, 'capacity'), totals.registeredMw)).toBeCloseTo(
      500 / TOTAL_MW,
      6,
    )
    expect(relativeShare(5, 0)).toBe(0)
  })
})
