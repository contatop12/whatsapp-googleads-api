'use client'

import { useState, useEffect } from 'react'
import { api, type Tenant } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

export default function GoogleAdsSettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [form, setForm] = useState({
    google_ads_customer_id: '',
    google_ads_conversion_new_lead: '',
    google_ads_conversion_qualified: '',
    google_ads_conversion_converted: '',
    conversion_value_qualified: '',
    conversion_value_converted: '',
  })
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
      setForm({
        google_ads_customer_id: t.google_ads_customer_id || '',
        google_ads_conversion_new_lead: t.google_ads_conversion_new_lead || '',
        google_ads_conversion_qualified: t.google_ads_conversion_qualified || '',
        google_ads_conversion_converted: t.google_ads_conversion_converted || '',
        conversion_value_qualified: t.conversion_value_qualified?.toString() || '',
        conversion_value_converted: t.conversion_value_converted?.toString() || '',
      })
    }
    load()
  }, [])

  async function handleSave() {
    if (!tenant) return
    setSaving(true)
    try {
      await api.tenants.update(tenant.id, {
        google_ads_customer_id: form.google_ads_customer_id || null,
        google_ads_conversion_new_lead: form.google_ads_conversion_new_lead || null,
        google_ads_conversion_qualified: form.google_ads_conversion_qualified || null,
        google_ads_conversion_converted: form.google_ads_conversion_converted || null,
        conversion_value_qualified: form.conversion_value_qualified
          ? parseFloat(form.conversion_value_qualified)
          : null,
        conversion_value_converted: form.conversion_value_converted
          ? parseFloat(form.conversion_value_converted)
          : null,
      })
      toast({ title: 'Configurações salvas' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar'
      toast({ title: 'Erro ao salvar', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }))

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-lg font-bold text-zinc-100">Google Ads</h1>
        <p className="text-xs text-zinc-500 mt-1">Credenciais e ações de conversão por etapa</p>
      </div>

      {/* Account */}
      <Section title="Conta">
        <Field
          label="Customer ID"
          id="customer_id"
          value={form.google_ads_customer_id}
          onChange={set('google_ads_customer_id')}
          placeholder="1234567890"
          hint="Sem traços. Encontre em Ferramentas → Configurações."
        />
      </Section>

      {/* Stage 1 */}
      <Section title="Etapa 1 — Novo Lead" dot="bg-amber-400">
        <Field
          label="ID da ação de conversão"
          id="conv1"
          value={form.google_ads_conversion_new_lead}
          onChange={set('google_ads_conversion_new_lead')}
          placeholder="AW-XXXXXXXXXX/XXXXX"
        />
      </Section>

      {/* Stage 2 */}
      <Section title="Etapa 2 — Qualificado" dot="bg-blue-400">
        <Field
          label="ID da ação de conversão"
          id="conv2"
          value={form.google_ads_conversion_qualified}
          onChange={set('google_ads_conversion_qualified')}
          placeholder="AW-XXXXXXXXXX/XXXXX"
        />
        <Field
          label="Valor fixo (R$)"
          id="val2"
          value={form.conversion_value_qualified}
          onChange={set('conversion_value_qualified')}
          type="number"
          placeholder="0.00"
        />
      </Section>

      {/* Stage 3 */}
      <Section title="Etapa 3 — Convertido" dot="bg-emerald-400">
        <Field
          label="ID da ação de conversão"
          id="conv3"
          value={form.google_ads_conversion_converted}
          onChange={set('google_ads_conversion_converted')}
          placeholder="AW-XXXXXXXXXX/XXXXX"
        />
        <Field
          label="Valor padrão (R$) — sobrescrito pelo valor real"
          id="val3"
          value={form.conversion_value_converted}
          onChange={set('conversion_value_converted')}
          type="number"
          placeholder="0.00"
        />
      </Section>

      <Button onClick={handleSave} disabled={saving || !tenant}>
        {saving ? 'Salvando...' : 'Salvar configurações'}
      </Button>
    </div>
  )
}

function Section({
  title,
  children,
  dot,
}: {
  title: string
  children: React.ReactNode
  dot?: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  id,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
}: {
  label: string
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  placeholder?: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} className="font-mono" />
      {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
    </div>
  )
}
