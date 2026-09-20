import { Button } from '@/components/ui/button'
import { useFacilities } from '@/app/use-facilities'
import type { Facility } from '@/data/types'
import { DEFAULT_SCOPE, applyScope } from '@/domain/scope'
import { totalsForScope } from '@/domain/summary'

/**
 * Placeholder shell for the live-data stage. It renders only enough to exercise
 * the full request path — loading, error and success. Scope controls and the
 * grouped results arrive in the next stage; see BUILD_LOG.md.
 */
function App() {
  const { state, reload } = useFacilities()

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start gap-4 p-10">
      <h1 className="text-2xl font-semibold tracking-tight">RenewMaplet</h1>

      {state.status === 'loading' && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading facilities…
        </p>
      )}

      {state.status === 'error' && (
        <div
          role="alert"
          className="w-full rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p className="font-medium">Could not load facilities.</p>
          <p className="mt-1 text-muted-foreground">{state.message}</p>
        </div>
      )}

      {state.status === 'ready' && <ScopeTotals facilities={state.facilities} />}

      <Button variant="outline" size="sm" onClick={reload} disabled={state.status === 'loading'}>
        Reload
      </Button>
    </main>
  )
}

/** Proof the parsed data reached the UI, not the product summary. */
function ScopeTotals({ facilities }: { facilities: readonly Facility[] }) {
  const totals = totalsForScope(applyScope(facilities, DEFAULT_SCOPE))

  return (
    <p className="w-full rounded-lg border border-border bg-surface p-4 text-sm">
      {totals.facilityCount.toLocaleString()} facilities ·{' '}
      {totals.registeredMw.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW
    </p>
  )
}

export default App
