import type { KeyboardEvent } from 'react'
import { ChevronRight } from 'lucide-react'
import { StateIndicator, StatusIndicator, TechnologyIndicator } from '@/components/indicators'
import { TECHNOLOGIES, UNIT_STATUSES } from '@/data/types'
import type { Technology, UnitStatus } from '@/data/types'
import {
  measureValue,
  relativeShare,
  type Breakdown,
  type Group,
  type Measure,
  type Totals,
} from '@/domain/summary'

/**
 * Grouped results: a header row, one row per group, and "All in scope" last.
 *
 * Columns are a fixed grid rather than an auto-laid-out table, so widths stay
 * put as filters and data change (BEHAVIOUR_GUIDE.md). The relative-share
 * column is dropped on narrow viewports (reference/09-narrow-layout.png).
 *
 * A group row opens into its facilities. When one is selected the others are
 * hidden — the caller renders only the selected row plus the inline table
 * (reference/05-expanded-facilities.png). "All in scope" is a summary, not a
 * group, so it is never selectable and is hidden while a group is open.
 */

const GRID =
  'grid grid-cols-[1.75rem_1fr_5.5rem_4rem] items-center gap-x-3 pr-main-gutter pl-5 md:grid-cols-[2.25rem_14.4375rem_1fr_6.6875rem_6.4375rem] md:gap-x-0'

const NUMBER = 'text-figure tabular-nums text-right md:text-left'

const facilityFormat = new Intl.NumberFormat(undefined)
const megawattFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

export const BREAKDOWN_COLUMN_LABEL: Record<Breakdown, string> = {
  technology: 'Technology',
  status: 'Unit status',
  state: 'State',
}

/** Selection key for the "All in scope" row, which opens the whole-scope table. */
export const ALL_IN_SCOPE_KEY = '__all__'

export function GroupRows({
  groups,
  scopeTotals,
  breakdown,
  measure,
  selectedKey,
  onSelect,
}: {
  groups: readonly Group[]
  scopeTotals: Totals
  breakdown: Breakdown
  measure: Measure
  selectedKey: string | null
  onSelect: (key: string) => void
}) {
  const scopeValue = measureValue(scopeTotals, measure)
  const allSelected = selectedKey === ALL_IN_SCOPE_KEY
  const selectedGroup = allSelected ? null : (groups.find((g) => g.key === selectedKey) ?? null)
  // When a group is open, show only it. When "All in scope" is open, show only
  // that row. Otherwise the full list plus the total.
  const visibleGroups = selectedGroup ? [selectedGroup] : allSelected ? [] : groups

  return (
    <div role="table" aria-label={`Groups by ${BREAKDOWN_COLUMN_LABEL[breakdown].toLowerCase()}`}>
      <div
        role="row"
        className={`${GRID} border-b border-border text-column text-muted-foreground`}
      >
        <span aria-hidden />
        <span role="columnheader" className="py-2.5">
          {BREAKDOWN_COLUMN_LABEL[breakdown]}
        </span>
        <span role="columnheader" className="hidden py-2.5 md:block">
          Relative share
        </span>
        <HeaderCell strong={measure === 'capacity'}>Registered MW</HeaderCell>
        <HeaderCell strong={measure === 'facilities'}>Facilities</HeaderCell>
      </div>

      {visibleGroups.map((group) => (
        <Row
          key={group.key}
          group={group}
          breakdown={breakdown}
          measure={measure}
          scopeValue={scopeValue}
          selected={group.key === selectedKey}
          onSelect={() => {
            onSelect(group.key)
          }}
        />
      ))}

      {/* "All in scope" is hidden while a single group is open, and itself
          opens the whole-scope table. */}
      {selectedGroup === null && (
        <Row
          group={{ key: ALL_IN_SCOPE_KEY, label: 'All in scope', ...scopeTotals }}
          breakdown={breakdown}
          measure={measure}
          scopeValue={scopeValue}
          isScopeTotal
          selected={allSelected}
          onSelect={() => {
            onSelect(ALL_IN_SCOPE_KEY)
          }}
        />
      )}
    </div>
  )
}

