'use client'

import { Draggable } from '@hello-pangea/dnd'
import { Badge } from '@/components/ui/badge'
import { formatPhone, timeAgo } from '@/lib/utils'
import { MapPin, Clock } from 'lucide-react'
import Link from 'next/link'
import type { Lead } from '@/lib/api'

interface LeadCardProps {
  lead: Lead
  index: number
  isLocked?: boolean
}

export function LeadCard({ lead, index, isLocked }: LeadCardProps) {
  return (
    <Draggable draggableId={lead.id} index={index} isDragDisabled={isLocked}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg border p-3 space-y-2 cursor-grab active:cursor-grabbing
            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : 'shadow-sm'}
            ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between">
            <p className="font-medium text-sm text-slate-900 truncate">
              {lead.name || formatPhone(lead.phone)}
            </p>
            {lead.gclid && (
              <Badge variant="outline" className="text-xs ml-1 shrink-0">
                gclid
              </Badge>
            )}
          </div>

          {lead.name && <p className="text-xs text-slate-500">{formatPhone(lead.phone)}</p>}

          <div className="flex items-center gap-3 text-xs text-slate-400">
            {lead.city && (
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {lead.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={10} /> {timeAgo(lead.created_at)}
            </span>
          </div>

          <Link
            href={`/leads/${lead.id}`}
            className="text-xs text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Ver detalhes →
          </Link>
        </div>
      )}
    </Draggable>
  )
}
