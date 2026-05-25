'use client'

import { Droppable } from '@hello-pangea/dnd'
import { LeadCard } from './lead-card'
import { Badge } from '@/components/ui/badge'
import type { Lead } from '@/lib/api'

const STAGE_LABELS = { 1: 'Novo Lead', 2: 'Qualificado', 3: 'Convertido' } as const

interface Props {
  stage: 1 | 2 | 3
  leads: Lead[]
}

export function KanbanColumn({ stage, leads }: Props) {
  return (
    <div className="flex flex-col w-80 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm text-slate-700">{STAGE_LABELS[stage]}</h2>
        <Badge variant="secondary">{leads.length}</Badge>
      </div>
      <Droppable droppableId={String(stage)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-32 space-y-2 rounded-lg p-2 transition-colors
              ${snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-slate-100'}`}
          >
            {leads.map((lead, index) => (
              <LeadCard key={lead.id} lead={lead} index={index} isLocked={lead.stage === 3} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
