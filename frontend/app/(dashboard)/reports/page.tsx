import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/tenant'

export default async function ReportsPage() {
  const { profile } = await getUserProfile()
  const supabase = createClient()

  let query = supabase.from('leads').select('stage, created_at, city, country')
  if (profile?.role !== 'admin' && profile?.tenant_id) {
    query = query.eq('tenant_id', profile.tenant_id)
  }
  const { data: leads } = await query

  const totals = { 1: 0, 2: 0, 3: 0 }
  leads?.forEach((l) => {
    const stage = l.stage as 1 | 2 | 3
    if (stage in totals) totals[stage]++
  })

  const rate12 = totals[1] > 0 ? ((totals[2] / totals[1]) * 100).toFixed(1) : '0'
  const rate23 = totals[2] > 0 ? ((totals[3] / totals[2]) * 100).toFixed(1) : '0'

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Relatórios</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Novos Leads" value={totals[1]} />
        <StatCard label="Qualificados" value={totals[2]} />
        <StatCard label="Convertidos" value={totals[3]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Taxa 1 → 2" value={`${rate12}%`} />
        <StatCard label="Taxa 2 → 3" value={`${rate23}%`} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  )
}
