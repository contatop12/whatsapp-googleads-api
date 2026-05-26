import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-black uppercase tracking-wider transition-all duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8192C]/60 disabled:pointer-events-none disabled:opacity-40 border-2 rounded-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
  {
    variants: {
      variant: {
        default:
          'bg-[#E8192C] text-white border-black shadow-comic hover:bg-[#C41525]',
        outline:
          'bg-transparent text-[#E8192C] border-[#E8192C] shadow-comic-red hover:bg-[#E8192C]/10',
        ghost:
          'border-transparent shadow-none text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700',
        destructive:
          'bg-transparent text-red-400 border-red-500 shadow-comic hover:bg-red-500/10',
        secondary:
          'bg-[#FFD700] text-black border-black shadow-comic hover:bg-[#D4B800]',
        blue:
          'bg-[#1455C0] text-white border-black shadow-comic hover:bg-[#0D3D99]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
