'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Users, UserPlus, X } from 'lucide-react'
import type { User } from '@/lib/api-types'

interface Props {
  tenantId: string
  tenantName: string
  tenantUsers: Pick<User, 'id' | 'name' | 'role' | 'created_at'>[]
  availableUsers: Pick<User, 'id' | 'name' | 'role' | 'tenant_id'>[]
}

const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', client: 'Cliente' }
const ROLE_COLORS = {
  super_admin: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  admin: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  client: 'border-zinc-700 bg-zinc-800 text-zinc-400',
}

export function TenantUserManager({ tenantId, tenantName, tenantUsers, availableUsers }: Props) {
  const [users, setUsers] = useState(tenantUsers)
  const [available, setAvailable] = useState(availableUsers)
  const [assigning, setAssigning] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const { toast } = useToast()
  const router = useRouter()

  async function assignUser() {
    if (!selectedUserId) return
    setAssigning(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ tenant_id: tenantId })
      .eq('id', selectedUserId)

    if (error) {
      toast({ title: 'Erro ao vincular usuário', description: error.message, variant: 'destructive' })
    } else {
      const user = available.find((u) => u.id === selectedUserId)
      if (user) {
        setUsers((prev) => [...prev, { ...user, created_at: new Date().toISOString() }])
        setAvailable((prev) => prev.filter((u) => u.id !== selectedUserId))
      }
      setSelectedUserId('')
      toast({ title: `Usuário vinculado a ${tenantName}` })
      router.refresh()
    }
    setAssigning(false)
  }

  async function removeUser(userId: string) {
    setRemoving(userId)
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ tenant_id: null })
      .eq('id', userId)

    if (error) {
      toast({ title: 'Erro ao remover usuário', description: error.message, variant: 'destructive' })
    } else {
      const user = users.find((u) => u.id === userId)
      if (user) {
        setAvailable((prev) => [...prev, { ...user, tenant_id: null }])
        setUsers((prev) => prev.filter((u) => u.id !== userId))
      }
      toast({ title: 'Usuário removido do tenant' })
      router.refresh()
    }
    setRemoving(null)
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-zinc-500" />
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Usuários do tenant</p>
          <span className="text-xs font-mono text-zinc-600">{users.length}</span>
        </div>
      </div>

      {/* Assign new user */}
      {available.length > 0 && (
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="">Selecionar usuário para vincular...</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.id} ({ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role})
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={assignUser}
            disabled={!selectedUserId || assigning}
            className="shrink-0"
          >
            <UserPlus size={13} className="mr-1" />
            {assigning ? 'Vinculando...' : 'Vincular'}
          </Button>
        </div>
      )}

      {/* User list */}
      {users.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Users size={24} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-xs text-zinc-600">Nenhum usuário vinculado.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                <span className="text-xs text-zinc-400 font-medium">
                  {(u.name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{u.name || 'Sem nome'}</p>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                  ROLE_COLORS[u.role as keyof typeof ROLE_COLORS] ?? ROLE_COLORS.client
                }`}
              >
                {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
              </span>
              <button
                onClick={() => removeUser(u.id)}
                disabled={removing === u.id}
                className="p-1 text-zinc-700 hover:text-red-400 transition-colors rounded"
                title="Remover do tenant"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
