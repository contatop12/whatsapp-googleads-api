import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/tenant'
import Link from 'next/link'
import { Users, Building2, LayoutGrid, ArrowRight, UserPlus } from 'lucide-react'

export default async function AdminPage() {
  const { profile } = await getUserProfile()
  if (profile?.role !== 'super_admin') redirect('/pipeline')

  const supabase = createClient()

  const [{ data: tenants }, { data: users }, { data: leads }] = await Promise.all([
    supabase.from('tenants').select('id, name, slug, created_at'),
    supabase.from('users').select('id, name, role, tenant_id, created_at'),
    supabase.from('leads').select('id, tenant_id, stage'),
  ])

  const tenantCount = tenants?.length ?? 0
  const userCount = users?.length ?? 0
  const leadCount = leads?.length ?? 0
  const convertedCount = leads?.filter((l) => l.stage === 3).length ?? 0

  return (
    <div className="p-6 max-w-5xl space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium">
            Super Admin
          </span>
        </div>
        <h1 className="text-xl font-bold text-zinc-100">Painel de Administração</h1>
        <p className="text-xs text-zinc-500 mt-1">Gerencie clientes, usuários e permissões.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Clientes" value={tenantCount} icon={<Building2 size={16} />} color="blue" />
        <StatCard label="Usuários" value={userCount} icon={<Users size={16} />} color="emerald" />
        <StatCard label="Leads totais" value={leadCount} icon={<LayoutGrid size={16} />} color="amber" />
        <StatCard label="Convertidos" value={convertedCount} icon={<LayoutGrid size={16} />} color="emerald" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ActionCard
          href="/admin/tenants"
          title="Clientes (Tenants)"
          description={`${tenantCount} clientes cadastrados`}
          icon={<Building2 size={18} className="text-blue-400" />}
          cta="Ver todos"
        />
        <ActionCard
          href="/admin/tenants/new"
          title="Novo Cliente"
          description="Cria um tenant e pipeline dedicado"
          icon={<Building2 size={18} className="text-emerald-400" />}
          cta="Criar agora"
          accent
        />
        <ActionCard
          href="/admin/users"
          title="Usuários"
          description={`${userCount} usuários — gerencie roles e acesso`}
          icon={<Users size={18} className="text-amber-400" />}
          cta="Gerenciar"
        />
        <ActionCard
          href="/admin/users/invite"
          title="Convidar Usuário"
          description="Cria conta para cliente acessar o dashboard"
          icon={<UserPlus size={18} className="text-zinc-400" />}
          cta="Convidar"
        />
      </div>

      {/* Recent tenants */}
      {tenants && tenants.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest">Clientes recentes</p>
            <Link href="/admin/tenants" className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
              Ver todos →
            </Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            {tenants.slice(0, 5).map((t) => {
              const tenantLeads = leads?.filter((l) => l.tenant_id === t.id) ?? []
              const tenantUsers = users?.filter((u) => u.tenant_id === t.id) ?? []
              return (
                <Link
                  key={t.id}
                  href={`/admin/tenants/${t.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-400">
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{t.name}</p>
                    <p className="text-xs text-zinc-600 font-mono">{t.slug}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-600 shrink-0">
                    <span>{tenantLeads.length} leads</span>
                    <span>{tenantUsers.length} users</span>
                  </div>
                  <ArrowRight size={13} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: 'blue' | 'emerald' | 'amber'
}) {
  const colors = {
    blue: { icon: 'text-blue-400 bg-blue-500/10 border-blue-500/20', value: 'text-blue-400' },
    emerald: { icon: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', value: 'text-emerald-400' },
    amber: { icon: 'text-amber-400 bg-amber-500/10 border-amber-500/20', value: 'text-amber-400' },
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-zinc-500">{label}</p>
        <span className={`p-1 rounded border text-xs ${colors[color].icon}`}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold font-mono ${colors[color].value}`}>{value}</p>
    </div>
  )
}

function ActionCard({
  href,
  title,
  description,
  icon,
  cta,
  accent,
}: {
  href: string
  title: string
  description: string
  icon: React.ReactNode
  cta: string
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 flex items-center gap-4 transition-all group ${
        accent
          ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10'
          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800'
      }`}
    >
      <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0 flex items-center gap-1">
        {cta} <ArrowRight size={11} />
      </span>
    </Link>
  )
}
