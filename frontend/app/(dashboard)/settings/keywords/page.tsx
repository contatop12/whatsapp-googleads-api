'use client'

import { useState, useEffect } from 'react'
import { api, type Tenant } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { X, Plus } from 'lucide-react'

export default function KeywordsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [qualified, setQualified] = useState<string[]>([])
  const [converted, setConverted] = useState<string[]>([])
  const [inputQ, setInputQ] = useState('')
  const [inputC, setInputC] = useState('')
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
      setQualified(t.keywords_qualified || [])
      setConverted(t.keywords_converted || [])
    }
    load()
  }, [])

  async function handleSave() {
    if (!tenant) return
    setSaving(true)
    try {
      await api.tenants.update(tenant.id, {
        keywords_qualified: qualified,
        keywords_converted: converted,
      })
      toast({ title: 'Palavras-chave salvas' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Palavras-chave</h1>
        <p className="text-sm text-slate-500">
          Termos que avançam o lead automaticamente de etapa.
        </p>
      </div>

      <KeywordSection
        title="Etapa 1 → 2 (Qualificado)"
        keywords={qualified}
        input={inputQ}
        onInputChange={setInputQ}
        onAdd={() => {
          if (inputQ.trim()) {
            setQualified((p) => [...p, inputQ.trim()])
            setInputQ('')
          }
        }}
        onRemove={(kw) => setQualified((p) => p.filter((k) => k !== kw))}
      />

      <KeywordSection
        title="Etapa 2 → 3 (Convertido)"
        keywords={converted}
        input={inputC}
        onInputChange={setInputC}
        onAdd={() => {
          if (inputC.trim()) {
            setConverted((p) => [...p, inputC.trim()])
            setInputC('')
          }
        }}
        onRemove={(kw) => setConverted((p) => p.filter((k) => k !== kw))}
      />

      <Button onClick={handleSave} disabled={saving || !tenant}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}

function KeywordSection({
  title,
  keywords,
  input,
  onInputChange,
  onAdd,
  onRemove,
}: {
  title: string
  keywords: string[]
  input: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onRemove: (kw: string) => void
}) {
  return (
    <div className="space-y-3 bg-white rounded-lg border p-4">
      <h2 className="text-sm font-medium text-slate-700">{title}</h2>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Adicionar palavra-chave"
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <Button size="icon" variant="outline" onClick={onAdd} type="button">
          <Plus size={16} />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw) => (
          <Badge key={kw} variant="secondary" className="gap-1">
            {kw}
            <button type="button" onClick={() => onRemove(kw)} aria-label={`Remover ${kw}`}>
              <X size={12} />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}
