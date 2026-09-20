import { useImperativeHandle, type Ref } from 'react'
import { ResultsPanel } from '@/components/results-panel'
import { EmptyState } from '@/components/results-states'
import { ScopePanel } from '@/components/scope-panel'
import type { Facility } from '@/data/types'
import { applyScope } from '@/domain/scope'
import { totalsForScope } from '@/domain/summary'
import { useScope } from '@/app/use-scope'

/** Lets the global header drive this feature without owning its state. */
export interface FacilityExplorerHandle {
  reset: () => void
}

/**
 * Owns the scope and derives everything downstream from it.
 *
 * `applyScope` and the totals run on every render rather than behind a
 * `useMemo`. Measured over the full live feed (625 facilities, 892 units) they
 * cost 0.26 ms combined, against 13–16 ms for the surrounding React and popover
 * work — so memoising here would buy nothing. DATA_GUIDE.md asks for
 * memoisation only where the cost has actually been measured.
 */
export function FacilityExplorer({
  facilities,
  ref,
}: {
  facilities: readonly Facility[]
  ref?: Ref<FacilityExplorerHandle>
}) {
  const { scope, options, presets, presetId, setScope, setCommencementPreset, reset } =
    useScope(facilities)

  useImperativeHandle(ref, () => ({ reset }), [reset])

  const scoped = applyScope(facilities, scope)
  const totals = totalsForScope(scoped)

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b border-border bg-scope md:h-full md:w-scope-panel md:overflow-y-auto md:border-r md:border-b-0">
        <ScopePanel
          scope={scope}
          options={options}
          presets={presets}
          presetId={presetId}
          onChange={setScope}
          onCommencementChange={setCommencementPreset}
        />
      </aside>

      <main className="min-h-0 min-w-0 flex-1 md:h-full md:overflow-y-auto">
        <ResultsPanel
          title="Facilities by technology"
          totals={`${totals.facilityCount.toLocaleString()} facilities · ${totals.registeredMw.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW`}
        >
          {scoped.length === 0 ? <EmptyState onClear={reset} /> : <ResultsPlaceholder />}
        </ResultsPanel>
      </main>
    </div>
  )
}

/** Structural stand-in for the grouped results, which arrive next stage. */
function ResultsPlaceholder() {
  return (
    <div className="px-main-gutter py-4 text-label text-muted-foreground">
      Grouped results appear here.
    </div>
  )
}
