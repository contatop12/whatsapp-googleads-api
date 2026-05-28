'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { CheckCircle, XCircle, RefreshCw, Webhook, ShieldCheck, ShieldAlert } from 'lucide-react'
import type { WhatsAppWebhookStatus } from '@/lib/api-types'

interface Props {
  tenantId: string
  initialStatus: 'disconnected' | 'connecting' | 'connected'
}

export function WhatsAppQR({ tenantId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [webhook, setWebhook] = useState<WhatsAppWebhookStatus | null>(null)
  const [webhookLoading, setWebhookLoading] = useState(false)

  const fetchWebhook = useCallback(async () => {
    setWebhookLoading(true)
    try {
      const data = await api.whatsapp.webhook(tenantId)
      setWebhook(data)
    } catch (err) {
      setWebhook({
        enabled: false,
        url: null,
        expected_url: '',
        active: false,
        events: [],
        has_secret: false,
        error: err instanceof Error ? err.message : 'Erro ao verificar webhook',
      })
    } finally {
      setWebhookLoading(false)
    }
  }, [tenantId])

  const activateWebhook = useCallback(async () => {
    setWebhookLoading(true)
    try {
      const data = await api.whatsapp.activateWebhook(tenantId)
      setWebhook(data)
    } catch (err) {
      setWebhook({
        enabled: false,
        url: null,
        expected_url: '',
        active: false,
        events: [],
        has_secret: false,
        error: err instanceof Error ? err.message : 'Erro ao ativar webhook',
      })
    } finally {
      setWebhookLoading(false)
    }
  }, [tenantId])

  const fetchQR = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.whatsapp.qr(tenantId)
      setQrBase64(data.base64)
      setStatus(data.status as typeof status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar QR code')
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

  useEffect(() => {
    if (status === 'connected') fetchWebhook()
  }, [status, fetchWebhook])

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-red-300 text-sm">Erro ao carregar WhatsApp</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
            </div>
          </div>
        </div>
        <Button onClick={fetchQR} variant="outline" disabled={loading}>
          <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (status === 'connected') {
    const webhookActive = webhook?.active
    const webhookError = webhook?.error
    const hasSecret = webhook?.has_secret

    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-emerald-300 text-sm">WhatsApp Conectado</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Instância ativa na Evolution — mensagens chegam via webhook
              </p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              online
            </span>
          </div>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            webhookActive
              ? 'border-blue-500/20 bg-blue-500/5'
              : 'border-amber-500/20 bg-amber-500/5'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                webhookActive
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-amber-500/10 border-amber-500/20'
              }`}
            >
              <Webhook
                size={18}
                className={webhookActive ? 'text-blue-400' : 'text-amber-400'}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`font-semibold text-sm ${
                  webhookActive ? 'text-blue-300' : 'text-amber-300'
                }`}
              >
                {webhookLoading && !webhook
                  ? 'Verificando webhook...'
                  : webhookActive
                    ? 'Webhook ativo'
                    : 'Webhook inativo ou incorreto'}
              </p>
              {webhook?.expected_url && (
                <p className="text-[11px] text-zinc-500 mt-1 font-mono break-all">
                  {webhook.expected_url}
                </p>
              )}
              {webhook?.url && webhook.url !== webhook.expected_url && (
                <p className="text-[11px] text-amber-600 mt-1 font-mono break-all">
                  URL atual: {webhook.url}
                </p>
              )}
              {webhookError && (
                <p className="text-[11px] text-red-500 mt-1">{webhookError}</p>
              )}
            </div>
          </div>
          {webhook && (
            <div className="flex items-center gap-1.5 mt-2">
              {hasSecret ? (
                <>
                  <ShieldCheck size={12} className="text-emerald-500" />
                  <span className="text-[11px] text-emerald-600">Secret ativo</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={12} className="text-amber-500" />
                  <span className="text-[11px] text-amber-600">Sem autenticação — reconf. o webhook</span>
                </>
              )}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Button
              onClick={activateWebhook}
              variant="outline"
              size="sm"
              disabled={webhookLoading}
            >
              <RefreshCw size={13} className={`mr-1.5 ${webhookLoading ? 'animate-spin' : ''}`} />
              {webhookActive ? 'Reconfigurar webhook' : 'Ativar webhook'}
            </Button>
            <Button onClick={fetchWebhook} variant="ghost" size="sm" disabled={webhookLoading}>
              Verificar
            </Button>
          </div>
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
