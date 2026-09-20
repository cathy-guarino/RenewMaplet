import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Loading, error and empty presentations.
 *
 * Loading and error centre themselves in whatever region they are given; on
 * first load that is the whole body, matching reference/07 and /08, where no
 * scope panel is shown because there is nothing yet to scope.
 */

export function LoadingState() {
  return (
    <div role="status" className="flex h-full items-center justify-center gap-2.5">
      <LoaderCircle aria-hidden className="size-4 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Loading facilities…</span>
    </div>
  )
}

export function ErrorState({ detail, onRetry }: { detail?: string; onRetry: () => void }) {
  return (
    <div className="flex h-full justify-center pt-14">
      <div
        role="alert"
        // Bordered, not floating: no shadow, and the radius stays modest.
        className="h-fit w-full max-w-xl rounded-xl border border-border bg-surface p-6"
      >
        <h2 className="text-title font-semibold">We couldn’t load the facilities</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {detail ?? 'The data source did not respond. Please retry.'}
        </p>
        <Button onClick={onRetry} className="mt-5">
          Retry connection
        </Button>
      </div>
    </div>
  )
}

export function EmptyState() {
  return (
    <div className="flex h-full items-start justify-center pt-24">
      <p className="text-sm text-muted-foreground">No facilities match this scope.</p>
    </div>
  )
}
