import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/api-types'

export type UserProfile = {
  tenant_id: string | null
  role: UserRole
  name: string | null
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
    .select('tenant_id, role, name')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    profile: profile
      ? {
          tenant_id: profile.tenant_id,
          role: profile.role as UserRole,
          name: profile.name,
        }
      : null,
  }
}

export async function resolveTenantId(
  profile: UserProfile | null,
  requestedTenantId?: string
): Promise<string | null> {
  if (!profile) return null

  if (profile.role === 'super_admin') {
    if (requestedTenantId) return requestedTenantId
    const supabase = createClient()
    const { data } = await supabase.from('tenants').select('id').limit(1).single()
    return data?.id ?? null
  }

  if (profile.tenant_id) return profile.tenant_id

  if (profile.role === 'admin') {
    const supabase = createClient()
    const { data } = await supabase.from('tenants').select('id').limit(1).single()
    return data?.id ?? null
  }

  return null
}
