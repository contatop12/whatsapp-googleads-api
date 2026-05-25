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

interface Props {
  open: boolean
  onConfirm: (value: number) => void
  onCancel: () => void
}

export function MoveStage3Modal({ open, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    const num = parseFloat(value.replace(',', '.'))
    if (isNaN(num) || num <= 0) {
      setError('Informe o valor do negócio')
      return
    }
    onConfirm(num)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para Convertido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-500">
            Informe o valor do negócio fechado. Este valor será enviado ao Google Ads.
          </p>
          <div className="space-y-1">
            <Label>Valor em R$ *</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex: 1500,00"
              type="text"
              inputMode="decimal"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Confirmar e Disparar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
