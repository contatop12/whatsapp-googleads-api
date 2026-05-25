'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { api, type Lead } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatPhone, timeAgo } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

const STAGE_LABELS = { 1: 'Novo Lead', 2: 'Qualificado', 3: 'Convertido' }
const STAGE_VARIANTS = {
  1: 'secondary' as const,
  2: 'default' as const,
  3: 'destructive' as const,
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [lead, setLead] = useState<Lead | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!id) return
    api.leads.get(id).then((l) => {
      setLead(l)
      setForm({ name: l.name || '', email: l.email || '', phone: l.phone })
    })
  }, [id])

  async function handleSave() {
    if (!lead) return
    setSaving(true)
    try {
      const updated = await api.leads.update(lead.id, form)
      setLead(updated)
      setEditing(false)
      toast({ title: 'Lead atualizado' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar'
      toast({ title: 'Erro ao salvar', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (!lead) return <div className="p-6 text-slate-400">Carregando...</div>

  const stage = lead.stage as 1 | 2 | 3

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{lead.name || formatPhone(lead.phone)}</h1>
          <Badge variant={STAGE_VARIANTS[stage]} className="mt-1">
            {STAGE_LABELS[stage]}
          </Badge>
        </div>
        <Button variant="outline" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancelar' : 'Editar'}
        </Button>
      </div>

      <div className="space-y-4 bg-white rounded-lg border p-4">
        {editing ? (
          <>
            <Field label="Nome" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
            <Field
              label="Gmail"
              value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
              type="email"
            />
            <Field label="Telefone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        ) : (
          <>
            <ReadField label="Nome" value={lead.name} />
            <ReadField label="Gmail" value={lead.email} />
            <ReadField label="Telefone" value={formatPhone(lead.phone)} />
            <ReadField label="Cidade" value={lead.city ? `${lead.city}, ${lead.region}` : null} />
            <ReadField label="País" value={lead.country} />
            <ReadField label="gclid" value={lead.gclid} mono />
            <ReadField label="IP" value={lead.ip} mono />
            <ReadField label="Criado em" value={timeAgo(lead.created_at)} />
            <ReadField label="Primeira mensagem" value={timeAgo(lead.first_message_at)} />
            {lead.qualified_at && (
              <ReadField label="Qualificado em" value={timeAgo(lead.qualified_at)} />
            )}
            {lead.converted_at && (
              <ReadField label="Convertido em" value={timeAgo(lead.converted_at)} />
            )}
            {lead.conversion_value != null && (
              <ReadField label="Valor" value={`R$ ${Number(lead.conversion_value).toFixed(2)}`} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function ReadField({
  label,
  value,
  mono,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div className="flex gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-slate-500 w-36 shrink-0">{label}</span>
      <span className={`text-sm text-slate-900 ${mono ? 'font-mono text-xs' : ''}`}>
        {value || <span className="text-slate-300">—</span>}
      </span>
    </div>
  )
}
