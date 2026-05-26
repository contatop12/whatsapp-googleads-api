import { redirect } from 'next/navigation'
import { getUserProfile, resolveTenantId } from '@/lib/tenant'
import { UsersTable } from '@/components/settings/UsersTable'

export default async function UsersPage() {
  const { profile } = await getUserProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'client') redirect('/settings/profile')

  const tenantId = await resolveTenantId(profile)
  if (!tenantId) redirect('/settings/profile')

  return (
    <div className="p-6 max-w-2xl">
      <div className="border-b border-zinc-800 pb-4 mb-6">
        <h1 className="text-lg font-bold text-zinc-100">Usuários</h1>
        <p className="text-xs text-zinc-500 mt-1">Gerencie os membros do tenant.</p>
      </div>
      <UsersTable tenantId={tenantId} />
    </div>
  )
}
