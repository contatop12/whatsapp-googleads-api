import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const rawNext = url.searchParams.get('next') ?? '/pipeline'
  const next = rawNext.startsWith('/') ? rawNext : '/pipeline'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=auth_failed`, request.url))
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
