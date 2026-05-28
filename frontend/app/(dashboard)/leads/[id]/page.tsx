'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { api, type Lead } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPhone, timeAgo } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Edit2, Save, X } from 'lucide-react'
import Link from 'next/link'

const STAGE_CONFIG = {
  1: { label: 'Novo Lead', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  2: { label: 'Qualificado', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  3: { label: 'Convertido', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
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

  if (!lead) {
    return (
      <div className="p-6 flex items-center gap-2 text-zinc-600 text-sm">
        <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-emerald-500 animate-spin" />
        Carregando...
      </div>
    )
  }

  const stage = lead.stage as 1 | 2 | 3
  const cfg = STAGE_CONFIG[stage]

  return (
    <div className="p-6 max-w-2xl">
      {/* Back */}
      <Link
        href="/pipeline"
        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors mb-5"
      >
        <ArrowLeft size={13} />
        Pipeline
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">
            {lead.name || formatPhone(lead.phone)}
          </h1>
          <span
            className={`inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium border ${cfg.border} ${cfg.bg} ${cfg.color}`}
          >
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X size={14} className="mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save size={14} className="mr-1" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 size={14} className="mr-1" /> Editar
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {editing ? (
          <div className="p-5 space-y-4">
            <EditField
              label="Nome"
              value={form.name}
              onChange={(v) => setForm((p) => ({ ...p, name: v }))}
            />
            <EditField
              label="E-mail"
              value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
              type="email"
            />
            <EditField
              label="Telefone"
              value={form.phone}
              onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
            />
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            <ReadField label="Nome" value={lead.name} />
            <ReadField label="E-mail" value={lead.email} />
            <ReadField label="Telefone" value={formatPhone(lead.phone)} mono />
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
              <div className="flex gap-4 px-5 py-3">
                <span className="text-xs text-zinc-600 w-36 shrink-0 pt-0.5">Valor</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  R$ {Number(lead.conversion_value).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EditField({
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
    <div className="space-y-1.5">
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
    <div className="flex gap-4 px-5 py-3">
      <span className="text-xs text-zinc-600 w-36 shrink-0 pt-0.5 uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-sm ${
          value
            ? mono
              ? 'font-mono text-xs text-zinc-300'
              : 'text-zinc-200'
            : 'text-zinc-700'
        }`}
      >
        {value || '—'}
      </span>
    </div>
  )
}
