import { createClient } from '@/lib/supabase/server'
import { buildApi, createApiFetch } from '@/lib/api-core'

export async function getServerApi() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return buildApi(createApiFetch(async () => session?.access_token ?? null))
}
