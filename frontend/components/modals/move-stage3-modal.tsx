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
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <DialogTitle>Mover para Convertido</DialogTitle>
          </div>
          <p className="text-xs text-zinc-500">
            Informe o valor do negócio fechado. Será enviado ao Google Ads.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s3-value">Valor em R$ *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-mono">R$</span>
              <Input
                id="s3-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
                type="text"
                inputMode="decimal"
                className="pl-9 font-mono text-emerald-400"
              />
            </div>
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
          <Button onClick={handleConfirm}>
            Confirmar e Disparar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
