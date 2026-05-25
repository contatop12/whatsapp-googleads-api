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
          <DialogTitle>Mover para Qualificado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do lead" />
          </div>
          <div className="space-y-1">
            <Label>Gmail *</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="email@gmail.com"
            />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
