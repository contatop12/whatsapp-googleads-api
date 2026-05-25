'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { Copy, Check } from 'lucide-react'

export default function InviteUserPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? ''

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Erro ao convidar usuário')
      }

      setDone(true)
      toast({ title: 'Convite enviado para ' + email })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(appUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6">
        <Link href="/admin/users" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Usuários
        </Link>
        <h1 className="text-lg font-bold text-zinc-100 mt-2">Convidar Usuário</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Envia um e-mail de convite. O usuário cria a própria senha e recebe acesso de <strong className="text-zinc-400">Cliente</strong> por padrão.
        </p>
      </div>

      {done ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Check size={18} className="text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-emerald-300">Convite enviado!</p>
          <p className="text-xs text-zinc-500">
            <span className="text-zinc-300">{email}</span> receberá um e-mail para criar a conta.
          </p>
          <div className="flex gap-2 justify-center pt-1">
            <Button size="sm" variant="outline" onClick={() => { setDone(false); setEmail('') }}>
              Convidar outro
            </Button>
            <Button size="sm" asChild>
              <Link href="/admin/users">Ver usuários</Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleInvite} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">E-mail do cliente</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@empresa.com"
              required
              autoComplete="off"
            />
          </div>

          <Button type="submit" disabled={loading || !email.trim()} className="w-full">
            {loading ? 'Enviando convite...' : 'Enviar convite por e-mail'}
          </Button>
        </form>
      )}

      {/* Manual access fallback */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <p className="text-xs font-medium text-zinc-500">Acesso manual</p>
        <p className="text-xs text-zinc-600">
          Alternativamente, compartilhe o link do dashboard. O cliente cria a conta sozinho — vai ter acesso de <strong className="text-zinc-400">Cliente</strong> automaticamente.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg truncate">
            {appUrl}
          </code>
          <Button size="icon" variant="outline" onClick={copyLink} type="button">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </Button>
        </div>
      </div>
    </div>
  )
}