function Row({
  group,
  breakdown,
  measure,
  scopeValue,
  isScopeTotal = false,
  selected = false,
  onSelect,
}: {
  group: Group
  breakdown: Breakdown
  measure: Measure
  scopeValue: number
  isScopeTotal?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  // The scope total is the reference the groups are read against, so its bar
  // is full by definition rather than by calculation.
  const share = isScopeTotal ? 1 : relativeShare(measureValue(group, measure), scopeValue)

  const interactive = onSelect !== undefined
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.()
    }
  }

  return (
    <div
      role="row"
      {...(interactive
        ? {
            tabIndex: 0,
            'aria-expanded': selected,
            'aria-label': `${group.label}, ${facilityFormat.format(group.facilityCount)} facilities`,
            onClick: onSelect,
            onKeyDown: handleKeyDown,
          }
        : {})}
      className={`${GRID} h-row border-b border-border text-sm ${isScopeTotal ? 'font-semibold' : ''} ${
        // The open row sits on grey to bracket the table below it; the closed
        // "All in scope" total keeps its faint tint; other rows are white.
        selected ? 'bg-muted' : isScopeTotal ? 'bg-background' : 'bg-surface'
      } ${interactive && !selected ? 'cursor-pointer outline-none hover:bg-muted focus-visible:bg-muted' : ''} ${
        interactive && selected ? 'cursor-pointer outline-none' : ''
      } ${
        // A 2px inset accent marks the open row — no extra border, no layout shift.
        selected ? 'shadow-[inset_2px_0_0_0_var(--color-foreground)]' : ''
      }`}
    >
      <ChevronRight
        aria-hidden
        className={`size-4 text-foreground transition-transform ${selected ? 'rotate-90' : ''} ${
          interactive ? '' : 'invisible'
        }`}
      />

      <span role="cell" className="flex min-w-0 items-center gap-2.5">
        {!isScopeTotal && <GroupIndicator breakdown={breakdown} groupKey={group.key} />}
        <span className="truncate">{group.label}</span>
      </span>

      <span role="cell" className="hidden md:block">
        {/* Decorative: the same figures are in the two columns that follow. */}
        <span aria-hidden className="me-7 block h-[5px] rounded-full bg-bar-track">
          <span
            className="block h-full rounded-full bg-bar-fill"
            style={{ width: `${(share * 100).toFixed(2)}%` }}
          />
        </span>
      </span>

      <ValueCell strong={measure === 'capacity'}>
        {megawattFormat.format(group.registeredMw)}
      </ValueCell>
      <ValueCell strong={measure === 'facilities'}>
        {facilityFormat.format(group.facilityCount)}
      </ValueCell>
    </div>
  )
}

/**
 * Both totals are always shown, and both stay full-strength black in the rows —
 * weight alone marks the selected measure. Muting the other column would read
 * as "this number is less true" rather than "this one is the subject".
 */
function ValueCell({ strong, children }: { strong: boolean; children: React.ReactNode }) {
  return (
    <span
      role="cell"
      className={`${NUMBER} text-foreground ${strong ? 'font-semibold' : 'font-normal'}`}
    >
      {children}
    </span>
  )
}

/** In the heading row the distinction is colour as well as weight. */
function HeaderCell({ strong, children }: { strong: boolean; children: React.ReactNode }) {
  return (
    <span
      role="columnheader"
      className={`py-2.5 ${strong ? 'font-semibold text-foreground' : 'font-normal'}`}
    >
      {children}
    </span>
  )
}

function GroupIndicator({ breakdown, groupKey }: { breakdown: Breakdown; groupKey: string }) {
  switch (breakdown) {
    case 'technology':
      return isTechnology(groupKey) ? <TechnologyIndicator technology={groupKey} /> : null
    case 'status':
      return isStatus(groupKey) ? <StatusIndicator status={groupKey} /> : null
    case 'state':
      return <StateIndicator />
  }
}

const isTechnology = (key: string): key is Technology =>
  (TECHNOLOGIES as readonly string[]).includes(key)
const isStatus = (key: string): key is UnitStatus =>
  (UNIT_STATUSES as readonly string[]).includes(key)
