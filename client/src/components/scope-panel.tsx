import { Activity, Atom, Calendar, MapPin } from 'lucide-react'
import {
  GroupedMultiScopeFilter,
  MultiScopeFilter,
  SingleScopeFilter,
} from '@/components/scope-filter'
import { TechnologyIndicator } from '@/components/indicators'
import type { StateCode, Technology, UnitStatus } from '@/data/types'
import {
  technologyGroups,
  type CommencementPreset,
  type ScopeOptions,
} from '@/domain/scope-options'
import type { Scope } from '@/domain/scope'

const ICON = 'size-4'

/**
 * The scope panel: a column on desktop, two stacked rows of paired fields on
 * narrow viewports (reference/09-narrow-layout.png).
 *
 * Presentational — scope state is owned by the facility explorer.
 */
export function ScopePanel({
  scope,
  options,
  presets,
  presetId,
  onChange,
  onCommencementChange,
}: {
  scope: Scope
  options: ScopeOptions
  presets: readonly CommencementPreset[]
  presetId: string
  onChange: (patch: Partial<Scope>) => void
  onCommencementChange: (presetId: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-panel-gutter pt-6 md:grid-cols-1">
      <MultiScopeFilter<StateCode>
        label="States"
        icon={<MapPin className={ICON} />}
        allLabel="All states"
        options={options.states}
        selected={scope.states}
        onChange={(states) => {
          onChange({ states })
        }}
      />

      <GroupedMultiScopeFilter<Technology>
        label="Technologies"
        icon={<Atom className={ICON} />}
        allLabel="All technologies"
        groups={technologyGroups(options.technologies)}
        selected={scope.technologies}
        onChange={(technologies) => {
          onChange({ technologies })
        }}
        renderIcon={(technology) => (
          <TechnologyIndicator technology={technology} labelled={false} />
        )}
      />

      <MultiScopeFilter<UnitStatus>
        label="Unit status"
        icon={<Activity className={ICON} />}
        allLabel="All unit statuses"
        options={options.statuses}
        selected={scope.statuses}
        onChange={(statuses) => {
          onChange({ statuses })
        }}
      />

      <SingleScopeFilter
        label="Commencement"
        icon={<Calendar className={ICON} />}
        options={presets.map((p) => ({ value: p.id, label: p.label }))}
        value={presetId}
        defaultValue={presets[0]?.id ?? ''}
        onChange={onCommencementChange}
      />
    </div>
  )
}
