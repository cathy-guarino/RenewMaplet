import {
  Ban,
  Battery,
  Clock,
  Droplet,
  Factory,
  Flame,
  LoaderCircle,
  MapPin,
  Sun,
  Wind,
  Zap,
} from 'lucide-react'
import type { Technology, UnitStatus } from '@/data/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TECHNOLOGY_LABELS, UNIT_STATUS_LABELS } from '@/data/types'

/**
 * Row indicators. Technology and status share one tile — 24px, `rounded-sm`, a
 * 14px glyph — so they read as one family. They differ only in contrast:
 * technology is a solid coloured fill with a white glyph; status is the mirror,
 * a light coloured background with a dark coloured glyph.
 */

const TECHNOLOGY_ICON: Record<Technology, typeof Zap> = {
  battery: Battery,
  coal: Factory,
  distillate: Droplet,
  gas: Flame,
  wind: Wind,
  solar: Sun,
  other: Zap,
}

/** Tailwind cannot build class names at runtime, so these are spelled out. */
const TECHNOLOGY_FILL: Record<Technology, string> = {
  battery: 'bg-technology-battery',
  coal: 'bg-technology-coal',
  distillate: 'bg-technology-distillate',
  gas: 'bg-technology-gas',
  wind: 'bg-technology-wind',
  solar: 'bg-technology-solar',
  other: 'bg-technology-other',
}

/**
 * `labelled` says whether the row already names the technology. When it does
 * not, the square carries a tooltip instead — the guide asks for one only on
 * unlabelled indicators.
 */
export function TechnologyIndicator({
  technology,
  labelled = true,
}: {
  technology: Technology
  labelled?: boolean
}) {
  const Icon = TECHNOLOGY_ICON[technology]
  const label = TECHNOLOGY_LABELS[technology]

  // 24px square, 4px corner, 14px white glyph — measured off the reference.
  const square = (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-sm text-white ${TECHNOLOGY_FILL[technology]}`}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2} />
    </span>
  )

  if (labelled) return square

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{square}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const STATUS_TINT: Record<UnitStatus, string> = {
  operating: 'bg-status-operating-surface text-status-operating',
  committed: 'bg-status-committed-surface text-status-committed',
  commissioning: 'bg-status-commissioning-surface text-status-commissioning',
  retired: 'bg-status-retired-surface text-status-retired',
  unknown: 'bg-status-unknown-surface text-status-unknown',
}

export function StatusIndicator({
  status,
  labelled = true,
}: {
  status: UnitStatus
  labelled?: boolean
}) {
  // Same tile as TechnologyIndicator; only the fill is inverted.
  const tile = (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-sm ${STATUS_TINT[status]}`}
    >
      <StatusSymbol status={status} />
    </span>
  )

  if (labelled) return tile

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{tile}</span>
      </TooltipTrigger>
      <TooltipContent>{UNIT_STATUS_LABELS[status]}</TooltipContent>
    </Tooltip>
  )
}

// Glyphs match the technology icons at 14px / stroke 2. Operating keeps the
// reference's filled dot (BEHAVIOUR_GUIDE.md), sized to sit with the glyphs.
function StatusSymbol({ status }: { status: UnitStatus }) {
  switch (status) {
    case 'operating':
      return <span aria-hidden className="size-2 rounded-full bg-current" />
    case 'committed':
      return <Clock aria-hidden className="size-3.5" strokeWidth={2} />
    case 'commissioning':
      return <LoaderCircle aria-hidden className="size-3.5" strokeWidth={2} />
    case 'retired':
      return <Ban aria-hidden className="size-3.5" strokeWidth={2} />
    case 'unknown':
      return <span aria-hidden className="size-2 rounded-full bg-current opacity-60" />
  }
}

/**
 * Neutral by design — a state carries no colour meaning (BEHAVIOUR_GUIDE.md).
 * Decorative, because the row always spells the state out beside it.
 */
export function StateIndicator() {
  return (
    <span
      aria-hidden
      className="flex size-[22px] shrink-0 items-center justify-center text-muted-foreground"
    >
      <MapPin className="size-4" strokeWidth={1.75} />
    </span>
  )
}
