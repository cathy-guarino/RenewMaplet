import { Activity, Atom, Calendar, MapPin } from 'lucide-react'
import { ScopeField } from '@/components/scope-field'

const ICON = 'size-4'

/**
 * The scope panel: a visually distinct column on desktop, stacked above the
 * results on narrow viewports where the fields sit in two columns
 * (reference/09-narrow-layout.png).
 *
 * Fields are placeholders at this stage; only the shell is being built.
 */
export function ScopePanel() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-panel-gutter pt-6 md:grid-cols-1">
      <ScopeField label="States" icon={<MapPin className={ICON} />} value="All states" />
      <ScopeField label="Technologies" icon={<Atom className={ICON} />} value="All technologies" />
      <ScopeField label="Lifecycles" icon={<Activity className={ICON} />} value="All lifecycles" />
      <ScopeField label="Commencement" icon={<Calendar className={ICON} />} value="Any date" />
    </div>
  )
}
