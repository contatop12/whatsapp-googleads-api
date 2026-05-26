'use client'

import * as React from 'react'
import * as TooltipPrimitives from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitives.Provider
const Tooltip = TooltipPrimitives.Root
const TooltipTrigger = TooltipPrimitives.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitives.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitives.Portal>
    <TooltipPrimitives.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </TooltipPrimitives.Portal>
))
TooltipContent.displayName = 'TooltipContent'

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
