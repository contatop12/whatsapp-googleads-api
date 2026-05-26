import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/tenant'
import { ProfileForm } from '@/components/settings/ProfileForm'

export default async function ProfilePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { profile } = await getUserProfile()
  if (!profile) redirect('/login')

  return (
    <div className="p-6 max-w-lg">
      <div className="border-b border-zinc-800 pb-4 mb-6">
        <h1 className="text-lg font-bold text-zinc-100">Perfil</h1>
        <p className="text-xs text-zinc-500 mt-1">Informações da sua conta.</p>
      </div>
      <ProfileForm
        userId={user.id}
        email={user.email!}
        name={profile.name}
        role={profile.role}
      />
    </div>
  )
}
