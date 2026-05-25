import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/tenant'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { UserRoleManager } from './user-role-manager'

export default async function AdminUsersPage() {
  const { profile } = await getUserProfile()
  if (profile?.role !== 'super_admin') redirect('/pipeline')

  const supabase = createClient()

  const { data: users } = await supabase
    .from('users')
    .select('id, name, role, tenant_id, created_at')
    .order('created_at', { ascending: false })

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .order('name')

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Admin
          </Link>
          <h1 className="text-lg font-bold text-zinc-100 mt-1">Usuários</h1>
          <p className="text-xs text-zinc-500">{users?.length ?? 0} usuários cadastrados</p>
        </div>
        <Link
          href="/admin/users/invite"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-semibold hover:bg-emerald-400 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
        >
          <UserPlus size={13} />
          Convidar
        </Link>
      </div>

      <UserRoleManager
        users={users ?? []}
        tenants={tenants ?? []}
      />
    </div>
  )
}
