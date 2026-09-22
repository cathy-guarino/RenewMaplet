import type { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Breakdown, Measure } from '@/domain/summary'

/**
 * The results panel: one header row, then the results region.
 *
 * The header row carries the title, the current totals for the scope, and the
 * Measure and Break down by selects.
 */

export const MEASURE_LABELS: Record<Measure, string> = {
  facilities: 'Distinct facilities',
  capacity: 'Registered capacity',
}

/** How the measure reads in the title: "Facilities by technology". */
const MEASURE_NOUN: Record<Measure, string> = {
  facilities: 'Facilities',
  capacity: 'Registered capacity',
}

export const BREAKDOWN_LABELS: Record<Breakdown, string> = {
  technology: 'Technology',
  status: 'Unit status',
  state: 'State',
}

export function resultsTitle(measure: Measure, breakdown: Breakdown): string {
  return `${MEASURE_NOUN[measure]} by ${BREAKDOWN_LABELS[breakdown].toLowerCase()}`
}

export function ResultsPanel({
  measure,
  breakdown,
  totals,
  onMeasureChange,
  onBreakdownChange,
  children,
}: {
  measure: Measure
  breakdown: Breakdown
  totals: string
  onMeasureChange: (measure: Measure) => void
  onBreakdownChange: (breakdown: Breakdown) => void
  children: ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col md:h-full md:min-h-0">
      <div className="flex shrink-0 flex-col gap-5 border-b border-border px-main-gutter py-6 md:flex-row md:items-start md:justify-between md:gap-8">
        <div className="min-w-0">
          <h1 className="text-title font-semibold tracking-tight">
            {resultsTitle(measure, breakdown)}
          </h1>
          <p className="mt-1 text-label text-muted-foreground">{totals}</p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-4 md:w-[580px]">
          <HeaderSelect
            label="Measure"
            value={measure}
            options={MEASURE_LABELS}
            onChange={(v) => {
              onMeasureChange(v as Measure)
            }}
          />
          <HeaderSelect
            label="Break down by"
            value={breakdown}
            options={BREAKDOWN_LABELS}
            onChange={(v) => {
              onBreakdownChange(v as Breakdown)
            }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

function HeaderSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Record<string, string>
  onChange: (value: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-label font-medium">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="h-control w-full bg-surface shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(options).map(([key, optionLabel]) => (
            <SelectItem key={key} value={key}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
