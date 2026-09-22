import { useCallback, useImperativeHandle, useState, type Ref } from 'react'
import { FacilityTable } from '@/components/facility-table'
import { ALL_IN_SCOPE_KEY, GroupRows } from '@/components/group-rows'
import { ResultsPanel } from '@/components/results-panel'
import { EmptyState } from '@/components/results-states'
import { ScopePanel } from '@/components/scope-panel'
import type { Facility } from '@/data/types'
import { applyScope, type Scope } from '@/domain/scope'
import { groupFacilities, scopeFacilities } from '@/domain/facility-table'
import { groupScope, totalsForScope, type Breakdown, type Measure } from '@/domain/summary'
import { useScope } from '@/app/use-scope'

/** Lets the global header drive this feature without owning its state. */
export interface FacilityExplorerHandle {
  reset: () => void
}

/**
 * Owns the scope, measure, breakdown and which group is open, and derives
 * everything else.
 *
 * `applyScope`, the totals and the grouping run on every render rather than
 * behind a `useMemo`. Measured over the full live feed (625 facilities, 892
 * units) they cost 0.26 ms combined, against 13–16 ms for the surrounding
 * React and popover work — so memoising here would buy nothing. DATA_GUIDE.md
 * asks for memoisation only where the cost has actually been measured.
 */
export function FacilityExplorer({
  facilities,
  ref,
}: {
  facilities: readonly Facility[]
  ref?: Ref<FacilityExplorerHandle>
}) {
  const scopeApi = useScope(facilities)
  const { scope, options, presets, presetId } = scopeApi
  const [measure, setMeasureState] = useState<Measure>('facilities')
  const [breakdown, setBreakdownState] = useState<Breakdown>('technology')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  // Changing scope, measure or breakdown closes the open table
  // (BEHAVIOUR_GUIDE.md), so every one of those mutators also clears the
  // selection. Selecting a row and sorting or paginating touch none of them, so
  // the table stays open through those. Doing this in the setters rather than an
  // effect keeps the close a direct consequence of the change.
  const changeScope = useCallback(
    (patch: Partial<Scope>) => {
      scopeApi.setScope(patch)
      setSelectedKey(null)
    },
    [scopeApi],
  )
  const changeCommencement = useCallback(
    (id: string) => {
      scopeApi.setCommencementPreset(id)
      setSelectedKey(null)
    },
    [scopeApi],
  )
  const setMeasure = useCallback((next: Measure) => {
    setMeasureState(next)
    setSelectedKey(null)
  }, [])
  const setBreakdown = useCallback((next: Breakdown) => {
    setBreakdownState(next)
    setSelectedKey(null)
  }, [])
  // Reset returns the whole view to defaults: scope, the measure and
  // breakdown selects, and any open table.
  const reset = useCallback(() => {
    scopeApi.reset()
    setMeasureState('facilities')
    setBreakdownState('technology')
    setSelectedKey(null)
  }, [scopeApi])
  // Clicking a group opens its table; clicking the open group again closes it
  // and returns to the bars.
  const toggleSelected = useCallback((key: string) => {
    setSelectedKey((current) => (current === key ? null : key))
  }, [])

  useImperativeHandle(ref, () => ({ reset }), [reset])

  const scoped = applyScope(facilities, scope)
  const totals = totalsForScope(scoped)
  const groups = groupScope(scoped, breakdown)

  // Which facilities the open table shows. "All in scope" spans every scoped
  // facility; a group key restricts to that group. A selection only persists
  // while scope/measure/breakdown are unchanged, so a group key is always found.
  const allOpen = selectedKey === ALL_IN_SCOPE_KEY
  const openGroup =
    allOpen || selectedKey === null ? null : groups.find((g) => g.key === selectedKey)
  const facilityRows = allOpen
    ? scopeFacilities(scoped)
    : openGroup
      ? groupFacilities(scoped, breakdown, openGroup.key)
      : null

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b border-border bg-scope md:h-full md:w-scope-panel md:overflow-y-auto md:border-r md:border-b-0">
        <ScopePanel
          scope={scope}
          options={options}
          presets={presets}
          presetId={presetId}
          onChange={changeScope}
          onCommencementChange={changeCommencement}
        />
      </aside>

      {/* The results panel is white end to end; only the scope panel and the
          "All in scope" row sit on a tint. Overflow is hidden here so the open
          table can own the remaining height and scroll on its own. */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface md:h-full md:overflow-hidden">
        <ResultsPanel
          measure={measure}
          breakdown={breakdown}
          totals={`${totals.facilityCount.toLocaleString()} facilities · ${totals.registeredMw.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW`}
          onMeasureChange={setMeasure}
          onBreakdownChange={setBreakdown}
        >
          {scoped.length === 0 ? (
            <EmptyState onClear={reset} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <GroupRows
                groups={groups}
                scopeTotals={totals}
                breakdown={breakdown}
                measure={measure}
                selectedKey={facilityRows === null ? null : selectedKey}
                onSelect={toggleSelected}
              />
              {facilityRows !== null && (
                <FacilityTable key={`${breakdown}:${selectedKey}`} rows={facilityRows} />
              )}
            </div>
          )}
        </ResultsPanel>
      </main>
    </div>
  )
}
