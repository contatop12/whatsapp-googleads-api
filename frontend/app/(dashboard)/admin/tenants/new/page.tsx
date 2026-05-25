'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function NewTenantPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  function generateSlug(n: string) {
    return n
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleNameChange(val: string) {
    setName(val)
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(val))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setLoading(true)
    try {
      const tenant = await api.tenants.create({ name: name.trim(), slug: slug.trim() })
      toast({ title: 'Cliente criado com sucesso' })
      router.push(`/admin/tenants/${tenant.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar cliente'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6">
        <Link href="/admin/tenants" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Clientes
        </Link>
        <h1 className="text-lg font-bold text-zinc-100 mt-2">Novo Cliente</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Cria um tenant dedicado com pipeline isolado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome do cliente</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ex: Clínica Saúde Plus"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug (identificador único)</Label>
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 text-sm font-mono">/</span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="clinica-saude-plus"
              className="font-mono"
              required
            />
          </div>
          <p className="text-[11px] text-zinc-600">Apenas letras minúsculas, números e hífens. Usado nas URLs da API.</p>
        </div>

        <div className="pt-2 flex gap-2">
          <Button type="submit" disabled={loading || !name.trim() || !slug.trim()}>
            {loading ? 'Criando...' : 'Criar cliente'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-xs font-medium text-zinc-500 mb-2">Após criar o cliente:</p>
        <ol className="text-xs text-zinc-600 space-y-1 list-decimal list-inside">
          <li>Acesse o tenant criado e configure Google Ads + WhatsApp</li>
          <li>Convide um usuário em <Link href="/admin/users/invite" className="text-emerald-500 hover:text-emerald-400">Usuários → Convidar</Link></li>
          <li>Atribua o usuário a este tenant</li>
        </ol>
      </div>
    </div>
  )
}
