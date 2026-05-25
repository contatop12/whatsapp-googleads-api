import { createClient } from '@/lib/supabase/server'
import { WhatsAppQR } from '@/components/whatsapp/whatsapp-qr'
import { resolveTenantId, getUserProfile } from '@/lib/tenant'

export default async function WhatsAppSettingsPage() {
  const { profile } = await getUserProfile()
  const tenantId = await resolveTenantId(profile)

  if (!tenantId) {
    return (
      <div className="p-6">
        <p className="text-zinc-500 text-sm">Tenant não configurado.</p>
      </div>
    )
  }

  const supabase = createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, evolution_instance_status')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    return (
      <div className="p-6">
        <p className="text-zinc-500 text-sm">Tenant não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-lg font-bold text-zinc-100">WhatsApp</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Conecte o WhatsApp para receber e processar mensagens dos leads.
        </p>
      </div>
      <WhatsAppQR
        tenantId={tenant.id}
        initialStatus={tenant.evolution_instance_status as 'disconnected' | 'connecting' | 'connected'}
      />
    </div>
  )
}
