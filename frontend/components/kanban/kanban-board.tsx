'use client'

import { useState, useCallback } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { KanbanColumn } from './kanban-column'
import { MoveStage2Modal } from '@/components/modals/move-stage2-modal'
import { MoveStage3Modal } from '@/components/modals/move-stage3-modal'
import { api, type Lead } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface Props {
  initialLeads: Lead[]
}

type PendingMove = { lead: Lead; targetStage: 1 | 2 | 3 }

export function KanbanBoard({ initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [showStage2Modal, setShowStage2Modal] = useState(false)
  const [showStage3Modal, setShowStage3Modal] = useState(false)
  const { toast } = useToast()

  const leadsForStage = useCallback(
    (stage: number) => leads.filter((l) => l.stage === stage),
    [leads]
  )

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return

    const newStage = parseInt(result.destination.droppableId, 10) as 1 | 2 | 3
    const oldStage = parseInt(result.source.droppableId, 10) as 1 | 2 | 3

    if (newStage === oldStage) return

    const lead = leads.find((l) => l.id === result.draggableId)
    if (!lead) return

    if (newStage < lead.stage) {
      toast({
        title: 'Não permitido',
        description: 'Leads não podem retroceder de etapa.',
        variant: 'destructive',
      })
      return
    }

    if (newStage === 3 && lead.stage === 1) {
      toast({
        title: 'Não permitido',
        description: 'Deve passar pela etapa Qualificado primeiro.',
        variant: 'destructive',
      })
      return
    }

    setPendingMove({ lead, targetStage: newStage })

    if (newStage === 2) {
      setShowStage2Modal(true)
    } else if (newStage === 3) {
      setShowStage3Modal(true)
    }
  }

  async function executeMove(conversionValue?: number, updates?: Partial<Lead>) {
    if (!pendingMove) return

    try {
      if (updates) {
        await api.leads.update(pendingMove.lead.id, updates)
      }
      const updated = await api.leads.move(
        pendingMove.lead.id,
        pendingMove.targetStage,
        conversionValue
      )
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
      toast({ title: 'Lead movido com sucesso' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      toast({ title: 'Erro ao mover lead', description: message, variant: 'destructive' })
    } finally {
      setPendingMove(null)
      setShowStage2Modal(false)
      setShowStage3Modal(false)
    }
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 p-6 overflow-x-auto h-full min-h-[calc(100vh-8rem)]">
          <KanbanColumn stage={1} leads={leadsForStage(1)} />
          <KanbanColumn stage={2} leads={leadsForStage(2)} />
          <KanbanColumn stage={3} leads={leadsForStage(3)} />
        </div>
      </DragDropContext>

      {pendingMove && showStage2Modal && (
        <MoveStage2Modal
          lead={pendingMove.lead}
          open={showStage2Modal}
          onConfirm={(data) => executeMove(undefined, data)}
          onCancel={() => {
            setPendingMove(null)
            setShowStage2Modal(false)
          }}
        />
      )}

      {pendingMove && showStage3Modal && (
        <MoveStage3Modal
          open={showStage3Modal}
          onConfirm={(value) => executeMove(value)}
          onCancel={() => {
            setPendingMove(null)
            setShowStage3Modal(false)
          }}
        />
      )}
    </>
  )
}
