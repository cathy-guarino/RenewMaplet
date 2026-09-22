import { describe, expect, it } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { FacilitiesParseError, parseFacilitiesResponse } from './parse-facilities'
import type { Facility } from './types'

const parsed = parseFacilitiesResponse(facilitiesResponse)
const byCode = (code: string): Facility => {
  const facility = parsed.find((f) => f.code === code)
  if (!facility) throw new Error(`fixture facility ${code} not parsed`)
  return facility
}
const unit = (code: string, unitCode: string) => byCode(code).units.find((u) => u.code === unitCode)

describe('envelope validation', () => {
  it('throws on anything that is not a response object with data', () => {
    expect(() => parseFacilitiesResponse(null)).toThrow(FacilitiesParseError)
    expect(() => parseFacilitiesResponse([])).toThrow(FacilitiesParseError)
    expect(() => parseFacilitiesResponse({ success: true })).toThrow(FacilitiesParseError)
  })

  it('accepts an empty dataset and skips malformed records rather than failing', () => {
    expect(parseFacilitiesResponse({ data: [] })).toEqual([])

    const result = parseFacilitiesResponse({
      data: [
        null,
        { name: 'No code' },
        { code: 'OK', units: [{ code: 'U1', fueltech_id: 'wind', capacity_registered: 1 }] },
      ],
    })
    expect(result.map((f) => f.code)).toEqual(['OK'])
  })
})

describe('battery deduplication', () => {
  it('keeps the canonical record only, so a battery is not triple-counted', () => {
    // ADP lists its battery as canonical + discharging + charging, all 7.76 MW.
    const batteries = byCode('ADP').units.filter((u) => u.technology === 'battery')
    expect(batteries.map((u) => u.code)).toEqual(['ADPBA1'])
    expect(batteries[0]?.capacityMw).toBe(7.76)
  })

  it('falls back to the discharging record when there is no canonical one', () => {
    expect(byCode('DISCHONLY').units.map((u) => u.code)).toEqual(['DOB1G'])
    expect(byCode('DISCHONLY').units[0]?.capacityMw).toBe(10)
  })

  it('never keeps a charging record, and drops a charging-only facility', () => {
    const chargingCodes = parsed
      .flatMap((f) => f.units.map((u) => u.code))
      .filter((c) => c.endsWith('L'))
    expect(chargingCodes).toEqual([])
    expect(parsed.find((f) => f.code === 'CHARGEONLY')).toBeUndefined()
    expect(parsed).toHaveLength(5)
  })
})

describe('normalisation', () => {
  it('maps NEM regions to states and WEM to WA', () => {
    expect(byCode('ADP').state).toBe('SA')
    expect(byCode('DISCHONLY').state).toBe('NSW')
    expect(byCode('MIXEDCOAL').state).toBe('VIC')
    expect(byCode('WESTWIND').state).toBe('WA') // WEM
    expect(byCode('ODDBALL').state).toBe('TAS')
  })

  it('folds fueltech families into display technologies, unmapped into "other"', () => {
    expect(byCode('MIXEDCOAL').units.map((u) => u.technology)).toEqual(['coal', 'coal'])
    expect(unit('ADP', 'ADPPV1')?.technology).toBe('solar')
    expect(byCode('WESTWIND').units[0]?.technology).toBe('wind')
    expect(unit('ODDBALL', 'HY1')?.technology).toBe('other') // hydro
    expect(unit('ODDBALL', 'UK1')?.technology).toBe('other') // unmapped
  })

  it('recognises statuses and falls back to "unknown"', () => {
    expect(byCode('WESTWIND').units[0]?.status).toBe('committed')
    expect(unit('MIXEDCOAL', 'MC1')?.status).toBe('retired')
    expect(unit('ODDBALL', 'UK1')?.status).toBe('unknown')
  })

  it('keeps an unreported capacity as null rather than zero', () => {
    expect(unit('MIXEDCOAL', 'MC2')?.capacityMw).toBeNull()
  })
})

describe('commencement dates', () => {
  it('keeps a full date, and reduces a year date to its year (ignoring UTC offset)', () => {
    expect(unit('ADP', 'ADPPV1')?.commencement).toEqual({
      precision: 'day',
      year: 2021,
      month: 5,
      day: 17,
    })
    // Raw 2022-12-31T14:00:00Z is 2023 in market time; the literal year is what
    // the source intended.
    expect(byCode('DISCHONLY').units[0]?.commencement).toEqual({ precision: 'year', year: 2022 })
  })

  it('reduces a month date to year and month, and keeps a missing date null', () => {
    expect(unit('MIXEDCOAL', 'MC2')?.commencement).toEqual({
      precision: 'month',
      year: 1985,
      month: 6,
    })
    expect(unit('ODDBALL', 'UK1')?.commencement).toBeNull()
  })
})
