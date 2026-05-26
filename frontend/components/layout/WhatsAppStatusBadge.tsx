'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'connected' | 'connecting' | 'disconnected'

const colorMap: Record<Status, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-500 animate-pulse',
  disconnected: 'bg-red-500',
}

export function WhatsAppStatusBadge({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<Status>('disconnected')

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('tenants')
      .select('evolution_instance_status')
      .eq('id', tenantId)
      .single()
      .then(({ data }) => {
        if (data?.evolution_instance_status) {
          setStatus(data.evolution_instance_status as Status)
        }
      })

    const channel = supabase
      .channel(`tenant-status-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tenants',
          filter: `id=eq.${tenantId}`,
        },
        (payload) => {
          const next = payload.new.evolution_instance_status as Status
          setStatus(next)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tenantId])

  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${colorMap[status]}`}
      aria-label={`WhatsApp ${status}`}
    />
  )
}
