'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { EvolutionInstance, WhatsAppLinkResult } from '@/lib/api-types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Link2, Phone, RefreshCw, User } from 'lucide-react'

interface Props {
  tenantId: string
  tenantName: string
  currentInstance?: string | null
  onLinked?: (result: WhatsAppLinkResult) => void
}

function formatPhone(phone: string | null): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 12 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  return digits.startsWith('+') ? digits : `+${digits}`
}

function statusLabel(status: EvolutionInstance['status']) {
  if (status === 'connected') return { text: 'Conectado', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
  if (status === 'disconnected') return { text: 'Desconectado', className: 'bg-red-500/10 text-red-400 border-red-500/20' }
  return { text: 'Aguardando', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
}

export function WhatsAppInstancePicker({
  tenantId,
  tenantName,
  currentInstance,
  onLinked,
}: Props) {
  const { toast } = useToast()
  const [instances, setInstances] = useState<EvolutionInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.whatsapp.listInstances(tenantId)
      setInstances(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao listar instâncias')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  async function handleLink(instance: EvolutionInstance) {
    if (instance.linked_tenant && instance.linked_tenant.id !== tenantId) return

    setLinking(instance.instance_name)
    try {
      const result = await api.whatsapp.linkInstance(tenantId, instance.instance_name)
      toast({
        title: 'Número associado',
        description: `${formatPhone(instance.phone)} vinculado a ${tenantName}`,
      })
      if (result.webhook_error) {
        toast({
          title: 'Webhook com aviso',
          description: result.webhook_error,
          variant: 'destructive',
        })
      }
      await load()
      onLinked?.(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro'
      toast({
        title: 'Não foi possível associar',
        description: message,
        variant: 'destructive',
      })
      setError(message)
    } finally {
      setLinking(null)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-800">
        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
            Números na Evolution
          </p>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            Selecione um número já cadastrado para vincular a este cliente
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      <div className="p-3">
        {currentInstance && (
          <p className="text-[11px] text-zinc-500 mb-3 font-mono">
            Instância atual: <span className="text-zinc-300">{currentInstance}</span>
          </p>
        )}

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {error && !loading && (
          <div className="space-y-2">
            <p className="text-xs text-red-400">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={load}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!loading && !error && instances.length === 0 && (
          <p className="text-xs text-zinc-600 py-2">Nenhuma instância encontrada na Evolution.</p>
        )}

        {!loading && !error && instances.length > 0 && (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {instances.map((inst) => {
              const st = statusLabel(inst.status)
              const isCurrent = currentInstance === inst.instance_name
              const linkedOther =
                inst.linked_tenant && inst.linked_tenant.id !== tenantId
              const canLink = !linkedOther

              return (
                <li
                  key={inst.instance_name}
                  className={`rounded-lg border p-3 ${
                    isCurrent ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      <Phone size={16} className="text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-zinc-200 font-mono">
                          {formatPhone(inst.phone)}
                        </p>
                        <Badge variant="outline" className={`text-[10px] ${st.className}`}>
                          {st.text}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Este cliente
                          </Badge>
                        )}
                      </div>
                      {inst.profile_name && (
                        <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                          <User size={11} />
                          {inst.profile_name}
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-600 mt-1 font-mono truncate">
                        {inst.instance_name}
                      </p>
                      {inst.linked_tenant && (
                        <p className="text-[10px] text-zinc-500 mt-1">
                          Cliente: {inst.linked_tenant.name}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isCurrent ? 'ghost' : 'outline'}
                      disabled={!canLink || linking !== null || isCurrent}
                      onClick={() => handleLink(inst)}
                      className="shrink-0"
                    >
                      {linking === inst.instance_name ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Link2 size={13} className="mr-1" />
                          {isCurrent ? 'Vinculado' : linkedOther ? 'Em uso' : 'Associar'}
                        </>
                      )}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
