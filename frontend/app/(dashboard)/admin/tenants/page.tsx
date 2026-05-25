import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/tenant'
import Link from 'next/link'
import { ArrowRight, Plus, Building2 } from 'lucide-react'

export default async function AdminTenantsPage() {
  const { profile } = await getUserProfile()
  if (profile?.role !== 'super_admin') redirect('/pipeline')

  const supabase = createClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, evolution_instance_status, created_at')
    .order('created_at', { ascending: false })

  const { data: leads } = await supabase.from('leads').select('tenant_id, stage')
  const { data: users } = await supabase.from('users').select('tenant_id, role').neq('role', 'super_admin')

  const STATUS_COLORS = {
    connected: 'bg-emerald-500',
    connecting: 'bg-amber-500',
    disconnected: 'bg-zinc-600',
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Admin
          </Link>
          <h1 className="text-lg font-bold text-zinc-100 mt-1">Clientes</h1>
          <p className="text-xs text-zinc-500">{tenants?.length ?? 0} tenants cadastrados</p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-semibold hover:bg-emerald-400 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
        >
          <Plus size={13} />
          Novo cliente
        </Link>
      </div>

      {(!tenants || tenants.length === 0) ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
          <Building2 size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Nenhum cliente cadastrado.</p>
          <Link href="/admin/tenants/new" className="text-xs text-emerald-500 hover:text-emerald-400 mt-2 inline-block">
            Criar primeiro cliente →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {tenants.map((t) => {
            const tLeads = leads?.filter((l) => l.tenant_id === t.id) ?? []
            const tUsers = users?.filter((u) => u.tenant_id === t.id) ?? []
            const converted = tLeads.filter((l) => l.stage === 3).length
            const waStatus = t.evolution_instance_status as keyof typeof STATUS_COLORS

            return (
              <Link
                key={t.id}
                href={`/admin/tenants/${t.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800 transition-colors group"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-400">
                    {t.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-200">{t.name}</p>
                  <p className="text-xs text-zinc-600 font-mono mt-0.5">/{t.slug}</p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-5 text-xs text-zinc-600 shrink-0">
                  <div className="text-center">
                    <p className="font-mono font-medium text-zinc-300">{tLeads.length}</p>
                    <p>leads</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono font-medium text-emerald-400">{converted}</p>
                    <p>convertidos</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono font-medium text-zinc-300">{tUsers.length}</p>
                    <p>usuários</p>
                  </div>
                </div>

                {/* WA status */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[waStatus] ?? 'bg-zinc-600'}`} />
                  <span className="hidden sm:inline">WhatsApp</span>
                </div>

                <ArrowRight size={13} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
