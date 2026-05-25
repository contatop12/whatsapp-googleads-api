'use client'

import { useState, useEffect } from 'react'
import { api, type Tenant } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { X, Plus, Globe } from 'lucide-react'

function normalizeOriginInput(value: string): string | null {
  const origin = value.trim().replace(/\/+$/, '')
  if (!/^https?:\/\/[^\s/]+$/i.test(origin)) {
    return null
  }
  return origin
}

export default function AllowedSitesPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [origins, setOrigins] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: userRow } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      if (!userRow?.tenant_id) return
      const t = await api.tenants.get(userRow.tenant_id)
      setTenant(t)
      setOrigins(t.allowed_origins || [])
    }
    load()
  }, [])

  function handleAdd() {
    const normalized = normalizeOriginInput(input)
    if (!normalized) {
      toast({
        title: 'URL inválida',
        description: 'Use o formato completo: https://www.seusite.com.br',
        variant: 'destructive',
      })
      return
    }
    if (origins.includes(normalized)) {
      toast({ title: 'Este site já está na lista' })
      return
    }
    setOrigins((prev) => [...prev, normalized])
    setInput('')
  }

  async function handleSave() {
    if (!tenant) return
    setSaving(true)
    try {
      await api.tenants.update(tenant.id, { allowed_origins: origins })
      toast({ title: 'Sites permitidos salvos' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar'
      toast({ title: 'Erro ao salvar', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-lg font-bold text-zinc-100">Sites permitidos</h1>
        <p className="text-xs text-zinc-500 mt-1">
          URLs onde o snippet de rastreamento está instalado. Necessário para CORS em{' '}
          <code className="font-mono text-zinc-400 bg-zinc-800 px-1 rounded">/api/track</code>.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://www.seusite.com.br"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="font-mono"
            />
            <Button size="icon" variant="outline" onClick={handleAdd} type="button">
              <Plus size={15} />
            </Button>
          </div>
        </div>

        <div className="p-4 min-h-[80px]">
          {origins.length === 0 ? (
            <div className="flex items-center gap-2 text-zinc-700 text-xs py-4 justify-center">
              <Globe size={14} />
              Nenhum site cadastrado ainda.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {origins.map((origin) => (
                <span
                  key={origin}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-zinc-700 bg-zinc-800 text-xs font-mono text-zinc-300"
                >
                  {origin}
                  <button
                    type="button"
                    onClick={() => setOrigins((p) => p.filter((o) => o !== origin))}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors ml-0.5"
                    aria-label={`Remover ${origin}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-700">
        O dashboard está configurado em{' '}
        <code className="font-mono text-zinc-600 bg-zinc-800 px-1 rounded">ALLOWED_ORIGINS</code>{' '}
        no servidor — não precisa repetir aqui.
      </p>

      <Button onClick={handleSave} disabled={saving || !tenant}>
        {saving ? 'Salvando...' : 'Salvar sites'}
      </Button>
    </div>
  )
}
