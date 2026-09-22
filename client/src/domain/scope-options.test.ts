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
  const options = availableScopeOptions(facilities)

  it('offers only values present in the data', () => {
    expect(options.states.map((o) => o.value)).toEqual(['NSW', 'SA', 'TAS', 'VIC', 'WA'])
    // QLD's only facility was charging-only and never reached the model.
    expect(options.states.map((o) => o.value)).not.toContain('QLD')
    // Nothing in the fixture is distillate or commissioning.
    expect(options.technologies.map((o) => o.value)).not.toContain('distillate')
    expect(options.statuses.map((o) => o.value)).not.toContain('commissioning')
  })

  it('orders by the canonical vocabulary, not first appearance', () => {
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
  const presets = commencementPresets(2026)

  it('leads with an unnarrowed default', () => {
    expect(presets[0]?.id).toBe(ANY_DATE_PRESET_ID)
    expect(presets[0]?.filter).toEqual({ kind: 'any' })
  })

  it('builds inclusive year windows relative to the current year', () => {
    expect(presets.find((p) => p.id === 'last-2')?.filter).toEqual({
      kind: 'range',
      fromYear: 2025,
      toYear: null,
    })
    expect(presets.find((p) => p.id === 'last-5')?.filter).toEqual({
      kind: 'range',
      fromYear: 2022,
      toYear: null,
    })
  })

  it('moves with the year rather than hardcoding one', () => {
    expect(commencementPresets(2030).find((p) => p.id === 'last-10')?.filter).toEqual({
      kind: 'range',
      fromYear: 2021,
      toYear: null,
    })
  })
})

describe('technologyGroups', () => {
  it('organises available technologies into renewables, fossil, storage and other', () => {
    const options = availableScopeOptions(facilities).technologies
    const groups = technologyGroups(options)

    expect(groups.map((g) => g.id)).toEqual(['renewables', 'fossil', 'storage', 'other'])
    expect(groups.find((g) => g.id === 'renewables')?.options.map((o) => o.value)).toEqual([
      'wind',
      'solar',
    ])
    // The fixture has coal but no gas or distillate, so fossil holds only coal.
    expect(groups.find((g) => g.id === 'fossil')?.options.map((o) => o.value)).toEqual(['coal'])
    // Battery is its own storage group.
    expect(groups.find((g) => g.id === 'storage')?.options.map((o) => o.value)).toEqual(['battery'])
  })

  it('drops groups with no available members', () => {
    const onlyWind = availableScopeOptions(facilities).technologies.filter(
      (o) => o.value === 'wind',
    )
    const groups = technologyGroups(onlyWind)
    expect(groups.map((g) => g.id)).toEqual(['renewables'])
    expect(groups[0]?.options.map((o) => o.value)).toEqual(['wind'])
  })
})
