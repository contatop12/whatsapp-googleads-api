import { getServerApi } from '@/lib/api-server'
import { getUserProfile, resolveTenantId } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { HomeGrid } from '@/components/home/home-grid'
import type { HomeStats, RecentLead } from '@/components/home/types'

export default async function DashboardHomePage() {
  const { profile } = await getUserProfile()
  const tenantId = await resolveTenantId(profile, undefined)

  let tenantName = 'Dashboard'
  if (tenantId) {
    const supabase = createClient()
    const { data } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
    if (data?.name) tenantName = data.name
  }

  const stats: HomeStats = { novo: 0, qualificado: 0, convertido: 0, hoje: 0, totalValue: 0, total: 0 }
  let recentLeads: RecentLead[] = []

  if (tenantId) {
    try {
      const api = await getServerApi()
      const leads = await api.leads.list(tenantId)

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      for (const lead of leads) {
        stats.total++
        if (lead.stage === 1) stats.novo++
        if (lead.stage === 2) stats.qualificado++
        if (lead.stage === 3) {
          stats.convertido++
          stats.totalValue += lead.conversion_value ?? 0
        }
        if (new Date(lead.created_at) >= todayStart) stats.hoje++
      }

      recentLeads = [...leads]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map((l) => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          stage: l.stage,
          created_at: l.created_at,
        }))
    } catch {
      // Silently degrade — stats stay at 0
    }
  }

  return (
    <HomeGrid
      stats={stats}
      recentLeads={recentLeads}
      tenantName={tenantName}
    />
  )
}
