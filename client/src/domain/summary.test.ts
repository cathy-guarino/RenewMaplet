import { describe, expect, it } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { parseFacilitiesResponse } from '@/data/parse-facilities'
import { DEFAULT_SCOPE, applyScope, type Scope } from './scope'
import { groupScope, measureValue, relativeShare, totalsForScope, type Breakdown } from './summary'

const facilities = parseFacilitiesResponse(facilitiesResponse)
const scopeWith = (overrides: Partial<Scope>): Scope => ({ ...DEFAULT_SCOPE, ...overrides })
const scopedBy = (overrides: Partial<Scope> = {}) => applyScope(facilities, scopeWith(overrides))
const groupsBy = (breakdown: Breakdown, overrides: Partial<Scope> = {}) =>
  groupScope(scopedBy(overrides), breakdown)

/**
 * Kept units after parsing:
 *   ADP (SA)        ADPPV1 solar 24.75 operating | ADPBA1 battery 7.76 operating
 *   DISCHONLY (NSW) DOB1G battery 10 operating
 *   MIXEDCOAL (VIC) MC1 coal 500 retired | MC2 coal null operating
 *   WESTWIND (WA)   WW1 wind 100 committed
 *   ODDBALL (TAS)   UK1 other 1.5 unknown | HY1 other 50 operating
 */
const TOTAL_MW = 24.75 + 7.76 + 10 + 500 + 100 + 1.5 + 50

describe('all in scope', () => {
  it('counts distinct facilities and units', () => {
    const totals = totalsForScope(scopedBy())

    expect(totals.facilityCount).toBe(5)
    // 8 units survive parsing; MC2 is one of them but has no capacity.
    expect(totals.unitCount).toBe(8)
  })

  it('totals only known capacity and flags that some is unknown', () => {
    const totals = totalsForScope(scopedBy())

    expect(totals.registeredMw).toBeCloseTo(TOTAL_MW, 6)
    expect(totals.hasUnknownCapacity).toBe(true)
  })

  it('reports zeroes for an empty scope', () => {
    expect(totalsForScope([])).toEqual({
      facilityCount: 0,
      unitCount: 0,
      registeredMw: 0,
      hasUnknownCapacity: false,
    })
  })
})

describe('grouping by technology', () => {
  const groups = groupsBy('technology')

  it('orders groups by label with no empty groups', () => {
    expect(groups.map((g) => g.label)).toEqual([
      'Battery',
      'Coal',
      'Onshore wind',
      'Other',
      'Utility solar',
    ])
  })

  it('sums deduplicated battery capacity across facilities', () => {
    const battery = groups.find((g) => g.key === 'battery')

    expect(battery?.registeredMw).toBeCloseTo(17.76, 6)
    expect(battery?.facilityCount).toBe(2)
  })

  it('excludes missing capacity from a total instead of adding zero', () => {
    const coal = groups.find((g) => g.key === 'coal')

    expect(coal?.registeredMw).toBe(500)
    expect(coal?.unitCount).toBe(2)
    expect(coal?.hasUnknownCapacity).toBe(true)
  })

  it('folds hydro and unmapped fueltechs into "other"', () => {
    const other = groups.find((g) => g.key === 'other')

    expect(other?.registeredMw).toBeCloseTo(51.5, 6)
    expect(other?.facilityCount).toBe(1)
  })
})

describe('overlapping groups', () => {
  it('counts a facility once in each technology group its units reach', () => {
    const groups = groupsBy('technology')
    const inBattery = groups.find((g) => g.key === 'battery')?.facilityCount ?? 0
    const inSolar = groups.find((g) => g.key === 'solar')?.facilityCount ?? 0

    // ADP appears in both.
    expect(inBattery).toBe(2)
    expect(inSolar).toBe(1)
  })

  it('counts a facility in two status groups when its units differ', () => {
    const groups = groupsBy('status')
    const retired = groups.find((g) => g.key === 'retired')
    const operating = groups.find((g) => g.key === 'operating')

    // MIXEDCOAL is retired and operating at once.
    expect(retired?.facilityCount).toBe(1)
    expect(operating?.facilityCount).toBe(4)
  })

  it('sums group facility counts above the distinct total, but MW exactly to it', () => {
    const scoped = scopedBy()
    const groups = groupScope(scoped, 'technology')
    const totals = totalsForScope(scoped)

    const summedFacilities = groups.reduce((n, g) => n + g.facilityCount, 0)
    const summedMw = groups.reduce((mw, g) => mw + g.registeredMw, 0)

    expect(summedFacilities).toBe(6)
    expect(summedFacilities).toBeGreaterThan(totals.facilityCount)
    // Units belong to exactly one group, so capacity partitions exactly.
    expect(summedMw).toBeCloseTo(totals.registeredMw, 6)
  })
})

