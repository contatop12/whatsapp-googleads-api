import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/tenant'
import type { Tenant } from '@/lib/api-types'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { TenantUserManager } from './tenant-user-manager'
import { TenantConfigForm } from './tenant-config-form'

export default async function AdminTenantDetailPage({ params }: { params: { id: string } }) {
  const { profile } = await getUserProfile()
  if (profile?.role !== 'super_admin') redirect('/pipeline')

  const supabase = createClient()

  const [{ data: tenant }, { data: leads }, { data: tenantUsers }, { data: allUsers }] =
    await Promise.all([
      supabase.from('tenants').select('*').eq('id', params.id).single(),
      supabase.from('leads').select('id, stage, created_at').eq('tenant_id', params.id),
      supabase.from('users').select('id, name, role, created_at').eq('tenant_id', params.id),
      supabase
        .from('users')
        .select('id, name, role, tenant_id')
        .is('tenant_id', null)
        .neq('role', 'super_admin'),
    ])

  if (!tenant) notFound()

  const typedTenant = tenant as unknown as Tenant
  const stage1 = leads?.filter((l) => l.stage === 1).length ?? 0
  const stage2 = leads?.filter((l) => l.stage === 2).length ?? 0
  const stage3 = leads?.filter((l) => l.stage === 3).length ?? 0

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="border-b border-zinc-800 pb-4">
        <Link href="/admin/tenants" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Clientes
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-lg font-bold text-zinc-100">{typedTenant.name}</h1>
            <p className="text-xs text-zinc-600 font-mono mt-0.5">/{typedTenant.slug}</p>
          </div>
          <Link
            href={`/pipeline?tenant=${typedTenant.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            <ExternalLink size={12} />
            Ver pipeline
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-2xl font-bold font-mono text-amber-400">{stage1}</p>
          <p className="text-xs text-zinc-500 mt-1">Novos leads</p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center">
          <p className="text-2xl font-bold font-mono text-blue-400">{stage2}</p>
          <p className="text-xs text-zinc-500 mt-1">Qualificados</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-2xl font-bold font-mono text-emerald-400">{stage3}</p>
          <p className="text-xs text-zinc-500 mt-1">Convertidos</p>
        </div>
      </div>

      <TenantConfigForm tenant={typedTenant} />

      <TenantUserManager
        tenantId={typedTenant.id}
        tenantName={typedTenant.name}
        tenantUsers={tenantUsers ?? []}
        availableUsers={allUsers ?? []}
      />
    </div>
  )
}
