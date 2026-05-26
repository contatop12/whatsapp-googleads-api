'use client'

import * as React from 'react'
import * as AvatarPrimitives from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitives.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitives.Root
    ref={ref}
    className={cn('relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
))
Avatar.displayName = 'Avatar'

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitives.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitives.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitives.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent',
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarFallback }
