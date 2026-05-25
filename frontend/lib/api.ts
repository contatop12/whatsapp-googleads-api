import { createClient } from '@/lib/supabase/client'
import { buildApi, createApiFetch } from '@/lib/api-core'

export type { Lead, Tenant } from '@/lib/api-types'

async function browserToken(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export const api = buildApi(createApiFetch(browserToken))
