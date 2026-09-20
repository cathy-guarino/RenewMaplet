import type { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * The results panel: one header row, then the results region.
 *
 * The header row carries the title, the current totals, and the Measure and
 * Break down by selects. Those selects are placeholders at this stage.
 */
export function ResultsPanel({
  title,
  totals,
  children,
}: {
  title: string
  totals: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex shrink-0 flex-col gap-5 border-b border-border px-main-gutter py-6 md:flex-row md:items-start md:justify-between md:gap-8">
        <div className="min-w-0">
          <h1 className="text-title font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-label text-muted-foreground">{totals}</p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-4 md:w-[580px]">
          <HeaderSelect label="Measure" value="Distinct facilities" />
          <HeaderSelect label="Break down by" value="Technology" />
        </div>
      </div>

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

function HeaderSelect({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-label font-medium">{label}</span>
      <Select value={value}>
        <SelectTrigger aria-label={label} className="h-control w-full bg-surface shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={value}>{value}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
