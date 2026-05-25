import { KanbanBoard } from '@/components/kanban/kanban-board'
import { getServerApi } from '@/lib/api-server'
import { getUserProfile, resolveTenantId } from '@/lib/tenant'

export default async function PipelinePage() {
  const { profile } = await getUserProfile()
  const tenantId = await resolveTenantId(profile)

  if (!tenantId) {
    return (
      <div className="p-6 text-slate-500">
        Tenant não configurado. Contate o administrador.
      </div>
    )
  }

  const serverApi = await getServerApi()
  const leads = await serverApi.leads.list(tenantId).catch(() => [])

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-0">
        <h1 className="text-xl font-semibold text-slate-900">Pipeline de Leads</h1>
        <p className="text-sm text-slate-500 mt-1">{leads.length} leads no total</p>
      </div>
      <KanbanBoard initialLeads={leads} />
    </div>
  )
}
