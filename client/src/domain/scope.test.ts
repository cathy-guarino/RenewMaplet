import { describe, expect, it } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { parseFacilitiesResponse } from '@/data/parse-facilities'
import { DEFAULT_SCOPE, applyScope, type Scope } from './scope'

const facilities = parseFacilitiesResponse(facilitiesResponse)
const scopeWith = (o: Partial<Scope>): Scope => ({ ...DEFAULT_SCOPE, ...o })
const codes = (scope: Scope) => applyScope(facilities, scope).map((s) => s.facility.code)

it('the default scope retains every facility and every unit', () => {
  const scoped = applyScope(facilities, DEFAULT_SCOPE)
  expect(scoped).toHaveLength(5)
  expect(scoped.every((s) => s.matchingUnits.length === s.facility.units.length)).toBe(true)
})

it('filters state at the facility level', () => {
  expect(codes(scopeWith({ states: ['SA', 'WA'] }))).toEqual(['ADP', 'WESTWIND'])
  expect(codes(scopeWith({ states: ['QLD'] }))).toEqual([]) // no facility there
})

describe('unit-level filtering', () => {
  it('retains a facility when a unit matches, and narrows it to that unit', () => {
    const scoped = applyScope(facilities, scopeWith({ technologies: ['battery'] }))
    expect(scoped.map((s) => s.facility.code)).toEqual(['ADP', 'DISCHONLY'])
    // ADP also has a solar unit; only its battery unit is in scope.
    expect(scoped[0]?.matchingUnits.map((u) => u.code)).toEqual(['ADPBA1'])
  })

  it('combines unit filters conjunctively', () => {
    // MIXEDCOAL has a retired coal unit and an operating coal unit; retired gas
    // matches neither.
    expect(codes(scopeWith({ technologies: ['gas'], statuses: ['retired'] }))).toEqual([])
  })
})

describe('commencement filtering', () => {
  it('matches on year across date precisions and excludes unknown dates', () => {
    // DISCHONLY is year-precision 2022, ADP day-precision 2021-05-17.
    expect(
      codes(scopeWith({ commencement: { kind: 'range', fromYear: 2021, toYear: 2022 } })),
    ).toEqual(['ADP', 'DISCHONLY'])
    // ODDBALL's UK1 has no date, so an active range cannot confirm it; HY1 (2001) stays.
    const openEnded = applyScope(
      facilities,
      scopeWith({ commencement: { kind: 'range', fromYear: null, toYear: null } }),
    )
    expect(
      openEnded.find((s) => s.facility.code === 'ODDBALL')?.matchingUnits.map((u) => u.code),
    ).toEqual(['HY1'])
  })

  it('treats bounds as inclusive and null as open-ended', () => {
    expect(
      codes(scopeWith({ commencement: { kind: 'range', fromYear: 2026, toYear: null } })),
    ).toEqual(['WESTWIND'])
    expect(
      codes(scopeWith({ commencement: { kind: 'range', fromYear: null, toYear: 1970 } })),
    ).toEqual(['MIXEDCOAL'])
  })
})
