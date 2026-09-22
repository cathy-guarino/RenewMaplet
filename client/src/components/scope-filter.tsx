import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Option, TechnologyGroup } from '@/domain/scope-options'

/**
 * A scope filter: a select-shaped trigger opening a popover of choices.
 *
 * Built from Button + Popover rather than Select, because three of the four
 * filters are multi-select. The trigger carries `role="combobox"`, which is the
 * shadcn combobox pattern, so it reads and looks the same as the single-select
 * controls in the results header.
 *
 * `multi` adds the popover's header actions (Select all / Clear) and a Done
 * footer, per the filter mockups. An empty selection means "all", so a fully
 * checked filter is not a narrowing — Select all and Clear both return to that
 * unnarrowed state.
 */
interface MultiActions {
  canSelectAll: boolean
  canClear: boolean
  onSelectAll: () => void
  onClear: () => void
}

function FilterShell({
  label,
  icon,
  summary,
  selectedCount,
  multi,
  children,
}: {
  label: string
  icon: ReactNode
  summary: string
  selectedCount: number
  multi?: MultiActions
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

        {/* Fixed width and no inner scroll: the popover grows to fit its
            options, matching the filter mockups. */}
        <PopoverContent align="start" className="w-80 p-0">
          {multi && (
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-base font-semibold">{label}</span>
              <span className="flex items-center gap-3 text-xs">
                <HeaderAction onClick={multi.onSelectAll} disabled={!multi.canSelectAll}>
                  Select all
                </HeaderAction>
                <HeaderAction onClick={multi.onClear} disabled={!multi.canClear} muted>
                  Clear
                </HeaderAction>
              </span>
            </div>
          )}

          <div className="p-2">
            {children(() => {
              setOpen(false)
            })}
          </div>

          {multi && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                }}
                className="w-full rounded-md bg-muted py-2.5 text-sm font-medium outline-none hover:bg-border"
              >
                Done
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function HeaderAction({
  onClick,
  disabled,
  muted = false,
  children,
}: {
  onClick: () => void
  disabled: boolean
  muted?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-medium outline-none hover:underline focus-visible:underline disabled:cursor-default disabled:no-underline disabled:opacity-40 ${
        muted ? 'text-muted-foreground' : 'text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

// Roomy rows to match the mockups: ~44px tall, 15px labels, generous gap.
const ROW =
  'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-[0.9375rem] hover:bg-muted focus-within:bg-muted'

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

  // Checkboxes are literal: an empty selection means "all", shown as no boxes
  // ticked. Members are added on click; Select all ticks every box.
  const toggle = (value: T) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  return (
    <FilterShell
      label={label}
      icon={icon}
      summary={summary}
      selectedCount={narrows ? selected.length : 0}
      multi={{
        canSelectAll: selected.length < options.length,
        canClear: selected.length > 0,
        onSelectAll: () => {
          onChange(options.map((o) => o.value))
        },
        onClear: () => {
          onChange([])
        },
      }}
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

/**
 * Multi-select filter whose options are grouped (renewables / fossil / …). Each
 * group header names the family and offers "Only" to scope to just that group;
 * members are still selectable individually and carry their technology icon.
 * An empty selection means "all available values".
 */
export function GroupedMultiScopeFilter<T extends string>({
  label,
  icon,
  allLabel,
  groups,
  selected,
  onChange,
  renderIcon,
}: {
  label: string
  icon: ReactNode
  allLabel: string
  groups: readonly TechnologyGroup[]
  selected: readonly T[]
  onChange: (next: readonly T[]) => void
  renderIcon: (value: T) => ReactNode
}) {
  const allValues = groups.flatMap((group) => group.options.map((o) => o.value as T))
  const narrows = selected.length > 0 && selected.length < allValues.length

  const summary = narrows
    ? groups
        .flatMap((group) => {
          const values = group.options.map((o) => o.value as T)
          const chosen = values.filter((v) => selected.includes(v))
          // Collapse a fully-selected group to its name; otherwise list members.
          if (chosen.length > 0 && chosen.length === values.length) return [group.label]
          return group.options.filter((o) => selected.includes(o.value as T)).map((o) => o.label)
        })
        .join(', ')
    : allLabel

  const toggle = (value: T) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }
  // "Only" scopes to exactly this group (replacing the selection). Selecting
  // every value collapses to the canonical "all" ([]).
  const only = (values: readonly T[]) => {
    onChange(values.length === allValues.length ? [] : values)
  }

  return (
    <FilterShell
      label={label}
      icon={icon}
      summary={summary}
      selectedCount={narrows ? selected.length : 0}
      multi={{
        canSelectAll: selected.length < allValues.length,
        canClear: selected.length > 0,
        onSelectAll: () => {
          onChange(allValues)
        },
        onClear: () => {
          onChange([])
        },
      }}
    >
      {() => (
        <div role="group" aria-label={label} className="flex flex-col">
          {groups.map((group, index) => {
            const values = group.options.map((o) => o.value as T)
            return (
              // A divider separates each group, as in the reference.
              <div
                key={group.id}
                className={`flex flex-col ${index > 0 ? 'mt-1 border-t border-border pt-1' : ''}`}
              >
                <div className="flex items-center justify-between px-2 pt-3 pb-1">
                  <span className="text-column font-medium tracking-wide text-muted-foreground uppercase">
                    {group.label}
                  </span>
                  <button
                    type="button"
                    aria-label={`Only ${group.label}`}
                    onClick={() => {
                      only(values)
                    }}
                    className="text-xs font-medium text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:underline"
                  >
                    Only
                  </button>
                </div>
                {group.options.map((option) => (
                  <label key={option.value} className={ROW}>
                    <Checkbox
                      checked={selected.includes(option.value as T)}
                      onCheckedChange={() => {
                        toggle(option.value as T)
                      }}
                    />
                    <span aria-hidden className="shrink-0">
                      {renderIcon(option.value as T)}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </label>
                ))}
              </div>
            )
          })}
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
