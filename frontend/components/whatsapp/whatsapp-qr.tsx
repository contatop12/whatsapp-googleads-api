'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface Props {
  tenantId: string
  initialStatus: 'disconnected' | 'connecting' | 'connected'
}

export function WhatsAppQR({ tenantId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchQR = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.whatsapp.qr(tenantId)
      setQrBase64(data.base64)
      setStatus(data.status as typeof status)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    const supabase = createClient()
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
          const newStatus = (payload.new as { evolution_instance_status?: string })
            .evolution_instance_status
          if (newStatus) {
            setStatus(newStatus as typeof status)
            if (newStatus === 'connected') setQrBase64(null)
            if (newStatus === 'disconnected') fetchQR()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, fetchQR])

  useEffect(() => {
    if (status !== 'connecting') return
    const interval = setInterval(fetchQR, 5000)
    return () => clearInterval(interval)
  }, [status, fetchQR])

  useEffect(() => {
    if (status !== 'connected') fetchQR()
  }, [status, fetchQR])

  if (status === 'connected') {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-emerald-300 text-sm">WhatsApp Conectado</p>
            <p className="text-xs text-emerald-600 mt-0.5">Mensagens sendo recebidas normalmente</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            online
          </span>
        </div>
      </div>
    )
  }

  if (status === 'disconnected' && !qrBase64 && !loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-red-300 text-sm">WhatsApp Desconectado</p>
              <p className="text-xs text-red-600 mt-0.5">Clique em conectar para gerar o QR code</p>
            </div>
          </div>
        </div>
        <Button onClick={fetchQR} variant="outline">
          Conectar WhatsApp
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center gap-2 text-xs text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Aguardando leitura do QR Code...
      </div>

      {/* QR container */}
      <div className="w-52 h-52 rounded-xl overflow-hidden border border-zinc-800 bg-white flex items-center justify-center">
        {loading && !qrBase64 ? (
          <Skeleton className="w-full h-full rounded-none" />
        ) : qrBase64 ? (
          <Image
            src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
            alt="WhatsApp QR Code"
            width={208}
            height={208}
            unoptimized
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      <p className="text-xs text-zinc-600 max-w-xs">
        Abra o WhatsApp → Dispositivos conectados → Conectar um dispositivo → Escaneie o QR.
      </p>

      <Button onClick={fetchQR} variant="ghost" size="sm" disabled={loading}>
        <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
        Atualizar QR
      </Button>
    </div>
  )
}
