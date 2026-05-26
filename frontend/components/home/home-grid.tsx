'use client'

import { Zap, Target, Trophy, CalendarClock } from 'lucide-react'
import { HeroHeader } from './hero-header'
import { StatCard } from './stat-card'
import { ConversionBar } from './conversion-bar'
import { ActivityFeed } from './activity-feed'
import type { HomeStats, RecentLead } from './types'

type HomeGridProps = {
  stats: HomeStats
  recentLeads: RecentLead[]
  tenantName: string
}

export function HomeGrid({ stats, recentLeads, tenantName }: HomeGridProps) {
  return (
    <div className="p-6 space-y-5">
      <HeroHeader tenantName={tenantName} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          value={stats.novo}
          label="Novos"
          icon={<Zap size={18} />}
          color="#F59E0B"
          delay={0}
        />
        <StatCard
          value={stats.qualificado}
          label="Qualificados"
          icon={<Target size={18} />}
          color="#4067E3"
          delay={100}
        />
        <StatCard
          value={stats.convertido}
          label="Convertidos"
          icon={<Trophy size={18} />}
          color="#10B981"
          delay={200}
        />
        <StatCard
          value={stats.hoje}
          label="Hoje"
          icon={<CalendarClock size={18} />}
          color="#26A863"
          delay={300}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ConversionBar
          novo={stats.novo}
          qualificado={stats.qualificado}
          convertido={stats.convertido}
          totalValue={stats.totalValue}
          total={stats.total}
        />
        <ActivityFeed leads={recentLeads} />
      </div>
    </div>
  )
}
