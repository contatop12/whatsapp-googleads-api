'use client'

import { useState, useEffect } from 'react'
import { api, type Tenant } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { X, Plus } from 'lucide-react'

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
        description: 'Use o formato completo, ex: https://www.seusite.com.br',
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
      <div>
        <h1 className="text-xl font-semibold">Sites permitidos</h1>
        <p className="text-sm text-slate-500 mt-1">
          URLs dos sites onde o snippet de rastreamento está instalado. O navegador só
          consegue enviar dados para <code className="text-xs">/api/track</code> se a
          origem estiver autorizada aqui (CORS).
        </p>
      </div>

      <div className="space-y-3 bg-white rounded-lg border p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://www.seusite.com.br"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button size="icon" variant="outline" onClick={handleAdd} type="button">
            <Plus size={16} />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[2rem]">
          {origins.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum site cadastrado ainda.</p>
          ) : (
            origins.map((origin) => (
              <Badge key={origin} variant="secondary" className="gap-1">
                {origin}
                <button
                  type="button"
                  onClick={() => setOrigins((p) => p.filter((o) => o !== origin))}
                  aria-label={`Remover ${origin}`}
                >
                  <X size={12} />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        O dashboard (ex: localhost:3000) continua configurado em{' '}
        <code className="text-xs">ALLOWED_ORIGINS</code> no servidor — não precisa
        repetir aqui.
      </p>

      <Button onClick={handleSave} disabled={saving || !tenant}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}
