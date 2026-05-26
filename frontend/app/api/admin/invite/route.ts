import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/api-types'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await req.json()
  const { email, role, tenant_id } = body as { email?: string; role?: UserRole; tenant_id?: string }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  }

  if (!role || !['admin', 'client'].includes(role)) {
    return NextResponse.json({ error: 'Role inválido — use "admin" ou "client"' }, { status: 400 })
  }

  // admin can only invite to their own tenant
  const effectiveTenantId =
    profile.role === 'super_admin' ? tenant_id ?? profile.tenant_id : profile.tenant_id

  if (!effectiveTenantId) {
    return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurado' }, { status: 500 })
  }

  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email.trim(), {
    data: { invited_by: user.id, role, tenant_id: effectiveTenantId },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true, userId: data.user.id })
}
