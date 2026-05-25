import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LayoutGrid, BarChart3, Settings, LogOut, MessageCircle, Globe } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className="w-56 bg-white border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h1 className="font-semibold text-sm text-slate-900">WA → Google Ads</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem href="/pipeline" icon={<LayoutGrid size={16} />} label="Pipeline" />
          <NavItem href="/reports" icon={<BarChart3 size={16} />} label="Relatórios" />
          <NavItem href="/settings/whatsapp" icon={<MessageCircle size={16} />} label="WhatsApp" />
          <NavItem href="/settings/google-ads" icon={<Settings size={16} />} label="Google Ads" />
          <NavItem href="/settings/keywords" icon={<Settings size={16} />} label="Palavras-chave" />
          <NavItem href="/settings/sites" icon={<Globe size={16} />} label="Sites permitidos" />
        </nav>
        <form action="/api/auth/signout" method="post" className="p-3 border-t">
          <button
            type="submit"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 w-full"
          >
            <LogOut size={16} /> Sair
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
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
      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md"
    >
      {icon}
      {label}
    </Link>
  )
}
