import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Placeholder shell. This only proves the foundation wiring — Tailwind tokens,
 * Geist Sans, shadcn primitives and the Worker proxy. Product UI arrives in a
 * later stage; see BUILD_LOG.md.
 */
function App() {
  const [message, setMessage] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let abort = false

    fetch('/api/message').then(async (res) => {
      if (!res.ok) return
      const body = (await res.json()) as { message: string }
      if (abort) return
      setMessage(body.message)
    })

    return () => {
      abort = true
    }
  }, [attempt])

  const reload = useCallback(() => {
    setMessage(null)
    setAttempt((n) => n + 1)
  }, [])

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start gap-4 p-10">
      <h1 className="text-2xl font-semibold tracking-tight">RenewMaplet</h1>
      <p className="text-sm text-muted-foreground">
        Foundation stage. The starter still runs; the explorer is not built yet.
      </p>
      <div className="w-full rounded-lg border border-border bg-surface p-4 text-sm">
        {message ?? '🌀🌀🌀'}
      </div>
      <Button variant="outline" size="sm" onClick={reload}>
        Reload message
      </Button>
    </main>
  )
}

export default App
