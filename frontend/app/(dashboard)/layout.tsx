import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/tenant'
import { AuthProvider } from '@/contexts/auth-context'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { profile } = await getUserProfile()
  if (!profile) redirect('/login')

  const authUser = {
    id: user.id,
    email: user.email!,
    name: profile.name,
    role: profile.role,
    tenant_id: profile.tenant_id,
  }

  return (
    <AuthProvider user={authUser}>
      <div className="flex h-screen bg-zinc-950 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-zinc-950 pb-16 md:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthProvider>
  )
}
