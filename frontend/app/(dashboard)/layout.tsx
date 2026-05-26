import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/tenant'
import { LayoutGrid, BarChart3, Settings, LogOut, MessageCircle, Globe, Zap, Shield, Home } from 'lucide-react'
import { GZapiLogo } from '@/components/gzapi-logo'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { profile } = await getUserProfile()
  const isSuperAdmin = profile?.role === 'super_admin'

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <GZapiLogo size={28} />
            <div>
              <p className="text-sm font-bold text-zinc-100 leading-none tracking-tight">GZapi</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {isSuperAdmin ? (
                  <span className="text-amber-500">Super Admin</span>
                ) : (
                  'Pipeline'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {/* Super Admin section */}
          {isSuperAdmin && (
            <>
              <p className="px-2 pt-2 pb-1 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
                Super Admin
              </p>
              <NavItem href="/admin" icon={<Shield size={15} />} label="Painel Admin" accent />
            </>
          )}

          <p className="px-2 pt-3 pb-1 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
            Principal
          </p>
          <NavItem href="/" icon={<Home size={15} />} label="Home" />
          <NavItem href="/pipeline" icon={<LayoutGrid size={15} />} label="Pipeline" />
          <NavItem href="/reports" icon={<BarChart3 size={15} />} label="Relatórios" />

          <p className="px-2 pt-4 pb-1 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
            Configurações
          </p>
          <NavItem href="/settings/whatsapp" icon={<MessageCircle size={15} />} label="WhatsApp" />
          <NavItem href="/settings/google-ads" icon={<Settings size={15} />} label="Google Ads" />
          <NavItem href="/settings/keywords" icon={<Zap size={15} />} label="Palavras-chave" />
          <NavItem href="/settings/sites" icon={<Globe size={15} />} label="Sites permitidos" />
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800">
          <p className="px-2 mb-1 text-[10px] text-zinc-600 truncate">{user.email}</p>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2 px-2 py-2 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md w-full transition-colors"
            >
              <LogOut size={13} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-zinc-950">{children}</main>
    </div>
  )
}

function NavItem({
  href,
  icon,
  label,
  accent,
}: {
  href: string
  icon: React.ReactNode
  label: string
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-2 py-2 text-sm rounded-md transition-colors group ${
        accent
          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
      }`}
    >
      <span
        className={`transition-colors ${
          accent ? 'text-amber-500 group-hover:text-amber-400' : 'text-zinc-600 group-hover:text-emerald-500'
        }`}
      >
        {icon}
      </span>
      {label}
    </Link>
  )
}
