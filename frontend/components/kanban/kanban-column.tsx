'use client'

import { Droppable } from '@hello-pangea/dnd'
import { LeadCard } from './lead-card'
import type { Lead } from '@/lib/api'

const STAGE_CONFIG = {
  1: {
    label: 'Novo Lead',
    color: 'text-amber-400',
    dot: 'bg-amber-400',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    count: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  2: {
    label: 'Qualificado',
    color: 'text-blue-400',
    dot: 'bg-blue-400',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
    count: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  3: {
    label: 'Convertido',
    color: 'text-emerald-400',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/5',
    count: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
} as const

interface Props {
  stage: 1 | 2 | 3
  leads: Lead[]
}

export function KanbanColumn({ stage, leads }: Props) {
  const cfg = STAGE_CONFIG[stage]

  return (
    <div className="flex flex-col w-80 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shadow-[0_0_6px_currentColor]`} />
          <h2 className={`text-xs font-semibold uppercase tracking-widest ${cfg.color}`}>
            {cfg.label}
          </h2>
        </div>
        <span
          className={`text-xs px-1.5 py-0.5 rounded border font-mono ${cfg.count}`}
        >
          {leads.length}
        </span>
      </div>

      <Droppable droppableId={String(stage)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-32 space-y-2 rounded-xl p-2 transition-all duration-200 border
              ${snapshot.isDraggingOver
                ? `${cfg.border} ${cfg.bg}`
                : 'border-transparent'
              }`}
          >
            {leads.map((lead, index) => (
              <LeadCard key={lead.id} lead={lead} index={index} stage={stage} isLocked={lead.stage === 3} />
            ))}
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-zinc-800">
                <p className="text-xs text-zinc-700">Sem leads</p>
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
