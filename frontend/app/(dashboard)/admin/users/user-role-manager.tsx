'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import type { User, UserRole } from '@/lib/api-types'
import type { Tenant } from '@/lib/api-types'

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  client: 'Cliente',
}
const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  admin: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  client: 'border-zinc-700 bg-zinc-800 text-zinc-400',
}

interface Props {
  users: Pick<User, 'id' | 'name' | 'role' | 'tenant_id' | 'created_at'>[]
  tenants: Pick<Tenant, 'id' | 'name' | 'slug'>[]
}

export function UserRoleManager({ users: initialUsers, tenants }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [saving, setSaving] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  async function updateUser(
    userId: string,
    updates: { role?: UserRole; tenant_id?: string | null }
  ) {
    setSaving(userId)
    const supabase = createClient()
    const { error } = await supabase.from('users').update(updates).eq('id', userId)
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' })
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
      )
      toast({ title: 'Usuário atualizado' })
      router.refresh()
    }
    setSaving(null)
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 px-4 py-2 border-b border-zinc-800 bg-zinc-950/50 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
        <div className="col-span-4">Usuário</div>
        <div className="col-span-3">Nível de acesso</div>
        <div className="col-span-4">Tenant vinculado</div>
        <div className="col-span-1" />
      </div>

      {users.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-zinc-600">Nenhum usuário cadastrado.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {users.map((u) => {
            const isSuperAdmin = u.role === 'super_admin'
            const isSaving = saving === u.id

            return (
              <div key={u.id} className="grid grid-cols-12 items-center px-4 py-3 gap-2">
                {/* Name */}
                <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <span className="text-xs text-zinc-400 font-medium">
                      {(u.name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{u.name || 'Sem nome'}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ROLE_COLORS[u.role as UserRole] ?? ROLE_COLORS.client}`}>
                      {ROLE_LABELS[u.role as UserRole] ?? u.role}
                    </span>
                  </div>
                </div>

                {/* Role selector */}
                <div className="col-span-3">
                  {isSuperAdmin ? (
                    <span className="text-xs text-zinc-600 italic">Bloqueado</span>
                  ) : (
                    <select
                      value={u.role}
                      disabled={isSaving}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })}
                      className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-50"
                    >
                      <option value="client">Cliente</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </div>

                {/* Tenant selector */}
                <div className="col-span-4">
                  {isSuperAdmin ? (
                    <span className="text-xs text-zinc-600 italic">—</span>
                  ) : (
                    <select
                      value={u.tenant_id ?? ''}
                      disabled={isSaving}
                      onChange={(e) =>
                        updateUser(u.id, { tenant_id: e.target.value || null })
                      }
                      className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-50"
                    >
                      <option value="">Sem tenant</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Saving indicator */}
                <div className="col-span-1 flex justify-end">
                  {isSaving && (
                    <div className="w-3 h-3 rounded-full border border-emerald-500 border-t-transparent animate-spin" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
