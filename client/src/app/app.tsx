import { AppHeader } from '@/components/app-header'
import { ResultsPanel } from '@/components/results-panel'
import { EmptyState, ErrorState, LoadingState } from '@/components/results-states'
import { ScopePanel } from '@/components/scope-panel'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useFacilities } from '@/app/use-facilities'
import type { Facility } from '@/data/types'
import { DEFAULT_SCOPE, applyScope } from '@/domain/scope'
import { totalsForScope } from '@/domain/summary'

/**
 * Application shell.
 *
 * Panels are flush and separated by full-height dividers, and each scrolls
 * independently on desktop. Below `md` they stack, the scope fields fall into
 * two columns, and the page scrolls as one (reference/09-narrow-layout.png).
 *
 * Loading and error replace the whole body rather than sitting beside an empty
 * scope panel: on first load there is nothing to scope yet, which is what
 * reference/07 and /08 show. Empty is different — data arrived but the scope
 * matched nothing — so it stays inside the results region with the scope panel
 * present, per BEHAVIOUR_GUIDE.md.
 */
export function App() {
  const { state, reload } = useFacilities()

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col">
        <AppHeader onReset={reload} />

        {state.status === 'loading' && (
          <div className="min-h-0 flex-1">
            <LoadingState />
          </div>
        )}

        {state.status === 'error' && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ErrorState detail={state.message} onRetry={reload} />
          </div>
        )}

        {state.status === 'ready' && <Explorer facilities={state.facilities} />}
      </div>
    </TooltipProvider>
  )
}

function Explorer({ facilities }: { facilities: readonly Facility[] }) {
  const scoped = applyScope(facilities, DEFAULT_SCOPE)
  const totals = totalsForScope(scoped)

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b border-border bg-scope md:h-full md:w-scope-panel md:overflow-y-auto md:border-r md:border-b-0">
        <ScopePanel />
      </aside>

      <main className="min-h-0 min-w-0 flex-1 md:h-full md:overflow-y-auto">
        <ResultsPanel
          title="Facilities by technology"
          totals={`${totals.facilityCount.toLocaleString()} facilities · ${totals.registeredMw.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW`}
        >
          {totals.facilityCount === 0 ? <EmptyState /> : <ResultsPlaceholder />}
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
