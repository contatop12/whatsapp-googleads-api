import { SettingsNav } from '@/components/settings/SettingsNav'

export default function SettingsAccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-screen">
      <SettingsNav />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
