'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { WhatsAppStatusBadge } from './WhatsAppStatusBadge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Home,
  LayoutGrid,
  BarChart3,
  Settings,
  MessageCircle,
  Globe,
  Zap,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  Users,
} from 'lucide-react'

const STORAGE_KEY = 'sidebar_collapsed'

const integrationPaths = [
  '/settings/whatsapp',
  '/settings/google-ads',
  '/settings/keywords',
  '/settings/sites',
]

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  client: 'Cliente',
}

const roleBadgeColor: Record<string, string> = {
  super_admin: 'border-amber-400 text-amber-400',
  admin: 'border-[#E8192C] text-[#E8192C]',
  client: 'border-emerald-400 text-emerald-400',
}

function initials(name: string | null, email: string) {
  if (name) return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return email[0].toUpperCase()
}

export function Sidebar() {
  const { user } = useAuth()
  const perms = usePermissions()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'true') setCollapsed(true)
  }, [])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  const isSettingsActive = () =>
    pathname.startsWith('/settings') && !integrationPaths.some((p) => pathname.startsWith(p))

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'hidden md:flex flex-col bg-zinc-950 border-r-2 border-zinc-700 shrink-0 transition-all duration-200 halftone',
          collapsed ? 'w-12' : 'w-56'
        )}
      >
        {/* Logo + toggle */}
        <div
          className={cn(
            'flex items-center h-14 border-b-2 border-zinc-700',
            collapsed ? 'justify-center' : 'px-4 justify-between'
          )}
        >
          {!collapsed && (
            <Link href="/home" className="hover:opacity-80 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-gzapi.png" alt="GZAPI" className="h-6 w-auto" />
            </Link>
          )}
          <button
            onClick={toggle}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition-colors"
            aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          <SectionLabel label="Principal" collapsed={collapsed} />

          <NavItem href="/home" icon={<Home size={15} />} label="Home" collapsed={collapsed} active={isActive('/home', true)} />
          {perms.canAccessAdminPanel && (
            <NavItem href="/admin" icon={<Shield size={15} />} label="Painel Admin" collapsed={collapsed} active={isActive('/admin')} accent="amber" />
          )}
          <NavItem href="/pipeline" icon={<LayoutGrid size={15} />} label="Pipeline" collapsed={collapsed} active={isActive('/pipeline')} />

          <SectionLabel label="Clientes" collapsed={collapsed} top />
          {perms.canManageTenants && (
            <NavItem href="/admin/tenants" icon={<Building2 size={15} />} label="Clientes" collapsed={collapsed} active={isActive('/admin/tenants')} />
          )}
          <NavItem
            href="/settings/whatsapp"
            icon={<MessageCircle size={15} />}
            label="WhatsApp"
            collapsed={collapsed}
            active={isActive('/settings/whatsapp')}
            badge={user.tenant_id ? <WhatsAppStatusBadge tenantId={user.tenant_id} /> : undefined}
          />
          <NavItem href="/settings/google-ads" icon={<Settings size={15} />} label="Google Ads" collapsed={collapsed} active={isActive('/settings/google-ads')} />
          <NavItem href="/settings/keywords" icon={<Zap size={15} />} label="Palavras-chave" collapsed={collapsed} active={isActive('/settings/keywords')} />
          <NavItem href="/settings/sites" icon={<Globe size={15} />} label="Sites permitidos" collapsed={collapsed} active={isActive('/settings/sites')} />

          <SectionLabel label="Análise" collapsed={collapsed} top />
          <NavItem href="/reports" icon={<BarChart3 size={15} />} label="Relatórios" collapsed={collapsed} active={isActive('/reports')} />

          <SectionLabel label="Conta" collapsed={collapsed} top />
          <NavItem
            href="/settings/profile"
            icon={<Users size={15} />}
            label="Configurações"
            collapsed={collapsed}
            active={isSettingsActive()}
          />
        </nav>

        {/* Footer */}
        <div className="border-t-2 border-zinc-700 p-2 space-y-1">
          {!collapsed ? (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-7 h-7 bg-[#E8192C] flex items-center justify-center text-[10px] font-black text-white shrink-0 border-2 border-black shadow-comic">
                {initials(user.name, user.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-200 truncate font-semibold">{user.name ?? user.email}</p>
                <span className={cn('text-[9px] px-1.5 py-0.5 border font-black uppercase tracking-wider', roleBadgeColor[user.role] ?? 'text-zinc-500')}>
                  {roleLabel[user.role]}
                </span>
              </div>
            </div>
          ) : (
            <NavItemTooltip label={user.name ?? user.email}>
              <div className="flex justify-center py-1">
                <div className="w-7 h-7 bg-[#E8192C] flex items-center justify-center text-[10px] font-black text-white border-2 border-black shadow-comic">
                  {initials(user.name, user.email)}
                </div>
              </div>
            </NavItemTooltip>
          )}

          <form action="/api/auth/signout" method="post">
            {collapsed ? (
              <NavItemTooltip label="Sair">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center p-2 text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <LogOut size={14} />
                </button>
              </NavItemTooltip>
            ) : (
              <button
                type="submit"
                className="flex items-center gap-2 px-2 py-2 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 w-full transition-colors font-black uppercase tracking-wider"
              >
                <LogOut size={13} />
                Sair
              </button>
            )}
          </form>
        </div>
      </aside>
    </TooltipProvider>
  )
}

function SectionLabel({ label, collapsed, top }: { label: string; collapsed: boolean; top?: boolean }) {
  if (collapsed) return <div className={top ? 'h-2' : 'h-1'} />
  return (
    <p className={cn(
      'px-2 pb-1 text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] border-b border-zinc-800',
      top ? 'pt-4' : 'pt-2'
    )}>
      {label}
    </p>
  )
}

function NavItemTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" className="rounded-none border-2 border-zinc-600 bg-zinc-900 text-zinc-100 font-black uppercase text-[10px] tracking-wider shadow-comic">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function NavItem({
  href,
  icon,
  label,
  collapsed,
  active,
  badge,
  accent,
}: {
  href: string
  icon: React.ReactNode
  label: string
  collapsed: boolean
  active: boolean
  badge?: React.ReactNode
  accent?: 'amber'
}) {
  const isAmber = accent === 'amber'

  const activeClass = isAmber
    ? 'border-l-4 border-amber-400 bg-amber-500/15 text-amber-300 pl-[4px]'
    : 'border-l-4 border-[#E8192C] bg-[#E8192C]/10 text-zinc-100 pl-[4px]'

  const inactiveClass = isAmber
    ? 'border-l-4 border-transparent text-amber-500 hover:text-amber-300 hover:bg-amber-500/10 px-2'
    : 'border-l-4 border-transparent text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/80 px-2'

  const iconActiveClass = isAmber ? 'text-amber-400' : 'text-[#E8192C]'
  const iconInactiveClass = isAmber ? 'text-amber-600' : 'text-zinc-600'

  if (collapsed) {
    return (
      <NavItemTooltip label={label}>
        <Link
          href={href}
          className={cn(
            'flex items-center justify-center p-2 transition-colors',
            active
              ? isAmber
                ? 'bg-amber-500/15 text-amber-300'
                : 'bg-[#E8192C]/10 text-[#E8192C]'
              : isAmber
                ? 'text-amber-500 hover:bg-amber-500/10'
                : 'text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200'
          )}
        >
          {icon}
        </Link>
      </NavItemTooltip>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 py-2 text-sm transition-colors font-semibold',
        active ? activeClass : inactiveClass
      )}
    >
      <span className={active ? iconActiveClass : iconInactiveClass}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge && <span className="ml-auto mr-1">{badge}</span>}
    </Link>
  )
}
