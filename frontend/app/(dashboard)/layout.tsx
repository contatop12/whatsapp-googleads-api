import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LayoutGrid, BarChart3, Settings, LogOut, MessageCircle, Globe, Zap } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)] shrink-0">
              <Zap size={13} className="text-zinc-950" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-100 leading-none">WA → Ads</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Pipeline</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="px-2 pt-2 pb-1 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
            Principal
          </p>
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
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-2 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors group"
    >
      <span className="text-zinc-600 group-hover:text-emerald-500 transition-colors">
        {icon}
      </span>
      {label}
    </Link>
  )
}
