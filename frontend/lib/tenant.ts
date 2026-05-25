import { createClient } from '@/lib/supabase/server'

export type UserProfile = {
  tenant_id: string | null
  role: 'admin' | 'client'
}

export async function getUserProfile(): Promise<{
  userId: string
  profile: UserProfile | null
}> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { userId: '', profile: null }

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    profile: profile
      ? { tenant_id: profile.tenant_id, role: profile.role as 'admin' | 'client' }
      : null,
  }
}

export async function resolveTenantId(profile: UserProfile | null): Promise<string | null> {
  if (!profile) return null
  if (profile.tenant_id) return profile.tenant_id

  if (profile.role === 'admin') {
    const supabase = createClient()
    const { data } = await supabase.from('tenants').select('id').limit(1).single()
    return data?.id ?? null
  }

  return null
}
