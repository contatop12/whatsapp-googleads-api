'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { usePermissions } from '@/hooks/usePermissions'

const SLUG_RE = /^[a-z0-9-]+$/

export function OrganizationForm({ tenantId }: { tenantId: string }) {
  const { canEditSlug } = usePermissions()
  const { toast } = useToast()
  const [form, setForm] = useState({ name: '', slug: '', display_name: '' })
  const [slugError, setSlugError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tenants')
      .select('name, slug')
      .eq('id', tenantId)
      .single()
      .then(({ data }) => {
        if (data) setForm({ name: data.name, slug: data.slug, display_name: data.name })
      })
  }, [tenantId])

  const validateSlug = (value: string) => {
    if (!SLUG_RE.test(value)) {
      setSlugError('Somente letras minúsculas, números e hífens')
      return false
    }
    setSlugError('')
    return true
  }

  const handleSave = async () => {
    if (canEditSlug && form.slug && !validateSlug(form.slug)) return
    setSaving(true)
    const supabase = createClient()
    const updates: Record<string, string> = { name: form.name }
    if (canEditSlug) updates.slug = form.slug

    const { error } = await supabase.from('tenants').update(updates).eq('id', tenantId)

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Organização atualizada' })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-zinc-300 text-xs">Nome da organização</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Label className="text-zinc-300 text-xs">Slug</Label>
          {!canEditSlug && (
            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700 py-0">
              Somente Super Admin
            </Badge>
          )}
        </div>
        <Input
          value={form.slug}
          onChange={(e) => {
            setForm((p) => ({ ...p, slug: e.target.value }))
            if (e.target.value) validateSlug(e.target.value)
          }}
          disabled={!canEditSlug}
          className={cn(
            'bg-zinc-800 border-zinc-700 text-zinc-100',
            !canEditSlug && 'opacity-50 cursor-not-allowed'
          )}
        />
        {slugError && <p className="text-xs text-red-400 mt-1">{slugError}</p>}
        {form.slug && !slugError && (
          <p className="text-xs text-zinc-500 mt-1">
            app.dominio.com/<span className="text-[#7F77DD]">{form.slug}</span>
          </p>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </Button>
    </div>
  )
}
