/**
 * Owns the one fetch of live facility data.
 *
 * DATA_GUIDE.md calls for fetching once and deriving every view from the parsed
 * result, so this is the single place the request is made; later stages derive
 * scope, groups and totals from `facilities` rather than refetching.
 */

import { useCallback, useEffect, useState } from 'react'
import { fetchFacilities } from '@/data/facilities-client'
import type { Facility } from '@/data/types'

export type FacilitiesState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly facilities: readonly Facility[] }
  | { readonly status: 'error'; readonly message: string }

type Settled = Exclude<FacilitiesState, { status: 'loading' }>

export interface UseFacilities {
  readonly state: FacilitiesState
  readonly reload: () => void
}

export function useFacilities(): UseFacilities {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<{ attempt: number; value: Settled } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchFacilities(controller.signal)
      .then((facilities) => {
        if (controller.signal.aborted) return
        setSettled({ attempt, value: { status: 'ready', facilities } })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setSettled({
          attempt,
          value: {
            status: 'error',
            message: cause instanceof Error ? cause.message : 'Could not load facilities.',
          },
        })
      })

    return () => {
      controller.abort()
    }
  }, [attempt])

  // Loading is derived rather than stored, so a reload cannot leave a stale
  // result on screen and no state is set synchronously inside the effect.
  const state: FacilitiesState =
    settled !== null && settled.attempt === attempt ? settled.value : { status: 'loading' }

  const reload = useCallback(() => {
    setAttempt((n) => n + 1)
  }, [])

  return { state, reload }
}
