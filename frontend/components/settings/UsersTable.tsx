'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { Trash2, UserPlus } from 'lucide-react'
import type { UserRole } from '@/lib/api-types'

type UserRow = {
  id: string
  name: string | null
  role: UserRole
}

const roleBadge: Record<UserRole, string> = {
  super_admin: 'bg-amber-500/20 text-amber-400',
  admin:       'bg-[#7F77DD]/20 text-[#7F77DD]',
  client:      'bg-emerald-500/20 text-emerald-400',
}

const roleLabel: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  client:      'Cliente',
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export function UsersTable({ tenantId }: { tenantId: string }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'client'>('client')
  const [loading, setLoading] = useState(false)

  const fetchUsers = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('tenant_id', tenantId)
    setUsers(data ?? [])
  }

  useEffect(() => { fetchUsers() }, [tenantId])

  const handleInvite = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, tenant_id: tenantId }),
    })
    const data = await res.json()
    if (res.ok) {
      toast({ title: 'Convite enviado' })
      setInviteOpen(false)
      setInviteEmail('')
    } else {
      toast({ title: 'Erro ao convidar', description: data.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('users').delete().eq('id', deleteTarget.id)
    if (error) {
      toast({ title: 'Erro ao remover usuário', variant: 'destructive' })
    } else {
      toast({ title: 'Usuário removido' })
      setUsers((u) => u.filter((x) => x.id !== deleteTarget.id))
    }
    setDeleteTarget(null)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus size={14} />
          Convidar usuário
        </Button>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-800"
          >
            <div className="w-8 h-8 rounded-full bg-[#7F77DD]/20 flex items-center justify-center text-xs font-bold text-[#7F77DD] shrink-0">
              {initials(u.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200 truncate">{u.name ?? 'Sem nome'}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${roleBadge[u.role]}`}>
              {roleLabel[u.role]}
            </span>
            {u.id !== user.id && (
              <button
                onClick={() => setDeleteTarget(u)}
                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                aria-label="Remover usuário"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-sm text-zinc-500 py-4 text-center">Nenhum usuário no tenant.</p>
        )}
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Convidar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-zinc-400">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'client')}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-2"
              >
                <option value="client">Cliente</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar convite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Remover usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Remover <span className="text-zinc-200">{deleteTarget?.name ?? 'este usuário'}</span>?
            Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
