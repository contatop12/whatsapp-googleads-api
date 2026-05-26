import { NotificationsForm } from '@/components/settings/NotificationsForm'

export default function NotificationsPage() {
  return (
    <div className="p-6 max-w-lg">
      <div className="border-b border-zinc-800 pb-4 mb-6">
        <h1 className="text-lg font-bold text-zinc-100">Notificações</h1>
        <p className="text-xs text-zinc-500 mt-1">Controle quais alertas você recebe.</p>
      </div>
      <NotificationsForm />
    </div>
  )
}
