'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// TODO: LGPD Phase 2 — implementar exclusão de conta
// Necessário para compliance com Art. 18, VI da LGPD
// Flow previsto:
//   1. Usuário clica "Solicitar exclusão"
//   2. Sistema envia email com código de 6 dígitos
//   3. Modal pede o código
//   4. Ao confirmar: supabase.auth.admin.deleteUser(userId) via API route

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-5">
      <h3 className="text-sm font-semibold text-red-400">Zona de perigo</h3>
      <p className="text-xs text-zinc-500 mt-1 mb-4">
        Solicitar a exclusão permanente da sua conta e todos os dados associados. Ação irreversível.
      </p>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Solicitar exclusão
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Exclusão de conta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400 leading-relaxed">
            A funcionalidade de exclusão de conta está em desenvolvimento e será disponibilizada
            em breve, conforme exigido pela política de privacidade e pela Lei Geral de Proteção
            de Dados (LGPD — Art. 18, VI).
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            Para solicitações urgentes, entre em contato com o suporte.
          </p>
          <Button variant="outline" onClick={() => setOpen(false)} className="mt-2 w-full sm:w-auto">
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
