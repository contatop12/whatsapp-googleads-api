'use client'

import { useState, useEffect } from 'react'
import { api, type Tenant } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Info } from 'lucide-react'

type HelpContent = {
  title: string
  steps: string[]
  example?: string
  note?: string
}

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
      <Section
        title="Conta"
        help={{
          title: 'Como encontrar seu Customer ID',
          steps: [
            'Acesse sua conta no Google Ads (ads.google.com).',
            'Clique no ícone de engrenagem (⚙) no canto superior direito e selecione "Configurações".',
            'Na seção "Detalhes da conta", localize o campo "ID do cliente".',
            'Copie o número de 10 dígitos — ele aparece no formato XXX-XXX-XXXX.',
            'Cole aqui sem os traços. Exemplo: se exibido como 123-456-7890, digite 1234567890.',
          ],
          note: 'Cada conta Google Ads tem um Customer ID único. Use o ID da conta que veiculará os anúncios.',
        }}
      >
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
      <Section
        title="Etapa 1 — Novo Lead"
        dot="bg-amber-400"
        help={{
          title: 'Ação de conversão — Novo Lead',
          steps: [
            'No Google Ads, clique em "Ferramentas e configurações" → "Medição" → "Conversões".',
            'Clique em "+ Nova ação de conversão" e escolha "Importar".',
            'Selecione "Cliques do Google (gclid)" e clique em continuar.',
            'Escolha a categoria "Contato".',
            'Dê um nome como "whatsapp_novo_lead" e configure o valor como 0.',
            'Em "Otimização de ações", selecione "Secundária".',
            'Salve e copie o ID numérico da URL: ads.google.com/aw/conversions/detail?ctId=XXXXXXXXXX',
            'Cole apenas o número (ex: 7624173249) no campo acima.',
          ],
          example: '7624173249',
          note: 'Etapa 1 deve ser Secundária — é apenas sinal de chegada do lead, não deve influenciar o Smart Bidding.',
        }}
      >
        <Field
          label="ID da ação de conversão (ctId numérico)"
          id="conv1"
          value={form.google_ads_conversion_new_lead}
          onChange={set('google_ads_conversion_new_lead')}
          placeholder="7624173249"
          hint="Número da URL do Google Ads: ?ctId=XXXXXXXXXX"
        />
      </Section>

      {/* Stage 2 */}
      <Section
        title="Etapa 2 — Qualificado"
        dot="bg-blue-400"
        help={{
          title: 'Ação de conversão — Lead Qualificado',
          steps: [
            'Crie uma nova ação de conversão no Google Ads.',
            'Escolha "Importar" → "Cliques do Google (gclid)".',
            'Selecione a categoria "Lead qualificado".',
            'Dê um nome como "whatsapp_qualificado".',
            'Para o valor, selecione "Usar o mesmo valor para cada conversão" e defina o valor fixo abaixo.',
            'Em "Otimização de ações", selecione "Primária".',
            'Copie o ID numérico da URL (?ctId=XXXXXXXXXX) e cole no campo acima.',
          ],
          example: '7624173250',
          note: 'O "Valor fixo" é enviado ao Google Ads toda vez que um lead é movido para esta etapa.',
        }}
      >
        <Field
          label="ID da ação de conversão (ctId numérico)"
          id="conv2"
          value={form.google_ads_conversion_qualified}
          onChange={set('google_ads_conversion_qualified')}
          placeholder="7624173250"
          hint="Número da URL do Google Ads: ?ctId=XXXXXXXXXX"
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
      <Section
        title="Etapa 3 — Convertido"
        dot="bg-emerald-400"
        help={{
          title: 'Ação de conversão — Venda Convertida',
          steps: [
            'Crie uma nova ação de conversão no Google Ads.',
            'Escolha "Importar" → "Cliques do Google (gclid)".',
            'Selecione a categoria "Compra" ou "Venda".',
            'Dê um nome como "whatsapp_convertido".',
            'Para o valor, selecione "Usar valores diferentes para cada conversão" — o sistema enviará o valor real informado pelo vendedor.',
            'Defina um "Valor padrão" como fallback caso o valor real não esteja disponível.',
            'Em "Otimização de ações", selecione "Primária".',
            'Copie o ID numérico da URL (?ctId=XXXXXXXXXX) e cole no campo acima.',
          ],
          example: '7624173251',
          note: 'O sistema envia o valor real da venda. O "Valor padrão" é fallback quando o valor não está disponível.',
        }}
      >
        <Field
          label="ID da ação de conversão (ctId numérico)"
          id="conv3"
          value={form.google_ads_conversion_converted}
          onChange={set('google_ads_conversion_converted')}
          placeholder="7624173251"
          hint="Número da URL do Google Ads: ?ctId=XXXXXXXXXX"
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
  help,
}: {
  title: string
  children: React.ReactNode
  dot?: string
  help?: HelpContent
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
          {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest flex-1">{title}</p>
          {help && (
            <button
              onClick={() => setOpen(true)}
              className="p-1 text-zinc-600 hover:text-[#7F77DD] hover:bg-[#7F77DD]/10 rounded transition-colors"
              title="Como configurar"
            >
              <Info size={14} />
            </button>
          )}
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>

      {help && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-zinc-100 flex items-center gap-2">
                <Info size={16} className="text-[#7F77DD]" />
                {help.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <ol className="space-y-2.5">
                {help.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-zinc-300">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#7F77DD]/20 text-[#7F77DD] text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {help.example && (
                <div className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2">
                  <p className="text-[10px] text-zinc-500 mb-1 uppercase tracking-widest">Exemplo</p>
                  <p className="text-sm font-mono text-[#7F77DD]">{help.example}</p>
                </div>
              )}
              {help.note && (
                <p className="text-xs text-zinc-500 border-l-2 border-zinc-700 pl-3">{help.note}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
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
