/**
 * Application types for the facility model.
 *
 * These are the only facility shapes the rest of the app sees. Raw
 * OpenElectricity payload shapes stop at the parser (DATA_GUIDE.md, "Model").
 */

export const STATES = ['NSW', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const
export type StateCode = (typeof STATES)[number]

/**
 * Display technologies, not API fueltechs. Several fueltechs collapse into one
 * technology (the two coals, the five gases) and hydro/bioenergy/pumps fall
 * into `other`, matching the groups in `reference/01-default.png`.
 */
export const TECHNOLOGIES = [
  'battery',
  'coal',
  'distillate',
  'gas',
  'wind',
  'solar',
  'other',
] as const
export type Technology = (typeof TECHNOLOGIES)[number]

export const TECHNOLOGY_LABELS: Record<Technology, string> = {
  battery: 'Battery',
  coal: 'Coal',
  distillate: 'Distillate',
  gas: 'Gas',
  // TODO: double check this.
  // The live feed carries only onshore `wind` and `solar_utility`; the labels
  // are specific because the reference screenshots are. Offshore wind or
  // rooftop solar would need their own technologies rather than reusing these.
  wind: 'Onshore wind',
  solar: 'Utility solar',
  other: 'Other',
}

/**
 * Technology groups for the scope filter, so a user can scope a whole family at
 * once. Fossil (coal, gas, distillate) answers Sally's comparison in
 * PROJECT_OUTLINE.md; battery is its own Storage group because it is storage
 * rather than generation.
 */
export const TECHNOLOGY_GROUPS = [
  { id: 'renewables', label: 'Renewables', technologies: ['wind', 'solar'] },
  { id: 'fossil', label: 'Fossil', technologies: ['coal', 'gas', 'distillate'] },
  { id: 'storage', label: 'Storage', technologies: ['battery'] },
  { id: 'other', label: 'Other', technologies: ['other'] },
] as const satisfies ReadonlyArray<{
  id: string
  label: string
  technologies: readonly Technology[]
}>

/** Unit lifecycle. Labelled "Lifecycles" in the scope panel screenshots. */
export const UNIT_STATUSES = [
  'committed',
  'commissioning',
  'operating',
  'retired',
  'unknown',
] as const
export type UnitStatus = (typeof UNIT_STATUSES)[number]

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  committed: 'Committed',
  commissioning: 'Commissioning',
  operating: 'Operating',
  retired: 'Retired',
  unknown: 'Unknown',
}

/**
 * A commencement date kept at the precision the source actually supports.
 * Widening a year to 1 January would invent information the feed does not have,
 * so the coarser shapes simply carry fewer fields (DATA_GUIDE.md).
 */
export type Commencement =
  | { readonly precision: 'year'; readonly year: number }
  | { readonly precision: 'month'; readonly year: number; readonly month: number }
  | {
      readonly precision: 'day'
      readonly year: number
      readonly month: number
      readonly day: number
    }

export interface Unit {
  readonly code: string
  readonly technology: Technology
  readonly status: UnitStatus
  /**
   * Registered capacity in MW, or `null` when the feed does not report one.
   * `null` means unknown and must never be coerced to 0 — see
   * `registeredCapacity` in `domain/summary.ts`.
   */
  readonly capacityMw: number | null
  /** `null` when the feed reports no commencement date. */
  readonly commencement: Commencement | null
}

export interface Facility {
  readonly code: string
  readonly name: string
  /** `null` when the network region could not be mapped to a state. */
  readonly state: StateCode | null
  /** Always at least one unit; facilities left with none are dropped at parse. */
  readonly units: readonly Unit[]
}
