import { describe, expect, it } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { parseFacilitiesResponse } from '@/data/parse-facilities'
import { DEFAULT_SCOPE, applyScope, isScopeNarrowed, type Scope } from './scope'

const facilities = parseFacilitiesResponse(facilitiesResponse)
const scopeWith = (overrides: Partial<Scope>): Scope => ({ ...DEFAULT_SCOPE, ...overrides })
const codes = (scope: Scope) => applyScope(facilities, scope).map((s) => s.facility.code)

describe('default scope', () => {
  it('retains every facility and every unit', () => {
    const scoped = applyScope(facilities, DEFAULT_SCOPE)

    expect(scoped).toHaveLength(5)
    expect(scoped.every((s) => s.matchingUnits.length === s.facility.units.length)).toBe(true)
  })

  it('is not narrowed', () => {
    expect(isScopeNarrowed(DEFAULT_SCOPE)).toBe(false)
    expect(isScopeNarrowed(scopeWith({ states: ['NSW'] }))).toBe(true)
    expect(
      isScopeNarrowed(scopeWith({ commencement: { kind: 'range', fromYear: 2020, toYear: null } })),
    ).toBe(true)
  })
})

describe('state filtering', () => {
  it('filters at facility level', () => {
    expect(codes(scopeWith({ states: ['SA', 'WA'] }))).toEqual(['ADP', 'WESTWIND'])
  })

  it('returns nothing when no facility is in the selected states', () => {
    expect(codes(scopeWith({ states: ['QLD'] }))).toEqual([])
  })
})

describe('unit-level filtering', () => {
  it('retains a facility when at least one unit matches, and narrows its units', () => {
    const scoped = applyScope(facilities, scopeWith({ technologies: ['battery'] }))

    expect(scoped.map((s) => s.facility.code)).toEqual(['ADP', 'DISCHONLY'])
    // ADP also has a solar unit; only the battery unit is in scope.
    expect(scoped[0]?.matchingUnits.map((u) => u.code)).toEqual(['ADPBA1'])
  })

  it('narrows a multi-status facility to the matching unit only', () => {
    const scoped = applyScope(facilities, scopeWith({ statuses: ['retired'] }))

    expect(scoped).toHaveLength(1)
    expect(scoped[0]?.facility.code).toBe('MIXEDCOAL')
    expect(scoped[0]?.matchingUnits.map((u) => u.code)).toEqual(['MC1'])
  })

  it('combines unit filters conjunctively', () => {
    // MIXEDCOAL has a retired coal unit and an operating coal unit; asking for
    // retired gas matches neither.
    expect(codes(scopeWith({ technologies: ['gas'], statuses: ['retired'] }))).toEqual([])
  })

  it('returns an empty selection rather than throwing', () => {
    expect(applyScope([], DEFAULT_SCOPE)).toEqual([])
    expect(codes(scopeWith({ technologies: ['distillate'] }))).toEqual([])
  })
})

describe('commencement filtering', () => {
  it('matches on year regardless of the date precision', () => {
    // DISCHONLY is year-precision 2022, ADP day-precision 2021-05-17.
    expect(
      codes(scopeWith({ commencement: { kind: 'range', fromYear: 2021, toYear: 2022 } })),
    ).toEqual(['ADP', 'DISCHONLY'])
  })

  it('treats bounds as inclusive and null as open-ended', () => {
    expect(
      codes(scopeWith({ commencement: { kind: 'range', fromYear: 2026, toYear: null } })),
    ).toEqual(['WESTWIND'])
    expect(
      codes(scopeWith({ commencement: { kind: 'range', fromYear: null, toYear: 1970 } })),
    ).toEqual(['MIXEDCOAL'])
  })

  it('excludes units with an unknown commencement date', () => {
    const scoped = applyScope(
      facilities,
      scopeWith({ commencement: { kind: 'range', fromYear: null, toYear: null } }),
    )
    const oddball = scoped.find((s) => s.facility.code === 'ODDBALL')

    // UK1 has no date, so an active range cannot confirm it; HY1 (2001) stays.
    expect(oddball?.matchingUnits.map((u) => u.code)).toEqual(['HY1'])
  })
})
