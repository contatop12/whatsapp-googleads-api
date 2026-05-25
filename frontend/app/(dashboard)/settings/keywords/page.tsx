'use client'

import { useState, useEffect } from 'react'
import { api, type Tenant } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    <div className="p-6 max-w-2xl space-y-6">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-lg font-bold text-zinc-100">Palavras-chave</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Termos no WhatsApp que avançam o lead automaticamente de etapa.
        </p>
      </div>

      <KeywordSection
        title="Etapa 1 → 2"
        subtitle="Qualificado"
        dot="bg-blue-400"
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
        tagColor="bg-blue-500/10 border-blue-500/20 text-blue-300"
      />

      <KeywordSection
        title="Etapa 2 → 3"
        subtitle="Convertido"
        dot="bg-emerald-400"
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
        tagColor="bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
      />

      <Button onClick={handleSave} disabled={saving || !tenant}>
        {saving ? 'Salvando...' : 'Salvar palavras-chave'}
      </Button>
    </div>
  )
}

function KeywordSection({
  title,
  subtitle,
  dot,
  keywords,
  input,
  onInputChange,
  onAdd,
  onRemove,
  tagColor,
}: {
  title: string
  subtitle: string
  dot: string
  keywords: string[]
  input: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onRemove: (kw: string) => void
  tagColor: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
          {title} <span className="text-zinc-600">—</span> {subtitle}
        </p>
        <span className="ml-auto text-xs text-zinc-700 font-mono">{keywords.length}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Digite e pressione Enter"
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            className="font-mono"
          />
          <Button size="icon" variant="outline" onClick={onAdd} type="button">
            <Plus size={15} />
          </Button>
        </div>
        {keywords.length === 0 ? (
          <p className="text-xs text-zinc-700 py-1">Nenhuma palavra-chave cadastrada.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span
                key={kw}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono ${tagColor}`}
              >
                {kw}
                <button
                  type="button"
                  onClick={() => onRemove(kw)}
                  className="hover:opacity-60 transition-opacity"
                  aria-label={`Remover ${kw}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
