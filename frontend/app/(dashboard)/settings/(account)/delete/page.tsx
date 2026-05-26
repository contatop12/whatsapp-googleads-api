import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection'

export default function DeletePage() {
  return (
    <div className="p-6 max-w-lg">
      <div className="border-b border-zinc-800 pb-4 mb-6">
        <h1 className="text-lg font-bold text-zinc-100">Deletar conta</h1>
        <p className="text-xs text-zinc-500 mt-1">Ações irreversíveis relacionadas à sua conta.</p>
      </div>
      <DeleteAccountSection />
    </div>
  )
}
