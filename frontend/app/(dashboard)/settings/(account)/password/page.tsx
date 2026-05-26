import { PasswordForm } from '@/components/settings/PasswordForm'

export default function PasswordPage() {
  return (
    <div className="p-6 max-w-lg">
      <div className="border-b border-zinc-800 pb-4 mb-6">
        <h1 className="text-lg font-bold text-zinc-100">Senha</h1>
        <p className="text-xs text-zinc-500 mt-1">Atualize sua senha de acesso.</p>
      </div>
      <PasswordForm />
    </div>
  )
}
