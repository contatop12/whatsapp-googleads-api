import { createClient } from '@/lib/supabase/server'
import { WhatsAppQR } from '@/components/whatsapp/whatsapp-qr'
import { resolveTenantId, getUserProfile } from '@/lib/tenant'

export default async function WhatsAppSettingsPage() {
  const { profile } = await getUserProfile()
  const tenantId = await resolveTenantId(profile)

  if (!tenantId) {
    return <div className="p-6 text-slate-500">Tenant não configurado.</div>
  }

  const supabase = createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, evolution_instance_status')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    return <div className="p-6 text-slate-500">Tenant não encontrado.</div>
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-2">WhatsApp</h1>
      <p className="text-sm text-slate-500 mb-6">
        Conecte o WhatsApp para receber mensagens dos leads.
      </p>
      <WhatsAppQR
        tenantId={tenant.id}
        initialStatus={tenant.evolution_instance_status as 'disconnected' | 'connecting' | 'connected'}
      />
    </div>
  )
}
