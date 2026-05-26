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
  super_admin: 'bg-amber-500/20 text-amber-400',
  admin: 'bg-accent/20 text-[#7F77DD]',
  client: 'bg-emerald-500/20 text-emerald-400',
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
          'hidden md:flex flex-col bg-zinc-900 border-r border-zinc-800 shrink-0 transition-all duration-200',
          collapsed ? 'w-12' : 'w-56'
        )}
      >
        {/* Logo + toggle */}
        <div
          className={cn(
            'flex items-center h-14 border-b border-zinc-800',
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
            className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
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
        <div className="border-t border-zinc-800 p-2 space-y-1">
          {!collapsed ? (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-[#7F77DD] shrink-0">
                {initials(user.name, user.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-200 truncate">{user.name ?? user.email}</p>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', roleBadgeColor[user.role] ?? 'text-zinc-500')}>
                  {roleLabel[user.role]}
                </span>
              </div>
            </div>
          ) : (
            <NavItemTooltip label={user.name ?? user.email}>
              <div className="flex justify-center py-1">
                <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-[#7F77DD]">
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
                  className="w-full flex items-center justify-center p-2 text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <LogOut size={14} />
                </button>
              </NavItemTooltip>
            ) : (
              <button
                type="submit"
                className="flex items-center gap-2 px-2 py-2 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md w-full transition-colors"
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
    <p className={cn('px-2 pb-1 text-[10px] font-medium text-zinc-600 uppercase tracking-widest', top ? 'pt-4' : 'pt-2')}>
      {label}
    </p>
  )
}

function NavItemTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
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
    ? 'border-l-2 border-amber-500 bg-amber-500/10 text-amber-300 pl-[6px]'
    : 'border-l-2 border-[#7F77DD] bg-zinc-800/60 text-zinc-100 pl-[6px]'

  const inactiveClass = isAmber
    ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-2'
    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-2'

  const iconActiveClass = isAmber ? 'text-amber-400' : 'text-[#7F77DD]'
  const iconInactiveClass = isAmber ? 'text-amber-500' : 'text-zinc-600'

  if (collapsed) {
    return (
      <NavItemTooltip label={label}>
        <Link
          href={href}
          className={cn(
            'flex items-center justify-center p-2 rounded-md transition-colors',
            active
              ? isAmber
                ? 'bg-amber-500/10 text-amber-300'
                : 'bg-accent/10 text-[#7F77DD]'
              : isAmber
                ? 'text-amber-400 hover:bg-amber-500/10'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
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
        'flex items-center gap-2.5 py-2 rounded-md text-sm transition-colors',
        active ? activeClass : inactiveClass
      )}
    >
      <span className={active ? iconActiveClass : iconInactiveClass}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge && <span className="ml-auto mr-1">{badge}</span>}
    </Link>
  )
}
