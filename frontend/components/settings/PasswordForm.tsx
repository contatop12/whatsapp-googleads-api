'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/auth-context'

export function PasswordForm() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<{ next?: string; confirm?: string }>({})
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const e: typeof errors = {}
    if (form.next.length < 8) e.next = 'Mínimo 8 caracteres'
    if (form.next !== form.confirm) e.confirm = 'Senhas não coincidem'
    setErrors(e)
    return !e.next && !e.confirm
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: form.current,
    })

    if (authError) {
      toast({ title: 'Senha atual incorreta', variant: 'destructive' })
      setSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: form.next })

    if (error) {
      toast({ title: 'Erro ao atualizar senha', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Senha atualizada com sucesso' })
      setForm({ current: '', next: '', confirm: '' })
      setErrors({})
    }
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-zinc-300 text-xs">Senha atual</Label>
        <Input
          type="password"
          value={form.current}
          onChange={(e) => setForm((p) => ({ ...p, current: e.target.value }))}
          className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
        />
      </div>

      <div>
        <Label className="text-zinc-300 text-xs">Nova senha</Label>
        <Input
          type="password"
          value={form.next}
          onChange={(e) => setForm((p) => ({ ...p, next: e.target.value }))}
          className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
        />
        {errors.next && <p className="text-xs text-red-400 mt-1">{errors.next}</p>}
      </div>

      <div>
        <Label className="text-zinc-300 text-xs">Confirmar nova senha</Label>
        <Input
          type="password"
          value={form.confirm}
          onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
          className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
        />
        {errors.confirm && <p className="text-xs text-red-400 mt-1">{errors.confirm}</p>}
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando...' : 'Atualizar senha'}
      </Button>
    </div>
  )
}
