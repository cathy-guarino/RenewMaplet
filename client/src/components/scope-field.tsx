import type { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * A labelled scope control: label above a full-width select, with a leading
 * icon and an optional selected-count badge.
 *
 * The badge appears only when the filter narrows the default "all" state
 * (BEHAVIOUR_GUIDE.md). Selection itself is not wired up yet — the shell stage
 * renders these as structural placeholders.
 */
export function ScopeField({
  label,
  icon,
  value,
  selectedCount = 0,
}: {
  label: string
  icon: ReactNode
  value: string
  selectedCount?: number
}) {
  const narrowed = selectedCount > 0

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-label font-medium">{label}</span>

      <Select value={value}>
        <SelectTrigger
          aria-label={label}
          // shadcn sizes triggers to content; the scope panel wants a column.
          className="h-control w-full bg-surface shadow-none"
        >
          <span className="flex min-w-0 items-center gap-2">
            {narrowed ? (
              <span
                aria-hidden
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-medium text-primary-foreground"
              >
                {selectedCount}
              </span>
            ) : (
              <span aria-hidden className="shrink-0 text-muted-foreground">
                {icon}
              </span>
            )}
            <SelectValue />
          </span>
        </SelectTrigger>

        <SelectContent>
          <SelectItem value={value}>{value}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
