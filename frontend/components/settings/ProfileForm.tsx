'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { usePermissions } from '@/hooks/usePermissions'

type Props = {
  userId: string
  email: string
  name: string | null
  phone?: string | null
}

export function ProfileForm({ userId, email, name, phone }: Props) {
  const { canEditEmail } = usePermissions()
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: name ?? '',
    email,
    phone: phone ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const updates: Record<string, string> = { name: form.name, phone: form.phone }
    if (canEditEmail) updates.email = form.email

    const { error } = await supabase.from('users').update(updates).eq('id', userId)

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Perfil atualizado' })
    }
    setSaving(false)
  }

  const handleCancel = () => {
    setForm({ name: name ?? '', email, phone: phone ?? '' })
  }

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="name" className="text-zinc-300 text-xs">Nome</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Label htmlFor="email" className="text-zinc-300 text-xs">Email</Label>
          {!canEditEmail && (
            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700 py-0">
              Somente Admin
            </Badge>
          )}
        </div>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          disabled={!canEditEmail}
          className={cn(
            'bg-zinc-800 border-zinc-700 text-zinc-100',
            !canEditEmail && 'opacity-50 cursor-not-allowed'
          )}
        />
      </div>

      <div>
        <Label htmlFor="phone" className="text-zinc-300 text-xs">Telefone</Label>
        <Input
          id="phone"
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          placeholder="Opcional"
          className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
