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
      <div>
        <h1 className="text-xl font-semibold">Google Ads</h1>
        <p className="text-sm text-slate-500">Credenciais e nomes de conversão por etapa</p>
      </div>

      <div className="space-y-4 bg-white rounded-lg border p-4">
        <Field
          label="Customer ID (ex: 1234567890)"
          id="customer_id"
          value={form.google_ads_customer_id}
          onChange={set('google_ads_customer_id')}
        />
        <Field
          label="Conversão Etapa 1 — Novo Lead (ID da ação)"
          id="conv1"
          value={form.google_ads_conversion_new_lead}
          onChange={set('google_ads_conversion_new_lead')}
        />
        <Field
          label="Conversão Etapa 2 — Qualificado (ID da ação)"
          id="conv2"
          value={form.google_ads_conversion_qualified}
          onChange={set('google_ads_conversion_qualified')}
        />
        <Field
          label="Valor fixo Etapa 2 (R$)"
          id="val2"
          value={form.conversion_value_qualified}
          onChange={set('conversion_value_qualified')}
          type="number"
        />
        <Field
          label="Conversão Etapa 3 — Convertido (ID da ação)"
          id="conv3"
          value={form.google_ads_conversion_converted}
          onChange={set('google_ads_conversion_converted')}
        />
        <Field
          label="Valor fixo Etapa 3 — automático por palavra-chave (R$)"
          id="val3"
          value={form.conversion_value_converted}
          onChange={set('conversion_value_converted')}
          type="number"
        />
      </div>

      <Button onClick={handleSave} disabled={saving || !tenant}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}

function Field({
  label,
  id,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={onChange} />
    </div>
  )
}
