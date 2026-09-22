/**
 * Scope state for the facility explorer.
 *
 * The scope is the only thing stored. Options, the active preset and every
 * filtered collection are derived from it and the loaded facilities, so there
 * is no second copy of the results to keep in step (ARCHITECTURE_GUIDE.md).
 */

import { useCallback, useMemo, useState } from 'react'
import type { Facility } from '@/data/types'
import { DEFAULT_SCOPE, type Scope } from '@/domain/scope'
import {
  ANY_DATE_PRESET_ID,
  availableScopeOptions,
  commencementPresets,
  type CommencementPreset,
  type ScopeOptions,
} from '@/domain/scope-options'

export interface UseScope {
  readonly scope: Scope
  readonly options: ScopeOptions
  readonly presets: readonly CommencementPreset[]
  /** Which commencement preset is active; the scope itself stores the range. */
  readonly presetId: string
  readonly setScope: (patch: Partial<Scope>) => void
  readonly setCommencementPreset: (presetId: string) => void
  readonly reset: () => void
}

export function useScope(facilities: readonly Facility[], now: Date = new Date()): UseScope {
  const [scope, setScopeState] = useState<Scope>(DEFAULT_SCOPE)
  const [presetId, setPresetId] = useState<string>(ANY_DATE_PRESET_ID)

  // Derived from the fetched data, which only changes on reload.
  const options = useMemo(() => availableScopeOptions(facilities), [facilities])
  const presets = useMemo(() => commencementPresets(now.getFullYear()), [now])

  const setScope = useCallback((patch: Partial<Scope>) => {
    setScopeState((current) => ({ ...current, ...patch }))
  }, [])

  const setCommencementPreset = useCallback(
    (nextId: string) => {
      const preset = presets.find((p) => p.id === nextId)
      if (!preset) return
      setPresetId(nextId)
      setScopeState((current) => ({ ...current, commencement: preset.filter }))
    },
    [presets],
  )

  const reset = useCallback(() => {
    setScopeState(DEFAULT_SCOPE)
    setPresetId(ANY_DATE_PRESET_ID)
  }, [])

  return {
    scope,
    options,
    presets,
    presetId,
    setScope,
    setCommencementPreset,
    reset,
  }
}
