import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border',
  {
    variants: {
      variant: {
        default: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        secondary: 'border-zinc-700 bg-zinc-800 text-zinc-400',
        outline: 'border-zinc-700 bg-transparent text-zinc-400',
        destructive: 'border-red-500/30 bg-red-500/10 text-red-400',
        amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
