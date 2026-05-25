import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/tenant'
import { TrendingUp, Users, Zap, ArrowRight } from 'lucide-react'

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
  const rateOverall = totals[1] > 0 ? ((totals[3] / totals[1]) * 100).toFixed(1) : '0'

  return (
    <div className="p-6 max-w-4xl space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-lg font-bold text-zinc-100">Relatórios</h1>
        <p className="text-xs text-zinc-500 mt-1">Funil de conversão</p>
      </div>

      {/* Funnel stats */}
      <div>
        <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-3">Leads por etapa</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger">
          <StatCard
            label="Novos Leads"
            value={totals[1]}
            icon={<Users size={16} />}
            color="amber"
          />
          <StatCard
            label="Qualificados"
            value={totals[2]}
            icon={<Zap size={16} />}
            color="blue"
          />
          <StatCard
            label="Convertidos"
            value={totals[3]}
            icon={<TrendingUp size={16} />}
            color="emerald"
          />
        </div>
      </div>

      {/* Conversion rates */}
      <div>
        <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-3">Taxas de conversão</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RateCard label="Novo → Qualificado" value={rate12} />
          <RateCard label="Qualificado → Convertido" value={rate23} />
          <RateCard label="Taxa geral" value={rateOverall} highlight />
        </div>
      </div>

      {/* Pipeline visual */}
      <div>
        <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-3">Funil visual</p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2">
            <FunnelBar label="Novos" value={totals[1]} max={totals[1]} color="bg-amber-500" />
            <ArrowRight size={14} className="text-zinc-700 shrink-0" />
            <FunnelBar label="Qualificados" value={totals[2]} max={totals[1]} color="bg-blue-500" />
            <ArrowRight size={14} className="text-zinc-700 shrink-0" />
            <FunnelBar label="Convertidos" value={totals[3]} max={totals[1]} color="bg-emerald-500" />
          </div>
        </div>
      </div>
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
  color: 'amber' | 'blue' | 'emerald'
}) {
  const colors = {
    amber: {
      icon: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      value: 'text-amber-400',
    },
    blue: {
      icon: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      value: 'text-blue-400',
    },
    emerald: {
      icon: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      value: 'text-emerald-400',
    },
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-500">{label}</p>
        <span className={`p-1.5 rounded-md border ${colors[color].icon}`}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold font-mono ${colors[color].value}`}>{value}</p>
    </div>
  )
}

function RateCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-zinc-800 bg-zinc-900'
      }`}
    >
      <p className="text-xs text-zinc-500 mb-2">{label}</p>
      <p
        className={`text-2xl font-bold font-mono ${
          highlight ? 'text-emerald-400' : 'text-zinc-200'
        }`}
      >
        {value}%
      </p>
    </div>
  )
}

function FunnelBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0

  return (
    <div className="flex-1 space-y-2">
      <div className="flex items-end justify-between text-xs">
        <span className="text-zinc-600">{label}</span>
        <span className="font-mono text-zinc-400">{value}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-zinc-700 text-right font-mono">{pct}%</p>
    </div>
  )
}
