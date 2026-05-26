'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { User, Lock, Bell, Building2, Users, Trash2 } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  Icon: React.ElementType
  section: 'Conta' | 'Sistema' | 'Perigo'
  adminOnly: boolean
}

const items: NavItem[] = [
  { href: '/settings/profile',       label: 'Perfil',         Icon: User,      section: 'Conta',    adminOnly: false },
  { href: '/settings/password',      label: 'Senha',          Icon: Lock,      section: 'Conta',    adminOnly: false },
  { href: '/settings/notifications', label: 'Notificações',   Icon: Bell,      section: 'Conta',    adminOnly: false },
  { href: '/settings/organization',  label: 'Organização',    Icon: Building2, section: 'Sistema',  adminOnly: true  },
  { href: '/settings/users',         label: 'Usuários',       Icon: Users,     section: 'Sistema',  adminOnly: true  },
  { href: '/settings/delete',        label: 'Deletar conta',  Icon: Trash2,    section: 'Perigo',   adminOnly: false },
]

export function SettingsNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { canManageUsers } = usePermissions()

  const visible = items.filter((i) => !i.adminOnly || canManageUsers)
  const sections = ['Conta', 'Sistema', 'Perigo'] as const

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-52 shrink-0 border-r border-zinc-800 p-3">
        {sections.map((section) => {
          const sectionItems = visible.filter((i) => i.section === section)
          if (!sectionItems.length) return null

          return (
            <div key={section} className="mb-4">
              <p className="px-2 pb-1 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
                {section}
              </p>
              {sectionItems.map(({ href, label, Icon }) => {
                const active = pathname === href
                const isDanger = section === 'Perigo'

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 py-2 rounded-md text-sm transition-colors',
                      active
                        ? isDanger
                          ? 'border-l-2 border-red-500 bg-red-500/10 text-red-400 pl-[6px]'
                          : 'border-l-2 border-[#7F77DD] bg-zinc-800/60 text-zinc-100 pl-[6px]'
                        : isDanger
                          ? 'px-2 text-red-500/70 hover:text-red-400 hover:bg-red-500/10'
                          : 'px-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    )}
                  >
                    <Icon
                      size={14}
                      className={
                        active
                          ? isDanger ? 'text-red-400' : 'text-[#7F77DD]'
                          : isDanger ? 'text-red-500/50' : 'text-zinc-600'
                      }
                    />
                    {label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </aside>

      {/* Mobile select */}
      <div className="md:hidden px-4 pt-4 pb-2 border-b border-zinc-800">
        <select
          value={pathname}
          onChange={(e) => router.push(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-2"
        >
          {visible.map(({ href, label, section }) => (
            <option key={href} value={href}>
              {section}: {label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
