import { Globe, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * The 52px global header: globe, wordmark, and the reset action pinned right
 * (BEHAVIOUR_GUIDE.md, "Page structure").
 */
export function AppHeader({ onReset }: { onReset?: () => void }) {
  return (
    <header className="flex h-header shrink-0 items-center justify-between gap-4 bg-header pr-6 pl-5 text-header-foreground">
      <div className="flex items-center gap-2.5">
        <Globe aria-hidden className="size-[18px]" strokeWidth={1.75} />
        <span className="text-brand font-semibold">RenewMaplet</span>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            // The header is dark, so the ghost variant's light-mode hover
            // tokens would disappear; these are the header's own surfaces.
            className="size-8 text-header-foreground/70 hover:bg-white/10 hover:text-header-foreground"
          >
            <RotateCcw className="size-4" strokeWidth={1.75} />
            <span className="sr-only">Reset all filters</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Reset all filters</TooltipContent>
      </Tooltip>
    </header>
  )
}