describe('grouping by state', () => {
  const groups = groupsBy('state')

  it('does not overlap, because state belongs to the facility', () => {
    const summedFacilities = groups.reduce((n, g) => n + g.facilityCount, 0)

    expect(groups.map((g) => g.label)).toEqual(['NSW', 'SA', 'TAS', 'VIC', 'WA'])
    expect(summedFacilities).toBe(5)
  })

  it('normalises WEM into WA', () => {
    expect(groups.find((g) => g.key === 'WA')?.registeredMw).toBe(100)
  })
})

describe('grouping by status', () => {
  it('pins the unknown bucket last', () => {
    expect(groupsBy('status').map((g) => g.label)).toEqual([
      'Committed',
      'Operating',
      'Retired',
      'Unknown',
    ])
  })

  it('answers "upcoming committed capacity" for a state scope', () => {
    // Bob: committed wind, solar and battery in WA.
    const groups = groupsBy('status', {
      states: ['WA'],
      technologies: ['wind', 'solar', 'battery'],
      statuses: ['committed'],
    })

    expect(groups).toHaveLength(1)
    expect(groups[0]?.registeredMw).toBe(100)
  })
})

describe('empty results', () => {
  it('produces no groups when nothing is in scope', () => {
    expect(groupsBy('technology', { states: ['QLD'] })).toEqual([])
  })
})

describe('measure and relative share', () => {
  const scoped = scopedBy()
  const totals = totalsForScope(scoped)

  it('reads the leading value for each measure', () => {
    expect(measureValue(totals, 'facilities')).toBe(5)
    expect(measureValue(totals, 'capacity')).toBeCloseTo(TOTAL_MW, 6)
  })

  it('scales a group against the whole scope, not the largest group', () => {
    const groups = groupScope(scoped, 'technology')
    const coal = groups.find((g) => g.key === 'coal')

    // Coal holds the most MW but only one of five facilities, so by the
    // facilities measure its bar is short — the behaviour visible in
    // reference/01-default.png.
    expect(relativeShare(measureValue(coal!, 'facilities'), totals.facilityCount)).toBeCloseTo(
      1 / 5,
      6,
    )
    expect(relativeShare(measureValue(coal!, 'capacity'), totals.registeredMw)).toBeCloseTo(
      500 / TOTAL_MW,
      6,
    )
  })

  it('never exceeds one, because no group is larger than its scope', () => {
    for (const group of groupScope(scoped, 'technology')) {
      expect(
        relativeShare(measureValue(group, 'facilities'), totals.facilityCount),
      ).toBeLessThanOrEqual(1)
    }
  })

  it('returns zero rather than dividing by zero on an empty scope', () => {
    expect(relativeShare(0, 0)).toBe(0)
    expect(relativeShare(5, 0)).toBe(0)
  })

  it('sums group shares above one for overlapping breakdowns, exactly one for state', () => {
    const byTechnology = groupScope(scoped, 'technology').reduce(
      (sum, g) => sum + relativeShare(measureValue(g, 'facilities'), totals.facilityCount),
      0,
    )
    const byState = groupScope(scoped, 'state').reduce(
      (sum, g) => sum + relativeShare(measureValue(g, 'facilities'), totals.facilityCount),
      0,
    )

    expect(byTechnology).toBeGreaterThan(1)
    expect(byState).toBeCloseTo(1, 6)
  })
})
