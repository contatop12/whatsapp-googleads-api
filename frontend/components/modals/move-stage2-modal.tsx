'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Lead } from '@/lib/api'

interface Props {
  lead: Lead
  open: boolean
  onConfirm: (data: { name: string; email: string; phone: string }) => void
  onCancel: () => void
}

export function MoveStage2Modal({ lead, open, onConfirm, onCancel }: Props) {
  const [name, setName] = useState(lead.name || '')
  const [email, setEmail] = useState(lead.email || '')
  const [phone, setPhone] = useState(lead.phone)
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    if (!name.trim()) {
      setError('Nome obrigatório')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Gmail válido obrigatório')
      return
    }
    onConfirm({ name, email, phone })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <DialogTitle>Mover para Qualificado</DialogTitle>
          </div>
          <p className="text-xs text-zinc-500">Preencha os dados do lead para qualificar.</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s2-name">Nome *</Label>
            <Input
              id="s2-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do lead"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s2-email">Gmail *</Label>
            <Input
              id="s2-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="email@gmail.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s2-phone">Telefone</Label>
            <Input
              id="s2-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="font-mono"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="bg-blue-500 hover:bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            Qualificar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
