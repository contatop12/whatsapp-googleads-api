import { KanbanBoard } from '@/components/kanban/kanban-board'
import { getServerApi } from '@/lib/api-server'
import { getUserProfile, resolveTenantId } from '@/lib/tenant'

export default async function PipelinePage() {
  const { profile } = await getUserProfile()
  const tenantId = await resolveTenantId(profile)

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-zinc-400 text-sm">Tenant não configurado.</p>
          <p className="text-zinc-600 text-xs">Contate o administrador.</p>
        </div>
      </div>
    )
  }

  const serverApi = await getServerApi()
  const leads = await serverApi.leads.list(tenantId).catch(() => [])

  const stage1 = leads.filter((l) => l.stage === 1).length
  const stage2 = leads.filter((l) => l.stage === 2).length
  const stage3 = leads.filter((l) => l.stage === 3).length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Pipeline</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{leads.length} leads no total</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-600">
          <span><span className="text-amber-400 font-mono font-medium">{stage1}</span> novos</span>
          <span><span className="text-blue-400 font-mono font-medium">{stage2}</span> qualificados</span>
          <span><span className="text-emerald-400 font-mono font-medium">{stage3}</span> convertidos</span>
        </div>
      </div>
      <KanbanBoard initialLeads={leads} />
    </div>
  )
}
