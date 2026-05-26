'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { Mail } from 'lucide-react'

type Prefs = {
  lead_stage_changed: boolean
  whatsapp_disconnected: boolean
  conversion_rejected: boolean
  new_lead: boolean
}

const defaults: Prefs = {
  lead_stage_changed: true,
  whatsapp_disconnected: true,
  conversion_rejected: true,
  new_lead: false,
}

const labels: Record<keyof Prefs, { title: string; desc: string }> = {
  lead_stage_changed:   { title: 'Lead avançou de etapa',                desc: 'Quando um lead for movido no pipeline' },
  whatsapp_disconnected:{ title: 'WhatsApp desconectado',                desc: 'Alerta imediato quando a instância cair' },
  conversion_rejected:  { title: 'Conversão rejeitada pelo Google Ads',  desc: 'Quando a API retornar status REJECTED' },
  new_lead:             { title: 'Novo lead recebido',                   desc: 'Cada vez que entrar um lead na etapa 1' },
}

export function NotificationsForm() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [prefs, setPrefs] = useState<Prefs>(defaults)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('users')
      .select('notification_preferences')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.notification_preferences) {
          setPrefs({ ...defaults, ...(data.notification_preferences as Partial<Prefs>) })
        }
      })
  }, [user.id])

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ notification_preferences: prefs })
      .eq('id', user.id)

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Preferências salvas' })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#7F77DD]/10 border border-[#7F77DD]/20">
        <Mail size={13} className="text-[#7F77DD] shrink-0" />
        <p className="text-xs text-zinc-400">Notificações enviadas para <span className="text-zinc-200">{user.email}</span></p>
      </div>

      {(Object.keys(labels) as Array<keyof Prefs>).map((key) => (
        <div key={key} className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-200">{labels[key].title}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{labels[key].desc}</p>
          </div>
          <Switch
            checked={prefs[key]}
            onCheckedChange={(val) => setPrefs((p) => ({ ...p, [key]: val }))}
          />
        </div>
      ))}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar preferências'}
      </Button>
    </div>
  )
}
