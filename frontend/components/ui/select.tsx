'use client'

import * as React from 'react'
import * as SelectPrimitives from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const Select = SelectPrimitives.Root
const SelectGroup = SelectPrimitives.Group
const SelectValue = SelectPrimitives.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitives.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitives.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitives.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitives.Icon asChild>
      <ChevronDown size={14} className="text-zinc-500" />
    </SelectPrimitives.Icon>
  </SelectPrimitives.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitives.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitives.Portal>
    <SelectPrimitives.Content
      ref={ref}
      className={cn(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-zinc-700 bg-zinc-800 text-zinc-200 shadow-md animate-in fade-in-0 zoom-in-95',
        position === 'popper' && 'translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitives.Viewport className="p-1">{children}</SelectPrimitives.Viewport>
    </SelectPrimitives.Content>
  </SelectPrimitives.Portal>
))
SelectContent.displayName = 'SelectContent'

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitives.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitives.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitives.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-zinc-700 focus:text-zinc-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitives.ItemIndicator>
        <Check size={14} />
      </SelectPrimitives.ItemIndicator>
    </span>
    <SelectPrimitives.ItemText>{children}</SelectPrimitives.ItemText>
  </SelectPrimitives.Item>
))
SelectItem.displayName = 'SelectItem'

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem }
