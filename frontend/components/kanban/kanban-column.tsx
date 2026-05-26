'use client'

import { Droppable } from '@hello-pangea/dnd'
import { LeadCard } from './lead-card'
import { Inbox, Zap, CheckCircle2, MoreHorizontal } from 'lucide-react'
import type { Lead } from '@/lib/api'

const STAGE_CONFIG = {
  1: {
    label: 'Novo Lead',
    Icon: Inbox,
    color: 'text-amber-400',
    headerDot: 'bg-amber-400',
    countCls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dropBg: 'bg-amber-500/5',
    dropBorder: 'border-amber-500/20',
    emptyBorder: 'border-amber-500/10',
  },
  2: {
    label: 'Qualificado',
    Icon: Zap,
    color: 'text-blue-400',
    headerDot: 'bg-blue-400',
    countCls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dropBg: 'bg-blue-500/5',
    dropBorder: 'border-blue-500/20',
    emptyBorder: 'border-blue-500/10',
  },
  3: {
    label: 'Convertido',
    Icon: CheckCircle2,
    color: 'text-emerald-400',
    headerDot: 'bg-emerald-400',
    countCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dropBg: 'bg-emerald-500/5',
    dropBorder: 'border-emerald-500/20',
    emptyBorder: 'border-emerald-500/10',
  },
} as const

interface Props {
  stage: 1 | 2 | 3
  leads: Lead[]
}

export function KanbanColumn({ stage, leads }: Props) {
  const cfg = STAGE_CONFIG[stage]
  const Icon = cfg.Icon

  return (
    <div className="flex flex-col w-[296px] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-2">
          <Icon size={13} className={cfg.color} />
          <span className="text-xs font-semibold text-zinc-200 tracking-wide">
            {cfg.label}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-mono font-medium ${cfg.countCls}`}>
            {leads.length}
          </span>
        </div>
        <button
          className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-700 hover:text-zinc-400 hover:bg-zinc-800/70 transition-colors"
          title="Opções"
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

      {/* Separator */}
      <div className="h-px bg-zinc-800 mb-3" />

      <Droppable droppableId={String(stage)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={[
              'flex-1 min-h-[8rem] space-y-2.5 rounded-xl p-2 transition-all duration-200 border',
              snapshot.isDraggingOver
                ? `${cfg.dropBorder} ${cfg.dropBg}`
                : 'border-transparent',
            ].join(' ')}
          >
            {leads.map((lead, index) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                index={index}
                stage={stage}
                isLocked={lead.stage === 3}
              />
            ))}
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className={`flex items-center justify-center h-24 rounded-lg border border-dashed ${cfg.emptyBorder}`}>
                <p className="text-[10px] text-zinc-700 font-mono tracking-wide">vazio</p>
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
