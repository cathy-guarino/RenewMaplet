/**
 * The values a scope can actually be narrowed to, and the commencement presets
 * offered alongside them. Pure and framework-free.
 *
 * Options come from the loaded data rather than the full vocabulary, so "all"
 * means "all available values" (there is no Commissioning option if nothing in
 * the feed is commissioning).
 */

import {
  STATES,
  TECHNOLOGIES,
  TECHNOLOGY_LABELS,
  UNIT_STATUSES,
  UNIT_STATUS_LABELS,
  type Facility,
  type StateCode,
  type Technology,
  type UnitStatus,
} from '@/data/types'
import type { CommencementFilter } from './scope'

export interface Option<T> {
  readonly value: T
  readonly label: string
}

export interface ScopeOptions {
  readonly states: readonly Option<StateCode>[]
  readonly technologies: readonly Option<Technology>[]
  readonly statuses: readonly Option<UnitStatus>[]
}

/**
 * Ordered by the canonical vocabulary rather than by first appearance, so the
 * lists stay stable as the underlying data changes.
 */
export function availableScopeOptions(facilities: readonly Facility[]): ScopeOptions {
  const states = new Set<StateCode>()
  const technologies = new Set<Technology>()
  const statuses = new Set<UnitStatus>()

  for (const facility of facilities) {
    if (facility.state !== null) states.add(facility.state)
    for (const unit of facility.units) {
      technologies.add(unit.technology)
      statuses.add(unit.status)
    }
  }

  return {
    states: STATES.filter((s) => states.has(s)).map((s) => ({ value: s, label: s })),
    technologies: TECHNOLOGIES.filter((t) => technologies.has(t)).map((t) => ({
      value: t,
      label: TECHNOLOGY_LABELS[t],
    })),
    statuses: UNIT_STATUSES.filter((s) => statuses.has(s)).map((s) => ({
      value: s,
      label: UNIT_STATUS_LABELS[s],
    })),
  }
}

export interface CommencementPreset {
  readonly id: string
  readonly label: string
  readonly filter: CommencementFilter
}

export const ANY_DATE_PRESET_ID = 'any'

/**
 * Relative windows rather than fixed years, so the options do not go stale.
 *
 * These are year-granular because commencement filtering is: a "Last 5 years"
 * window in 2026 means commencement year 2022 or later. Coarser than a rolling
 * 60 months, but it is the precision the source actually supports for every
 * record (DATA_GUIDE.md).
 */
export function commencementPresets(currentYear: number): readonly CommencementPreset[] {
  const since = (years: number): CommencementFilter => ({
    kind: 'range',
    fromYear: currentYear - (years - 1),
    toYear: null,
  })

  return [
    { id: ANY_DATE_PRESET_ID, label: 'Any date', filter: { kind: 'any' } },
    { id: 'last-2', label: 'Last 2 years', filter: since(2) },
    { id: 'last-5', label: 'Last 5 years', filter: since(5) },
    { id: 'last-10', label: 'Last 10 years', filter: since(10) },
  ]
}
