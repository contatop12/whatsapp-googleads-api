'use client'

import { Draggable } from '@hello-pangea/dnd'
import { formatPhone, timeAgo } from '@/lib/utils'
import { MapPin, Clock, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import type { Lead } from '@/lib/api'

interface LeadCardProps {
  lead: Lead
  index: number
  stage: 1 | 2 | 3
  isLocked?: boolean
}

const STAGE_BORDER = {
  1: 'border-l-amber-500/60',
  2: 'border-l-blue-500/60',
  3: 'border-l-emerald-500/60',
} as const

const STAGE_GLOW_DRAG = {
  1: 'shadow-[0_4px_20px_rgba(245,158,11,0.15),0_2px_6px_rgba(0,0,0,0.4)]',
  2: 'shadow-[0_4px_20px_rgba(59,130,246,0.15),0_2px_6px_rgba(0,0,0,0.4)]',
  3: 'shadow-[0_4px_20px_rgba(16,185,129,0.15),0_2px_6px_rgba(0,0,0,0.4)]',
} as const

export function LeadCard({ lead, index, stage, isLocked }: LeadCardProps) {
  return (
    <Draggable draggableId={lead.id} index={index} isDragDisabled={isLocked}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            bg-zinc-900 rounded-lg border-l-2 border-r border-t border-b
            border-r-zinc-800 border-t-zinc-800 border-b-zinc-800
            ${STAGE_BORDER[stage]}
            p-3 space-y-2.5
            cursor-grab active:cursor-grabbing
            transition-all duration-150
            ${snapshot.isDragging
              ? `${STAGE_GLOW_DRAG[stage]} scale-[1.02] z-50`
              : 'shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:bg-zinc-850'
            }
            ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {/* Name + gclid badge */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-zinc-100 truncate leading-tight">
              {lead.name || formatPhone(lead.phone)}
            </p>
            {lead.gclid && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono">
                ads
              </span>
            )}
          </div>

          {/* Phone (if name shown) */}
          {lead.name && (
            <p className="text-xs text-zinc-500 font-mono">{formatPhone(lead.phone)}</p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 text-[11px] text-zinc-600">
            {lead.city && (
              <span className="flex items-center gap-1">
                <MapPin size={9} className="text-zinc-700" />
                {lead.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={9} className="text-zinc-700" />
              {timeAgo(lead.created_at)}
            </span>
            {lead.conversion_value != null && stage === 3 && (
              <span className="ml-auto font-mono text-emerald-500 font-medium">
                R${Number(lead.conversion_value).toFixed(0)}
              </span>
            )}
          </div>

          {/* Detail link */}
          <Link
            href={`/leads/${lead.id}`}
            className="flex items-center gap-0.5 text-[11px] text-zinc-600 hover:text-emerald-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Ver detalhes
            <ArrowUpRight size={10} />
          </Link>
        </div>
      )}
    </Draggable>
  )
}
