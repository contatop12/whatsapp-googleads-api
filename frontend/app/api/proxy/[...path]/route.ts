import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:8000'

async function proxyRequest(
  req: NextRequest,
  params: { path: string[] },
  method: string
): Promise<NextResponse> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const targetPath = '/' + params.path.join('/')
  const url = new URL(targetPath, BACKEND_URL)

  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value)
  })

  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  let body: string | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    try { body = await req.text() } catch { /* empty body */ }
  }

  let backendRes: Response
  try {
    backendRes = await fetch(url.toString(), { method, headers, body, cache: 'no-store' })
  } catch (err) {
    return NextResponse.json(
      { detail: `Backend inacessível (${BACKEND_URL}): ${err instanceof Error ? err.message : 'Erro de rede'}` },
      { status: 502 }
    )
  }

  const text = await backendRes.text()
  return new NextResponse(text, {
    status: backendRes.status,
    headers: { 'Content-Type': backendRes.headers.get('Content-Type') ?? 'application/json' },
  })
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params, 'GET')
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params, 'POST')
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params, 'PATCH')
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params, 'PUT')
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params, 'DELETE')
}
