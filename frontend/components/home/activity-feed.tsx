'use client'

import { useEffect, useState } from 'react'
import { formatPhone, timeAgo } from '@/lib/utils'
import type { RecentLead } from './types'

const STAGE_CONFIG = {
  1: { label: 'Novo', color: '#F59E0B', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  2: { label: 'Qualificado', color: '#4067E3', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  3: { label: 'Convertido', color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
}

type ActivityFeedProps = {
  leads: RecentLead[]
}

export function ActivityFeed({ leads }: ActivityFeedProps) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (leads.length === 0) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisibleCount(i)
      if (i >= leads.length) clearInterval(interval)
    }, 60)
    return () => clearInterval(interval)
  }, [leads.length])

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Atividade Recente</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-zinc-600">live</span>
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-600">Nenhuma atividade recente</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {leads.map((lead, i) => {
            const cfg = STAGE_CONFIG[lead.stage]
            const isVisible = i < visibleCount
            return (
              <li
                key={lead.id}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateX(0)' : 'translateX(16px)',
                  transition: 'opacity 300ms ease, transform 300ms ease',
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cfg.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">
                    {lead.name || formatPhone(lead.phone)}
                  </p>
                  <p className="text-[10px] text-zinc-600">{timeAgo(lead.created_at)}</p>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded ${cfg.bg} ${cfg.text} shrink-0`}
                >
                  {cfg.label}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
