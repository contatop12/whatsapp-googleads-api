'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Home,
  LayoutGrid,
  Settings,
  MoreHorizontal,
  MessageCircle,
  Globe,
  Zap,
  BarChart3,
  Shield,
} from 'lucide-react'

const integrationPaths = [
  '/settings/whatsapp',
  '/settings/google-ads',
  '/settings/keywords',
  '/settings/sites',
]

export function BottomNav() {
  const pathname = usePathname()
  const perms = usePermissions()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const isSettingsActive = () =>
    pathname.startsWith('/settings') && !integrationPaths.some((p) => pathname.startsWith(p))

  return (
    <>
      <nav className="flex md:hidden fixed bottom-0 inset-x-0 bg-zinc-900 border-t border-zinc-800 z-50">
        <BottomItem href="/home" icon={<Home size={20} />} label="Home" active={isActive('/home')} />
        <BottomItem href="/pipeline" icon={<LayoutGrid size={20} />} label="Pipeline" active={isActive('/pipeline')} />
        <BottomItem href="/settings/profile" icon={<Settings size={20} />} label="Config" active={isSettingsActive()} />
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-2 gap-1 transition-colors',
            open ? 'text-[#7F77DD]' : 'text-zinc-500 hover:text-zinc-200'
          )}
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px]">Mais</span>
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="bg-zinc-900 border-t border-zinc-800 rounded-t-xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-sm text-zinc-300">Mais opções</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2">
            {perms.canAccessAdminPanel && (
              <SheetItem href="/admin" icon={<Shield size={18} />} label="Painel Admin" onClose={() => setOpen(false)} />
            )}
            <SheetItem href="/settings/whatsapp" icon={<MessageCircle size={18} />} label="WhatsApp" onClose={() => setOpen(false)} />
            <SheetItem href="/settings/google-ads" icon={<Settings size={18} />} label="Google Ads" onClose={() => setOpen(false)} />
            <SheetItem href="/settings/keywords" icon={<Zap size={18} />} label="Keywords" onClose={() => setOpen(false)} />
            <SheetItem href="/settings/sites" icon={<Globe size={18} />} label="Sites" onClose={() => setOpen(false)} />
            <SheetItem href="/reports" icon={<BarChart3 size={18} />} label="Relatórios" onClose={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function BottomItem({
  href,
  icon,
  label,
  active,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center flex-1 py-2 gap-1 transition-colors',
        active ? 'text-[#7F77DD]' : 'text-zinc-500 hover:text-zinc-200'
      )}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </Link>
  )
}

function SheetItem({
  href,
  icon,
  label,
  onClose,
}: {
  href: string
  icon: React.ReactNode
  label: string
  onClose: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Link>
  )
}
