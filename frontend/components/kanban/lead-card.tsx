'use client'

import { Draggable } from '@hello-pangea/dnd'
import { formatPhone, timeAgo } from '@/lib/utils'
import { Link2, MapPin, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import type { Lead } from '@/lib/api'

interface LeadCardProps {
  lead: Lead
  index: number
  stage: 1 | 2 | 3
  isLocked?: boolean
}

const STAGE_ACCENT: Record<1 | 2 | 3, string> = {
  1: 'border-l-amber-500',
  2: 'border-l-blue-500',
  3: 'border-l-emerald-500',
}

const AVATAR_STYLE: Record<1 | 2 | 3, string> = {
  1: 'bg-amber-500/15 text-amber-400',
  2: 'bg-blue-500/15 text-blue-400',
  3: 'bg-emerald-500/15 text-emerald-400',
}

function formatShortDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

export function LeadCard({ lead, index, stage, isLocked }: LeadCardProps) {
  const shortId = lead.id.replace(/-/g, '').slice(0, 6).toUpperCase()
  const displayName = lead.name || formatPhone(lead.phone)
  const subtitle = lead.name ? formatPhone(lead.phone) : (lead.city ?? null)
  const dateStr = formatShortDate(lead.first_message_at || lead.created_at)
  const initials = (lead.name || lead.phone).charAt(0).toUpperCase()

  return (
    <Draggable draggableId={lead.id} index={index} isDragDisabled={isLocked}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={[
            'group bg-zinc-900 rounded-xl border border-zinc-800/80 border-l-2',
            STAGE_ACCENT[stage],
            'p-3.5 cursor-grab active:cursor-grabbing select-none',
            'transition-all duration-150',
            snapshot.isDragging
              ? 'shadow-[0_12px_40px_rgba(0,0,0,0.6)] scale-[1.03] rotate-[0.4deg] z-50 border-zinc-700'
              : 'hover:border-zinc-700/80 hover:shadow-[0_2px_16px_rgba(0,0,0,0.4)] hover:-translate-y-px',
            isLocked ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {/* Row 1: short ID + source badge */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1 text-zinc-600">
              <Link2 size={9} />
              <span className="text-[10px] font-mono tracking-wider">{shortId}</span>
            </div>
            {lead.gclid ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded border border-blue-500/25 bg-blue-500/10 text-blue-400 font-medium tracking-wide uppercase">
                Google Ads
              </span>
            ) : null}
          </div>

          {/* Row 2: title */}
          <p className="font-semibold text-[13px] leading-snug text-zinc-100 truncate mb-1.5">
            {displayName}
          </p>

          {/* Row 3: subtitle/location */}
          {subtitle && (
            <div className="flex items-center gap-1 mb-2 text-[11px] text-zinc-600">
              <MapPin size={9} className="text-zinc-700 shrink-0" />
              <span className="truncate">{subtitle}</span>
            </div>
          )}

          {/* Row 4: date */}
          <div className="flex items-center gap-1 mb-3 text-[11px] text-zinc-600">
            <Calendar size={9} className="text-zinc-700 shrink-0" />
            <span>{dateStr}</span>
          </div>

          {/* Divider */}
          <div className="h-px bg-zinc-800 mb-2.5" />

          {/* Footer: avatar + time / value */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${AVATAR_STYLE[stage]}`}>
                {initials}
              </div>
              {lead.conversion_value != null && stage === 3 && (
                <span className="flex items-center gap-0.5 text-[10px] font-mono text-emerald-500 font-semibold">
                  <TrendingUp size={9} />
                  R${Number(lead.conversion_value).toFixed(0)}
                </span>
              )}
            </div>
            <Link
              href={`/leads/${lead.id}`}
              className="text-[10px] text-zinc-700 hover:text-emerald-400 transition-colors font-mono"
              onClick={(e) => e.stopPropagation()}
            >
              {timeAgo(lead.created_at)}
            </Link>
          </div>
        </div>
      )}
    </Draggable>
  )
}
