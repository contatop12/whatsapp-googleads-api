import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-none border-2 border-zinc-600 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:border-[#E8192C] transition-colors font-medium',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
