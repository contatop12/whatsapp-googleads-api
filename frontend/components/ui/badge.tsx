import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-none px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border-2',
  {
    variants: {
      variant: {
        default: 'border-emerald-500 bg-emerald-500/15 text-emerald-400',
        secondary: 'border-zinc-600 bg-zinc-800 text-zinc-300',
        outline: 'border-zinc-600 bg-transparent text-zinc-400',
        destructive: 'border-red-500 bg-red-500/15 text-red-400',
        amber: 'border-amber-400 bg-amber-400/15 text-amber-400',
        blue: 'border-blue-500 bg-blue-500/15 text-blue-400',
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
