import { describe, expect, it } from 'vitest'
import { facilitiesResponse } from '@tests/fixtures/facilities-response'
import { parseFacilitiesResponse } from '@/data/parse-facilities'
import {
  ANY_DATE_PRESET_ID,
  availableScopeOptions,
  commencementPresets,
  technologyGroups,
} from './scope-options'

const facilities = parseFacilitiesResponse(facilitiesResponse)

describe('availableScopeOptions', () => {
  it('offers only values present in the data, in canonical order', () => {
    const options = availableScopeOptions(facilities)

    // QLD's only facility was charging-only and never reached the model; nothing
    // in the fixture is distillate or commissioning.
    expect(options.states.map((o) => o.value)).toEqual(['NSW', 'SA', 'TAS', 'VIC', 'WA'])
    expect(options.technologies.map((o) => o.label)).toEqual([
      'Battery',
      'Coal',
      'Onshore wind',
      'Utility solar',
      'Other',
    ])
    expect(options.statuses.map((o) => o.label)).toEqual([
      'Committed',
      'Operating',
      'Retired',
      'Unknown',
    ])
  })

  it('returns empty option lists for no facilities', () => {
    expect(availableScopeOptions([])).toEqual({ states: [], technologies: [], statuses: [] })
  })
})

describe('commencementPresets', () => {
  it('leads with an unnarrowed default and builds year-relative windows', () => {
    const presets = commencementPresets(2026)
    expect(presets[0]?.id).toBe(ANY_DATE_PRESET_ID)
    expect(presets[0]?.filter).toEqual({ kind: 'any' })
    // "Last 5 years" in 2026 means commencement year 2022 or later.
    expect(presets.find((p) => p.id === 'last-5')?.filter).toEqual({
      kind: 'range',
      fromYear: 2022,
      toYear: null,
    })
    // Relative to the year given, not hardcoded.
    expect(commencementPresets(2030).find((p) => p.id === 'last-10')?.filter).toEqual({
      kind: 'range',
      fromYear: 2021,
      toYear: null,
    })
  })
})

describe('technologyGroups', () => {
  it('organises available technologies into renewables, fossil, storage and other', () => {
    const groups = technologyGroups(availableScopeOptions(facilities).technologies)

    expect(groups.map((g) => g.id)).toEqual(['renewables', 'fossil', 'storage', 'other'])
    expect(groups.find((g) => g.id === 'renewables')?.options.map((o) => o.value)).toEqual([
      'wind',
      'solar',
    ])
    // The fixture has coal but no gas or distillate; battery is its own group.
    expect(groups.find((g) => g.id === 'fossil')?.options.map((o) => o.value)).toEqual(['coal'])
    expect(groups.find((g) => g.id === 'storage')?.options.map((o) => o.value)).toEqual(['battery'])
  })

  it('drops groups with no available members', () => {
    const onlyWind = availableScopeOptions(facilities).technologies.filter(
      (o) => o.value === 'wind',
    )
    expect(technologyGroups(onlyWind).map((g) => g.id)).toEqual(['renewables'])
  })
})
