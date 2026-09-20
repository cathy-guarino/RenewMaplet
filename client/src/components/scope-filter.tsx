import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Option } from '@/domain/scope-options'

/**
 * A scope filter: a select-shaped trigger opening a popover of choices.
 *
 * Built from Button + Popover rather than Select, because three of the four
 * filters are multi-select. The trigger carries `role="combobox"`, which is the
 * shadcn combobox pattern, so it reads and looks the same as the single-select
 * controls in the results header.
 */
function FilterShell({
  label,
  icon,
  summary,
  selectedCount,
  children,
}: {
  label: string
  icon: ReactNode
  summary: string
  selectedCount: number
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  // The badge marks a filter that narrows the default "all" state; selecting
  // every value is not a narrowing, so the caller reports 0 in that case.
  const narrowed = selectedCount > 0

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={`${label}-label`} className="text-label font-medium">
        {label}
      </span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-labelledby={`${label}-label`}
            className="h-control w-full justify-between bg-surface px-3 font-normal shadow-none"
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
              <span className="truncate">{summary}</span>
            </span>
            <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground opacity-70" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-56 p-1.5">
          {children(() => {
            setOpen(false)
          })}
        </PopoverContent>
      </Popover>
    </div>
  )
}

const ROW =
  'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted focus-within:bg-muted'

/** Multi-select filter. An empty selection means "all available values". */
export function MultiScopeFilter<T extends string>({
  label,
  icon,
  allLabel,
  options,
  selected,
  onChange,
}: {
  label: string
  icon: ReactNode
  allLabel: string
  options: readonly Option<T>[]
  selected: readonly T[]
  onChange: (next: readonly T[]) => void
}) {
  // Ticking every option produces the same result set as ticking none, so it
  // is not a narrowing and shows no badge.
  const narrows = selected.length > 0 && selected.length < options.length
  const summary = narrows
    ? options
        .filter((o) => selected.includes(o.value))
        .map((o) => o.label)
        .join(', ')
    : allLabel

  const toggle = (value: T) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  return (
    <FilterShell
      label={label}
      icon={icon}
      summary={summary}
      selectedCount={narrows ? selected.length : 0}
    >
      {() => (
        <div role="group" aria-label={label} className="flex flex-col">
          {options.map((option) => (
            <label key={option.value} className={ROW}>
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => {
                  toggle(option.value)
                }}
              />
              <span className="truncate">{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </FilterShell>
  )
}

/** Single-select filter, used for commencement. */
export function SingleScopeFilter({
  label,
  icon,
  options,
  value,
  defaultValue,
  onChange,
}: {
  label: string
  icon: ReactNode
  options: readonly Option<string>[]
  value: string
  defaultValue: string
  onChange: (next: string) => void
}) {
  const narrows = value !== defaultValue
  const summary = options.find((o) => o.value === value)?.label ?? ''

  return (
    <FilterShell label={label} icon={icon} summary={summary} selectedCount={narrows ? 1 : 0}>
      {(close) => (
        <RadioGroup
          aria-label={label}
          value={value}
          onValueChange={(next) => {
            onChange(next)
            close()
          }}
          className="gap-0"
        >
          {options.map((option) => (
            <label key={option.value} className={ROW}>
              <RadioGroupItem value={option.value} />
              <span className="truncate">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
      )}
    </FilterShell>
  )
}
