'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

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
      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle className="text-green-600" size={24} />
        <div>
          <p className="font-medium text-green-800">WhatsApp Conectado</p>
          <p className="text-sm text-green-600">Mensagens sendo recebidas normalmente</p>
        </div>
      </div>
    )
  }

  if (status === 'disconnected' && !qrBase64 && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <XCircle className="text-red-600" size={24} />
          <div>
            <p className="font-medium text-red-800">WhatsApp Desconectado</p>
            <p className="text-sm text-red-600">Clique em conectar para gerar o QR code</p>
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
      <div className="flex items-center gap-2">
        <Loader2 className="animate-spin text-yellow-600" size={18} />
        <span className="text-sm text-yellow-700 font-medium">Aguardando scan do QR Code...</span>
      </div>

      <div className="w-48 h-48 rounded-lg overflow-hidden border bg-white flex items-center justify-center">
        {loading && !qrBase64 ? (
          <Skeleton className="w-full h-full" />
        ) : qrBase64 ? (
          <Image
            src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
            alt="WhatsApp QR Code"
            width={192}
            height={192}
            unoptimized
          />
        ) : null}
      </div>

      <p className="text-xs text-slate-500">
        Abra o WhatsApp → Dispositivos conectados → Conectar um dispositivo
      </p>

      <Button onClick={fetchQR} variant="ghost" size="sm">
        Atualizar QR
      </Button>
    </div>
  )
}
