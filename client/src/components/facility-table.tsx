import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { StatusIndicator, TechnologyIndicator } from '@/components/indicators'
import { UNIT_STATUS_LABELS, type UnitStatus } from '@/data/types'
import {
  DEFAULT_FACILITY_SORT,
  sortFacilityRows,
  toggleSort,
  type FacilityRow,
  type FacilitySort,
  type SortField,
} from '@/domain/facility-table'

/**
 * Inline table of the facilities behind the open group, within the current
 * scope (reference/05 and /06).
 *
 * The grid's leading two tracks (a 2.25rem gutter and the 14.4375rem technology
 * column) match the grouped-row grid above, so the technology icon lines up
 * under the group's icon, and the trailing MW/Units tracks match too, so the
 * Units count lines up under the group's Facilities column. Technology is the
 * first attribute column and Facility the flexible name column. The Unit status
 * column shows one status icon per unit plus a label ("Operating", or "Mixed"
 * when they differ); it wraps and grows the row for the rare facility with many
 * units. Below `md` the grid keeps its width and the panel scrolls horizontally,
 * which BEHAVIOUR_GUIDE.md permits for dense narrow layouts.
 */

const GRID =
  'grid grid-cols-[2.25rem_14.4375rem_minmax(9rem,1fr)_16rem_6.6875rem_6.4375rem] items-center pr-main-gutter pl-5'

const PAGE_SIZE = 50

const megawattFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

const COLUMNS: ReadonlyArray<{ field: SortField; label: string }> = [
  { field: 'technology', label: 'Technology' },
  { field: 'facility', label: 'Facility' },
  { field: 'status', label: 'Unit status' },
  { field: 'mw', label: 'MW' },
  { field: 'units', label: 'Units' },
]

export function FacilityTable({ rows }: { rows: readonly FacilityRow[] }) {
  const [sort, setSort] = useState<FacilitySort>(DEFAULT_FACILITY_SORT)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const sorted = sortFacilityRows(rows, sort)
  const visible = sorted.slice(0, visibleCount)
  const remaining = sorted.length - visible.length

  return (
    // One scroll container fills the remaining height and scrolls both axes;
    // horizontal scroll is the narrow-layout fallback.
    <div className="min-h-0 flex-1 overflow-auto">
      <div role="table" aria-label="Facilities in the selected group" className="min-w-fit">
        <div
          role="row"
          className={`${GRID} sticky top-0 z-10 border-b border-border bg-muted text-column text-muted-foreground`}
        >
          <span aria-hidden />
          {COLUMNS.map((column) => (
            <SortableHeader
              key={column.field}
              label={column.label}
              active={sort.field === column.field}
              direction={sort.direction}
              onSort={() => {
                setSort((current) => toggleSort(current, column.field))
              }}
            />
          ))}
        </div>

        {visible.map((row) => (
          <FacilityRowView key={row.code} row={row} />
        ))}

        {remaining > 0 && (
          // Aligned under the Facility column, past the gutter and technology track.
          <div className="py-3 pr-main-gutter pl-[calc(1.25rem+2.25rem+14.4375rem)]">
            <button
              type="button"
              onClick={() => {
                setVisibleCount((count) => count + PAGE_SIZE)
              }}
              className="cursor-pointer text-sm font-medium text-foreground outline-none hover:underline focus-visible:underline"
            >
              Show more facilities
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SortableHeader({
  label,
  active,
  direction,
  onSort,
}: {
  label: string
  active: boolean
  direction: FacilitySort['direction']
  onSort: () => void
}) {
  const Arrow = !active ? ChevronsUpDown : direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <span
      role="columnheader"
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {/* The whole column header is clickable; on hover the text just darkens. */}
      <button
        type="button"
        onClick={onSort}
        className={`flex w-full cursor-pointer items-center gap-1 py-2.5 outline-none hover:text-foreground focus-visible:text-foreground ${
          active ? 'text-foreground' : ''
        }`}
      >
        {label}
        <Arrow aria-hidden className={`size-3.5 ${active ? '' : 'opacity-50'}`} strokeWidth={2} />
      </button>
    </span>
  )
}

function FacilityRowView({ row }: { row: FacilityRow }) {
  // A wholly-retired facility reads clearly quieter: muted text plus reduced
  // opacity so its technology icon fades too, matching the reference.
  const retired = row.unitStatuses.every((status) => status === 'retired')
  const tone = retired ? 'text-muted-foreground opacity-70' : 'text-foreground'

  return (
    <div
      role="row"
      // min-height, not a fixed height: a facility with many units wraps its
      // status icons onto a second line and the row grows to fit.
      className={`${GRID} min-h-table-row border-b border-border bg-surface py-1.5 text-sm hover:bg-muted/60 ${tone}`}
    >
      <span aria-hidden />

      {/* Tighter gap so a facility's technologies read as one cluster. */}
      <span role="cell" className="flex min-w-0 items-center gap-1">
        {/* Every technology the facility has in this group — solar and battery,
            say — each with a tooltip since the column carries no text. */}
        {row.technologies.map((technology) => (
          <TechnologyIndicator key={technology} technology={technology} labelled={false} />
        ))}
      </span>

      <Cell>
        <span className="truncate">{row.name}</span>
        {row.state && <span className="text-xs text-muted-foreground">{row.state}</span>}
      </Cell>

      {/* Keep the icons and fixed-width label together, shifted left so the
          label begins at the Unit status column heading. */}
      <span
        role="cell"
        className="flex min-w-0 -translate-x-[8.75rem] items-center gap-2 text-label"
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1">
          {row.unitStatuses.map((status, index) => (
            <StatusIndicator key={index} status={status} />
          ))}
        </span>
        <span className="w-28 shrink-0">{unitStatusLabel(row.unitStatuses)}</span>
      </span>

      <span role="cell" className="text-label tabular-nums">
        {megawattFormat.format(row.registeredMw)}
      </span>
      <span role="cell" className="text-label tabular-nums">
        {row.unitCount}
      </span>
    </div>
  )
}

/** The shared status name when every unit agrees, otherwise "Mixed". */
function unitStatusLabel(statuses: readonly UnitStatus[]): string {
  const first = statuses[0]
  if (first === undefined) return ''
  return statuses.every((status) => status === first) ? UNIT_STATUS_LABELS[first] : 'Mixed'
}

function Cell({ children }: { children: ReactNode }) {
  return (
    <span role="cell" className="flex min-w-0 items-center gap-2.5">
      {children}
    </span>
  )
}
