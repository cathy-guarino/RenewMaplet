import { useRef } from 'react'
import { AppHeader } from '@/components/app-header'
import { ErrorState, LoadingState } from '@/components/results-states'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FacilityExplorer, type FacilityExplorerHandle } from '@/app/facility-explorer'
import { useFacilities } from '@/app/use-facilities'

/**
 * Application shell.
 *
 * Panels are flush and separated by full-height dividers, and each scrolls
 * independently on desktop. Below `md` they stack, the scope fields fall into
 * two columns, and the page scrolls as one (reference/09-narrow-layout.png).
 *
 * Loading and error replace the whole body rather than sitting beside an empty
 * scope panel: on first load there is nothing to scope yet, which is what
 * reference/07 and /08 show. A no-results scope is different — data arrived but
 * nothing matched — so it stays inside the results region with the shell
 * intact, per BEHAVIOUR_GUIDE.md.
 */
export function App() {
  const { state, reload } = useFacilities()
  const explorer = useRef<FacilityExplorerHandle>(null)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col">
        <AppHeader
          onReset={() => {
            explorer.current?.reset()
          }}
        />

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

        {state.status === 'ready' && (
          <FacilityExplorer ref={explorer} facilities={state.facilities} />
        )}
      </div>
    </TooltipProvider>
  )
}
