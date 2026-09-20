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

describe('envelope validation', () => {
  it('throws when the payload is not a response object', () => {
    expect(() => parseFacilitiesResponse(null)).toThrow(FacilitiesParseError)
    expect(() => parseFacilitiesResponse([])).toThrow(FacilitiesParseError)
  })

  it('throws when "data" is missing', () => {
    expect(() => parseFacilitiesResponse({ success: true })).toThrow(FacilitiesParseError)
  })

  it('accepts an empty dataset', () => {
    expect(parseFacilitiesResponse({ data: [] })).toEqual([])
  })

  it('skips malformed records rather than losing the response', () => {
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

describe('battery records', () => {
  it('keeps only the canonical record when one exists', () => {
    const adp = byCode('ADP')
    const batteries = adp.units.filter((u) => u.technology === 'battery')

    expect(batteries.map((u) => u.code)).toEqual(['ADPBA1'])
  })

  it('does not triple-count a battery listed three times', () => {
    const adp = byCode('ADP')
    const batteryMw = adp.units
      .filter((u) => u.technology === 'battery')
      .reduce((total, u) => total + (u.capacityMw ?? 0), 0)

    expect(batteryMw).toBe(7.76)
  })

  it('falls back to the discharging record when there is no canonical one', () => {
    const fallback = byCode('DISCHONLY')

    expect(fallback.units.map((u) => u.code)).toEqual(['DOB1G'])
    expect(fallback.units[0]?.capacityMw).toBe(10)
  })

  it('never keeps a charging record, so charging capacity cannot reach a total', () => {
    const chargingCodes = parsed
      .flatMap((f) => f.units.map((u) => u.code))
      .filter((c) => c.endsWith('L'))

    expect(chargingCodes).toEqual([])
  })

  it('drops a facility whose only unit was a charging record', () => {
    expect(parsed.find((f) => f.code === 'CHARGEONLY')).toBeUndefined()
    expect(parsed).toHaveLength(5)
  })
})

describe('state normalisation', () => {
  it('maps NEM regions to states and WEM to WA', () => {
    expect(byCode('ADP').state).toBe('SA')
    expect(byCode('DISCHONLY').state).toBe('NSW')
    expect(byCode('MIXEDCOAL').state).toBe('VIC')
    expect(byCode('WESTWIND').state).toBe('WA')
    expect(byCode('ODDBALL').state).toBe('TAS')
  })
})

describe('technology and status normalisation', () => {
  it('folds fueltech families into display technologies', () => {
    expect(byCode('MIXEDCOAL').units.map((u) => u.technology)).toEqual(['coal', 'coal'])
    expect(byCode('ADP').units.find((u) => u.code === 'ADPPV1')?.technology).toBe('solar')
    expect(byCode('WESTWIND').units[0]?.technology).toBe('wind')
  })

  it('folds hydro into "other" and falls back for unmapped fueltechs', () => {
    const oddball = byCode('ODDBALL')

    expect(oddball.units.find((u) => u.code === 'HY1')?.technology).toBe('other')
    expect(oddball.units.find((u) => u.code === 'UK1')?.technology).toBe('other')
  })

  it('falls back to "unknown" for an unrecognised status', () => {
    expect(byCode('ODDBALL').units.find((u) => u.code === 'UK1')?.status).toBe('unknown')
    expect(byCode('MIXEDCOAL').units.find((u) => u.code === 'MC1')?.status).toBe('retired')
    expect(byCode('WESTWIND').units[0]?.status).toBe('committed')
  })
})

describe('capacity', () => {
  it('keeps an unreported capacity as null rather than zero', () => {
    expect(byCode('MIXEDCOAL').units.find((u) => u.code === 'MC2')?.capacityMw).toBeNull()
  })
})

describe('partial commencement dates', () => {
  it('keeps a full date at day precision', () => {
    expect(byCode('ADP').units.find((u) => u.code === 'ADPPV1')?.commencement).toEqual({
      precision: 'day',
      year: 2021,
      month: 5,
      day: 17,
    })
  })

  it('reduces a year-precision date to its year, ignoring the UTC offset', () => {
    // The raw value is 2022-12-31T14:00:00Z, which is 2023 in Australian market
    // time. Reading the literal date keeps the year the source intended.
    expect(byCode('DISCHONLY').units[0]?.commencement).toEqual({ precision: 'year', year: 2022 })
  })

  it('reduces a month-precision date to year and month', () => {
    expect(byCode('MIXEDCOAL').units.find((u) => u.code === 'MC2')?.commencement).toEqual({
      precision: 'month',
      year: 1985,
      month: 6,
    })
  })

  it('keeps a missing commencement date as null', () => {
    expect(byCode('ODDBALL').units.find((u) => u.code === 'UK1')?.commencement).toBeNull()
  })
})
