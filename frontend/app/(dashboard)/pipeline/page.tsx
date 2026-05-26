import Link from 'next/link'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { getServerApi } from '@/lib/api-server'
import { getUserProfile, resolveTenantId } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { TenantSelector } from './tenant-selector'

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: { tenant?: string }
}) {
  const { profile } = await getUserProfile()
  const isSuperAdmin = profile?.role === 'super_admin'

  const tenantId = await resolveTenantId(profile, searchParams.tenant)

  // Super admin gets list of all tenants for selector
  let tenants: { id: string; name: string }[] = []
  if (isSuperAdmin) {
    const supabase = createClient()
    const { data } = await supabase.from('tenants').select('id, name').order('name')
    tenants = data ?? []
  }

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <p className="text-zinc-400 text-sm">Nenhum tenant configurado.</p>
          {isSuperAdmin ? (
            <Link
              href="/admin/tenants/new"
              className="inline-block text-xs px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Criar primeiro tenant →
            </Link>
          ) : (
            <p className="text-zinc-600 text-xs">Contate o administrador.</p>
          )}
        </div>
      </div>
    )
  }

  const serverApi = await getServerApi()
  const leads = await serverApi.leads.list(tenantId).catch(() => [])

  const stage1 = leads.filter((l) => l.stage === 1).length
  const stage2 = leads.filter((l) => l.stage === 2).length
  const stage3 = leads.filter((l) => l.stage === 3).length

  const currentTenant = tenants.find((t) => t.id === tenantId)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-zinc-100">Pipeline</h1>
            {isSuperAdmin && currentTenant && (
              <span className="text-xs px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 font-medium">
                {currentTenant.name}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{leads.length} leads no total</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Tenant selector for super admin */}
          {isSuperAdmin && tenants.length > 0 && (
            <TenantSelector tenants={tenants} currentTenantId={tenantId} />
          )}

          {/* Stage counters */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-600">
            <span><span className="text-amber-400 font-mono font-medium">{stage1}</span> novos</span>
            <span><span className="text-blue-400 font-mono font-medium">{stage2}</span> qualificados</span>
            <span><span className="text-emerald-400 font-mono font-medium">{stage3}</span> convertidos</span>
          </div>
        </div>
      </div>

      <KanbanBoard initialLeads={leads} />
    </div>
  )
}
