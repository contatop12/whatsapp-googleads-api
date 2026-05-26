'use client'

import { useState } from 'react'
import { api, type Tenant } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { WhatsAppQR } from '@/components/whatsapp/whatsapp-qr'
import { WhatsAppInstancePicker } from '@/components/whatsapp/whatsapp-instance-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, Plus, Globe, MessageCircle, Settings, Zap, Info } from 'lucide-react'

type HelpContent = { title: string; steps: string[]; example?: string; note?: string }

function normalizeOrigin(value: string): string | null {
  const origin = value.trim().replace(/\/+$/, '')
  if (!/^https?:\/\/[^\s/]+$/i.test(origin)) return null
  return origin
}

export function TenantConfigForm({ tenant: initial }: { tenant: Tenant }) {
  const { toast } = useToast()
  const tenantId = initial.id
  const [waRefreshKey, setWaRefreshKey] = useState(0)
  const [linkedInstance, setLinkedInstance] = useState(initial.evolution_api_instance)
  const [waStatus, setWaStatus] = useState(initial.evolution_instance_status)

  const [gads, setGads] = useState({
    google_ads_customer_id: initial.google_ads_customer_id || '',
    google_ads_conversion_new_lead: initial.google_ads_conversion_new_lead || '',
    google_ads_conversion_qualified: initial.google_ads_conversion_qualified || '',
    google_ads_conversion_converted: initial.google_ads_conversion_converted || '',
    conversion_value_qualified: initial.conversion_value_qualified?.toString() || '',
    conversion_value_converted: initial.conversion_value_converted?.toString() || '',
  })
  const [savingGads, setSavingGads] = useState(false)
  const [helpOpen, setHelpOpen] = useState<string | null>(null)

  const HELP: Record<string, HelpContent> = {
    customer_id: {
      title: 'Como encontrar seu Customer ID',
      steps: [
        'Acesse sua conta no Google Ads (ads.google.com).',
        'Clique no ícone de engrenagem (⚙) no canto superior direito e selecione "Configurações".',
        'Na seção "Detalhes da conta", localize o campo "ID do cliente".',
        'Copie o número de 10 dígitos — ele aparece no formato XXX-XXX-XXXX.',
        'Cole aqui sem os traços. Exemplo: se exibido como 123-456-7890, digite 1234567890.',
      ],
      note: 'Cada conta Google Ads tem um Customer ID único. Use o ID da conta que veiculará os anúncios.',
    },
    etapa1: {
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
    },
    etapa2: {
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
    },
    etapa3: {
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
    },
  }

  const [qualified, setQualified] = useState<string[]>(initial.keywords_qualified || [])
  const [converted, setConverted] = useState<string[]>(initial.keywords_converted || [])
  const [inputQ, setInputQ] = useState('')
  const [inputC, setInputC] = useState('')
  const [savingKw, setSavingKw] = useState(false)

  const [origins, setOrigins] = useState<string[]>(initial.allowed_origins || [])
  const [inputOrigin, setInputOrigin] = useState('')
  const [savingSites, setSavingSites] = useState(false)

  async function saveGads() {
    setSavingGads(true)
    try {
      await api.tenants.update(tenantId, {
        google_ads_customer_id: gads.google_ads_customer_id || null,
        google_ads_conversion_new_lead: gads.google_ads_conversion_new_lead || null,
        google_ads_conversion_qualified: gads.google_ads_conversion_qualified || null,
        google_ads_conversion_converted: gads.google_ads_conversion_converted || null,
        conversion_value_qualified: gads.conversion_value_qualified ? parseFloat(gads.conversion_value_qualified) : null,
        conversion_value_converted: gads.conversion_value_converted ? parseFloat(gads.conversion_value_converted) : null,
      })
      toast({ title: 'Google Ads salvo' })
    } catch (err: unknown) {
      toast({ title: 'Erro ao salvar', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' })
    } finally {
      setSavingGads(false)
    }
  }

  async function saveKeywords() {
    setSavingKw(true)
    try {
      await api.tenants.update(tenantId, { keywords_qualified: qualified, keywords_converted: converted })
      toast({ title: 'Palavras-chave salvas' })
    } catch (err: unknown) {
      toast({ title: 'Erro ao salvar', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' })
    } finally {
      setSavingKw(false)
    }
  }

  async function saveSites() {
    setSavingSites(true)
    try {
      await api.tenants.update(tenantId, { allowed_origins: origins })
      toast({ title: 'Sites salvos' })
    } catch (err: unknown) {
      toast({ title: 'Erro ao salvar', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' })
    } finally {
      setSavingSites(false)
    }
  }

  function addOrigin() {
    const normalized = normalizeOrigin(inputOrigin)
    if (!normalized) {
      toast({ title: 'URL inválida', description: 'Use: https://www.site.com.br', variant: 'destructive' })
      return
    }
    if (origins.includes(normalized)) {
      toast({ title: 'Site já na lista' })
      return
    }
    setOrigins((p) => [...p, normalized])
    setInputOrigin('')
  }

  const setG = (key: keyof typeof gads) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setGads((p) => ({ ...p, [key]: e.target.value }))

  return (
    <div className="space-y-8">
      <Section title="WhatsApp" icon={<MessageCircle size={14} />}>
        <div className="space-y-4">
          <WhatsAppInstancePicker
            tenantId={tenantId}
            tenantName={initial.name}
            currentInstance={linkedInstance}
            onLinked={(result) => {
              setLinkedInstance(result.instance.instance_name)
              setWaStatus(result.evolution_instance_status as typeof waStatus)
              setWaRefreshKey((k) => k + 1)
            }}
          />
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <p className="relative mx-auto w-fit bg-zinc-900 px-3 text-[10px] uppercase tracking-widest text-zinc-600">
              ou conectar via QR
            </p>
          </div>
          <WhatsAppQR
            key={waRefreshKey}
            tenantId={tenantId}
            initialStatus={waStatus}
          />
        </div>
      </Section>

      <Section title="Google Ads" icon={<Settings size={14} />}>
        <div className="space-y-5">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Customer ID" value={gads.google_ads_customer_id} onChange={setG('google_ads_customer_id')} placeholder="1234567890" hint="Sem traços." />
            </div>
            <button onClick={() => setHelpOpen('customer_id')} className="mb-0.5 p-1.5 text-zinc-600 hover:text-[#7F77DD] hover:bg-[#7F77DD]/10 rounded transition-colors" title="Como encontrar o Customer ID">
              <Info size={14} />
            </button>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <p className="text-[10px] font-medium text-amber-400 uppercase tracking-widest flex-1">Etapa 1 — Novo Lead</p>
              <button onClick={() => setHelpOpen('etapa1')} className="p-1 text-zinc-600 hover:text-[#7F77DD] hover:bg-[#7F77DD]/10 rounded transition-colors" title="Como configurar">
                <Info size={13} />
              </button>
            </div>
            <Field label="ID da ação (ctId numérico)" value={gads.google_ads_conversion_new_lead} onChange={setG('google_ads_conversion_new_lead')} placeholder="7624173249" hint="Número da URL: ?ctId=XXXXXXXXXX" />
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <p className="text-[10px] font-medium text-blue-400 uppercase tracking-widest flex-1">Etapa 2 — Qualificado</p>
              <button onClick={() => setHelpOpen('etapa2')} className="p-1 text-zinc-600 hover:text-[#7F77DD] hover:bg-[#7F77DD]/10 rounded transition-colors" title="Como configurar">
                <Info size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ID da ação (ctId numérico)" value={gads.google_ads_conversion_qualified} onChange={setG('google_ads_conversion_qualified')} placeholder="7624173250" hint="Número da URL: ?ctId=XXXXXXXXXX" />
              <Field label="Valor fixo (R$)" value={gads.conversion_value_qualified} onChange={setG('conversion_value_qualified')} type="number" placeholder="0.00" />
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-widest flex-1">Etapa 3 — Convertido</p>
              <button onClick={() => setHelpOpen('etapa3')} className="p-1 text-zinc-600 hover:text-[#7F77DD] hover:bg-[#7F77DD]/10 rounded transition-colors" title="Como configurar">
                <Info size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ID da ação (ctId numérico)" value={gads.google_ads_conversion_converted} onChange={setG('google_ads_conversion_converted')} placeholder="7624173251" hint="Número da URL: ?ctId=XXXXXXXXXX" />
              <Field label="Valor padrão (R$)" value={gads.conversion_value_converted} onChange={setG('conversion_value_converted')} type="number" placeholder="0.00" />
            </div>
          </div>

          <Button onClick={saveGads} disabled={savingGads}>
            {savingGads ? 'Salvando...' : 'Salvar Google Ads'}
          </Button>
        </div>
      </Section>

      {/* Help dialogs */}
      {Object.entries(HELP).map(([key, help]) => (
        <Dialog key={key} open={helpOpen === key} onOpenChange={(o) => !o && setHelpOpen(null)}>
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
      ))}

      <Section title="Palavras-chave" icon={<Zap size={14} />}>
        <div className="space-y-4">
          <KeywordGroup
            label="Etapa 1 → 2 — Qualificado"
            dot="bg-blue-400"
            tagColor="bg-blue-500/10 border-blue-500/20 text-blue-300"
            keywords={qualified}
            input={inputQ}
            onInputChange={setInputQ}
            onAdd={() => { if (inputQ.trim()) { setQualified((p) => [...p, inputQ.trim()]); setInputQ('') } }}
            onRemove={(kw) => setQualified((p) => p.filter((k) => k !== kw))}
          />
          <KeywordGroup
            label="Etapa 2 → 3 — Convertido"
            dot="bg-emerald-400"
            tagColor="bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            keywords={converted}
            input={inputC}
            onInputChange={setInputC}
            onAdd={() => { if (inputC.trim()) { setConverted((p) => [...p, inputC.trim()]); setInputC('') } }}
            onRemove={(kw) => setConverted((p) => p.filter((k) => k !== kw))}
          />
          <Button onClick={saveKeywords} disabled={savingKw}>
            {savingKw ? 'Salvando...' : 'Salvar palavras-chave'}
          </Button>
        </div>
      </Section>

      <Section title="Sites permitidos" icon={<Globe size={14} />}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={inputOrigin}
              onChange={(e) => setInputOrigin(e.target.value)}
              placeholder="https://www.seusite.com.br"
              onKeyDown={(e) => e.key === 'Enter' && addOrigin()}
              className="font-mono"
            />
            <Button size="icon" variant="outline" onClick={addOrigin} type="button">
              <Plus size={15} />
            </Button>
          </div>
          {origins.length === 0 ? (
            <p className="text-xs text-zinc-700 py-1">Nenhum site cadastrado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {origins.map((o) => (
                <span key={o} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-zinc-700 bg-zinc-800 text-xs font-mono text-zinc-300">
                  {o}
                  <button type="button" onClick={() => setOrigins((p) => p.filter((x) => x !== o))} className="text-zinc-600 hover:text-zinc-300 transition-colors" aria-label={`Remover ${o}`}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <Button onClick={saveSites} disabled={savingSites}>
            {savingSites ? 'Salvando...' : 'Salvar sites'}
          </Button>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
        <span className="text-zinc-500">{icon}</span>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', placeholder, hint,
}: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string; placeholder?: string; hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={onChange} placeholder={placeholder} className="font-mono" />
      {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
    </div>
  )
}

function KeywordGroup({
  label, dot, tagColor, keywords, input, onInputChange, onAdd, onRemove,
}: {
  label: string; dot: string; tagColor: string; keywords: string[]; input: string
  onInputChange: (v: string) => void; onAdd: () => void; onRemove: (kw: string) => void
}) {
  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950/30">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <p className="text-[11px] text-zinc-500">{label}</p>
        <span className="ml-auto text-[11px] text-zinc-700 font-mono">{keywords.length}</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Palavra-chave..."
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            className="font-mono text-xs"
          />
          <Button size="icon" variant="outline" onClick={onAdd} type="button">
            <Plus size={13} />
          </Button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span key={kw} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono ${tagColor}`}>
                {kw}
                <button type="button" onClick={() => onRemove(kw)} className="hover:opacity-60">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
