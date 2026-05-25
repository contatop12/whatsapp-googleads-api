# Frontend Next.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **NOTE:** Before executing any Supabase task, invoke the `supabase:supabase` skill.
> **NOTE:** Before executing any UI task, invoke the `frontend-design:frontend-design` skill.

**Goal:** Build a Next.js 14 dashboard with Kanban pipeline, lead editing, WhatsApp QR connection, and Google Ads settings — fully integrated with the FastAPI backend and Supabase Realtime.

**Architecture:** Next.js App Router with server components for data fetching and client components for interactive UI (drag-and-drop kanban, QR polling, modals). Supabase client handles auth; all business mutations go through the FastAPI backend. Supabase Realtime listens to `tenants` table changes for live WhatsApp connection status.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Shadcn/ui, @hello-pangea/dnd (drag-and-drop), @supabase/ssr, Sentry

---

## File Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx              - login form (email+password)
│   ├── (dashboard)/
│   │   ├── layout.tsx                  - sidebar nav + auth guard
│   │   ├── pipeline/page.tsx           - kanban board (server component shell)
│   │   ├── leads/[id]/page.tsx         - lead detail + edit form
│   │   ├── settings/
│   │   │   ├── whatsapp/page.tsx       - QR code display + status
│   │   │   ├── google-ads/page.tsx     - Google Ads credentials form
│   │   │   └── keywords/page.tsx       - keyword config per stage
│   │   └── reports/page.tsx            - conversion stats
│   ├── api/auth/callback/route.ts      - Supabase OAuth callback
│   └── layout.tsx                      - root layout + Sentry
├── components/
│   ├── kanban/
│   │   ├── kanban-board.tsx            - DnD context + column list
│   │   ├── kanban-column.tsx           - Droppable column
│   │   └── lead-card.tsx               - Draggable card
│   ├── modals/
│   │   ├── move-stage2-modal.tsx       - validate name+email before stage 2
│   │   └── move-stage3-modal.tsx       - value input for stage 3
│   ├── whatsapp/
│   │   └── whatsapp-qr.tsx             - QR image + polling + Realtime status
│   └── ui/                             - shadcn components (auto-generated)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   - browser Supabase client
│   │   └── server.ts                   - server Supabase client (cookies)
│   ├── api.ts                          - typed fetch wrappers for FastAPI backend
│   └── utils.ts                        - cn() and helpers
├── middleware.ts                        - protect dashboard routes
├── next.config.js
├── tailwind.config.ts
├── Dockerfile
└── .env.example
```

---

### Task 1: Project scaffold

**Files:**
- Create: `frontend/` (Next.js project)

- [ ] **Step 1: Bootstrap project**

```bash
cd "c:/IA/P12/01. Automações Ativas/whatsapp-googleads-api"
npx create-next-app@14 frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
cd frontend
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @hello-pangea/dnd
npm install @sentry/nextjs
npx shadcn-ui@latest init
# During init: Default style → Slate color → CSS variables → yes to all
```

- [ ] **Step 3: Install Shadcn components**

```bash
npx shadcn-ui@latest add button card dialog badge input label form select separator skeleton toast
```

- [ ] **Step 4: Write .env.example**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SENTRY_DSN=
```

- [ ] **Step 5: Write next.config.js**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfig
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): Next.js 14 scaffold with Tailwind + Shadcn + supabase-ssr"
```

---

### Task 2: Supabase client + API wrapper

**Files:**
- Create: `frontend/lib/supabase/client.ts`
- Create: `frontend/lib/supabase/server.ts`
- Create: `frontend/lib/api.ts`
- Create: `frontend/lib/utils.ts`

- [ ] **Step 1: Write lib/supabase/client.ts**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Write lib/supabase/server.ts**

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Write lib/api.ts**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL!

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

export type Lead = {
  id: string
  tenant_id: string
  phone: string
  name: string | null
  email: string | null
  gclid: string | null
  ip: string | null
  city: string | null
  region: string | null
  country: string | null
  stage: 1 | 2 | 3
  conversion_value: number | null
  first_message_at: string | null
  qualified_at: string | null
  converted_at: string | null
  created_at: string
}

export type Tenant = {
  id: string
  name: string
  slug: string
  google_ads_customer_id: string | null
  google_ads_conversion_new_lead: string | null
  google_ads_conversion_qualified: string | null
  google_ads_conversion_converted: string | null
  conversion_value_qualified: number | null
  conversion_value_converted: number | null
  keywords_qualified: string[]
  keywords_converted: string[]
  evolution_instance_status: 'disconnected' | 'connecting' | 'connected'
  evolution_qr_code: string | null
}

export const api = {
  leads: {
    list: (tenantId: string) =>
      apiFetch<Lead[]>(`/api/leads?tenant_id=${tenantId}`),
    get: (id: string) =>
      apiFetch<Lead>(`/api/leads/${id}`),
    update: (id: string, data: Partial<Lead>) =>
      apiFetch<Lead>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    move: (id: string, newStage: number, conversionValue?: number) =>
      apiFetch<Lead>(`/api/leads/${id}/move`, {
        method: 'POST',
        body: JSON.stringify({ new_stage: newStage, conversion_value: conversionValue, triggered_by: 'manual' }),
      }),
  },
  tenants: {
    list: () => apiFetch<Tenant[]>('/api/tenants'),
    get: (id: string) => apiFetch<Tenant>(`/api/tenants/${id}`),
    update: (id: string, data: Partial<Tenant>) =>
      apiFetch<Tenant>(`/api/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  whatsapp: {
    qr: (tenantId: string) =>
      apiFetch<{ base64: string | null; status: string }>(`/api/tenants/${tenantId}/whatsapp/qr`),
    status: (tenantId: string) =>
      apiFetch<{ evolution_instance_status: string }>(`/api/tenants/${tenantId}/whatsapp/status`),
  },
}
```

- [ ] **Step 4: Write lib/utils.ts**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  return phone
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  return `${Math.floor(hours / 24)}d atrás`
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/ frontend/.env.example frontend/next.config.js
git commit -m "feat(frontend): Supabase client, API wrapper, utils"
```

---

### Task 3: Auth — login page + middleware

**Files:**
- Create: `frontend/app/(auth)/login/page.tsx`
- Create: `frontend/app/api/auth/callback/route.ts`
- Create: `frontend/middleware.ts`

- [ ] **Step 1: Write middleware.ts**

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isDashboard = !isAuthPage && !request.nextUrl.pathname.startsWith('/api')

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/pipeline', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Write app/api/auth/callback/route.ts**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/pipeline'

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, request.url))
}
```

- [ ] **Step 3: Write app/(auth)/login/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/pipeline')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>WhatsApp → Google Ads Tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/middleware.ts frontend/app/
git commit -m "feat(frontend): auth login page and middleware"
```

---

### Task 4: Dashboard layout + sidebar

**Files:**
- Create: `frontend/app/(dashboard)/layout.tsx`
- Create: `frontend/app/layout.tsx`

- [ ] **Step 1: Write app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rastreamento WhatsApp → Google Ads',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Write app/(dashboard)/layout.tsx**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LayoutGrid, Users, Settings, BarChart3, LogOut } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-56 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-semibold text-sm text-gray-900">WA → Google Ads</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem href="/pipeline" icon={<LayoutGrid size={16} />} label="Pipeline" />
          <NavItem href="/reports" icon={<BarChart3 size={16} />} label="Relatórios" />
          <NavItem href="/settings/whatsapp" icon={<Settings size={16} />} label="Configurações" />
        </nav>
        <form action="/api/auth/signout" method="post" className="p-3 border-t">
          <button
            type="submit"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 w-full"
          >
            <LogOut size={16} /> Sair
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
    >
      {icon}
      {label}
    </Link>
  )
}
```

- [ ] **Step 3: Add signout route**

Create `frontend/app/api/auth/signout/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url))
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/
git commit -m "feat(frontend): dashboard layout with sidebar"
```

---

### Task 5: Kanban board

**Files:**
- Create: `frontend/components/kanban/kanban-board.tsx`
- Create: `frontend/components/kanban/kanban-column.tsx`
- Create: `frontend/components/kanban/lead-card.tsx`
- Create: `frontend/components/modals/move-stage2-modal.tsx`
- Create: `frontend/components/modals/move-stage3-modal.tsx`
- Create: `frontend/app/(dashboard)/pipeline/page.tsx`

- [ ] **Step 1: Write components/kanban/lead-card.tsx**

```typescript
import { Draggable } from '@hello-pangea/dnd'
import { Badge } from '@/components/ui/badge'
import { formatPhone, timeAgo } from '@/lib/utils'
import { MapPin, Clock } from 'lucide-react'
import Link from 'next/link'
import type { Lead } from '@/lib/api'

interface LeadCardProps {
  lead: Lead
  index: number
  isLocked?: boolean
}

export function LeadCard({ lead, index, isLocked }: LeadCardProps) {
  return (
    <Draggable draggableId={lead.id} index={index} isDragDisabled={isLocked}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg border p-3 space-y-2 cursor-grab active:cursor-grabbing
            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : 'shadow-sm'}
            ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between">
            <p className="font-medium text-sm text-gray-900 truncate">
              {lead.name || formatPhone(lead.phone)}
            </p>
            {lead.gclid && (
              <Badge variant="outline" className="text-xs ml-1 shrink-0">gclid</Badge>
            )}
          </div>

          {lead.name && (
            <p className="text-xs text-gray-500">{formatPhone(lead.phone)}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-400">
            {lead.city && (
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {lead.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={10} /> {timeAgo(lead.created_at)}
            </span>
          </div>

          <Link
            href={`/leads/${lead.id}`}
            className="text-xs text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Ver detalhes →
          </Link>
        </div>
      )}
    </Draggable>
  )
}
```

- [ ] **Step 2: Write components/modals/move-stage2-modal.tsx**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Lead } from '@/lib/api'

interface Props {
  lead: Lead
  open: boolean
  onConfirm: (data: { name: string; email: string; phone: string }) => void
  onCancel: () => void
}

export function MoveStage2Modal({ lead, open, onConfirm, onCancel }: Props) {
  const [name, setName] = useState(lead.name || '')
  const [email, setEmail] = useState(lead.email || '')
  const [phone, setPhone] = useState(lead.phone)
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    if (!email.trim() || !email.includes('@')) { setError('Gmail válido obrigatório'); return }
    onConfirm({ name, email, phone })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para Qualificado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do lead" />
          </div>
          <div className="space-y-1">
            <Label>Gmail *</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@gmail.com" />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Write components/modals/move-stage3-modal.tsx**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onConfirm: (value: number) => void
  onCancel: () => void
}

export function MoveStage3Modal({ open, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    const num = parseFloat(value.replace(',', '.'))
    if (isNaN(num) || num <= 0) { setError('Informe o valor do negócio'); return }
    onConfirm(num)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para Convertido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-500">
            Informe o valor do negócio fechado. Este valor será enviado ao Google Ads.
          </p>
          <div className="space-y-1">
            <Label>Valor em R$ *</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex: 1500,00"
              type="text"
              inputMode="decimal"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleConfirm}>Confirmar e Disparar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Write components/kanban/kanban-column.tsx**

```typescript
import { Droppable } from '@hello-pangea/dnd'
import { LeadCard } from './lead-card'
import { Badge } from '@/components/ui/badge'
import type { Lead } from '@/lib/api'

const STAGE_LABELS = { 1: 'Novo Lead', 2: 'Qualificado', 3: 'Convertido' } as const

interface Props {
  stage: 1 | 2 | 3
  leads: Lead[]
}

export function KanbanColumn({ stage, leads }: Props) {
  return (
    <div className="flex flex-col w-80 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm text-gray-700">{STAGE_LABELS[stage]}</h2>
        <Badge variant="secondary">{leads.length}</Badge>
      </div>
      <Droppable droppableId={String(stage)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-32 space-y-2 rounded-lg p-2 transition-colors
              ${snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-100'}`}
          >
            {leads.map((lead, index) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                index={index}
                isLocked={lead.stage === 3}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
```

- [ ] **Step 5: Write components/kanban/kanban-board.tsx**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { KanbanColumn } from './kanban-column'
import { MoveStage2Modal } from '@/components/modals/move-stage2-modal'
import { MoveStage3Modal } from '@/components/modals/move-stage3-modal'
import { api, type Lead } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface Props {
  initialLeads: Lead[]
}

type PendingMove = { lead: Lead; targetStage: 1 | 2 | 3 }

export function KanbanBoard({ initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [showStage2Modal, setShowStage2Modal] = useState(false)
  const [showStage3Modal, setShowStage3Modal] = useState(false)
  const { toast } = useToast()

  const leadsForStage = useCallback((stage: number) =>
    leads.filter((l) => l.stage === stage), [leads])

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return

    const newStage = parseInt(result.destination.droppableId) as 1 | 2 | 3
    const oldStage = parseInt(result.source.droppableId) as 1 | 2 | 3

    if (newStage === oldStage) return

    const lead = leads.find((l) => l.id === result.draggableId)
    if (!lead) return

    // Block backwards movement
    if (newStage < lead.stage) {
      toast({ title: 'Não permitido', description: 'Leads não podem retroceder de etapa.', variant: 'destructive' })
      return
    }

    // Block skipping stage 2
    if (newStage === 3 && lead.stage === 1) {
      toast({ title: 'Não permitido', description: 'Deve passar pela etapa Qualificado primeiro.', variant: 'destructive' })
      return
    }

    setPendingMove({ lead, targetStage: newStage })

    if (newStage === 2) {
      setShowStage2Modal(true)
    } else if (newStage === 3) {
      setShowStage3Modal(true)
    }
  }

  async function executeMove(conversionValue?: number, updates?: Partial<Lead>) {
    if (!pendingMove) return

    try {
      if (updates) {
        await api.leads.update(pendingMove.lead.id, updates)
      }
      const updated = await api.leads.move(pendingMove.lead.id, pendingMove.targetStage, conversionValue)
      setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l))
      toast({ title: 'Lead movido com sucesso' })
    } catch (err: any) {
      toast({ title: 'Erro ao mover lead', description: err.message, variant: 'destructive' })
    } finally {
      setPendingMove(null)
      setShowStage2Modal(false)
      setShowStage3Modal(false)
    }
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 p-6 overflow-x-auto h-full">
          <KanbanColumn stage={1} leads={leadsForStage(1)} />
          <KanbanColumn stage={2} leads={leadsForStage(2)} />
          <KanbanColumn stage={3} leads={leadsForStage(3)} />
        </div>
      </DragDropContext>

      {pendingMove && showStage2Modal && (
        <MoveStage2Modal
          lead={pendingMove.lead}
          open={showStage2Modal}
          onConfirm={(data) => executeMove(undefined, data)}
          onCancel={() => { setPendingMove(null); setShowStage2Modal(false) }}
        />
      )}

      {pendingMove && showStage3Modal && (
        <MoveStage3Modal
          open={showStage3Modal}
          onConfirm={(value) => executeMove(value)}
          onCancel={() => { setPendingMove(null); setShowStage3Modal(false) }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 6: Write app/(dashboard)/pipeline/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { api } from '@/lib/api'

export default async function PipelinePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userRow } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user!.id)
    .single()

  if (!userRow?.tenant_id && userRow?.role !== 'admin') {
    return <div className="p-6 text-gray-500">Tenant não configurado. Contate o administrador.</div>
  }

  const leads = await api.leads.list(userRow.tenant_id!).catch(() => [])

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-0">
        <h1 className="text-xl font-semibold text-gray-900">Pipeline de Leads</h1>
        <p className="text-sm text-gray-500 mt-1">{leads.length} leads no total</p>
      </div>
      <KanbanBoard initialLeads={leads} />
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/components/ frontend/app/(dashboard)/pipeline/
git commit -m "feat(frontend): kanban pipeline with DnD and stage validation modals"
```

---

### Task 6: WhatsApp QR component + settings page

**Files:**
- Create: `frontend/components/whatsapp/whatsapp-qr.tsx`
- Create: `frontend/app/(dashboard)/settings/whatsapp/page.tsx`

- [ ] **Step 1: Write components/whatsapp/whatsapp-qr.tsx**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface Props {
  tenantId: string
  initialStatus: 'disconnected' | 'connecting' | 'connected'
}

export function WhatsAppQR({ tenantId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchQR = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.whatsapp.qr(tenantId)
      setQrBase64(data.base64)
      setStatus(data.status as any)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  // Supabase Realtime: listen to tenant status changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`tenant-status-${tenantId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tenants',
        filter: `id=eq.${tenantId}`,
      }, (payload) => {
        const newStatus = payload.new.evolution_instance_status
        setStatus(newStatus)
        if (newStatus === 'connected') setQrBase64(null)
        if (newStatus === 'disconnected') fetchQR()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tenantId, fetchQR])

  // Poll QR every 5s while connecting
  useEffect(() => {
    if (status !== 'connecting') return
    const interval = setInterval(fetchQR, 5000)
    return () => clearInterval(interval)
  }, [status, fetchQR])

  // Initial load
  useEffect(() => {
    if (status !== 'connected') fetchQR()
  }, [])

  if (status === 'connected') {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle className="text-green-600" size={24} />
        <div>
          <p className="font-medium text-green-800">WhatsApp Conectado</p>
          <p className="text-sm text-green-600">Mensagens sendo recebidas normalmente</p>
        </div>
      </div>
    )
  }

  if (status === 'disconnected' && !qrBase64 && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <XCircle className="text-red-600" size={24} />
          <div>
            <p className="font-medium text-red-800">WhatsApp Desconectado</p>
            <p className="text-sm text-red-600">Clique em conectar para gerar o QR code</p>
          </div>
        </div>
        <Button onClick={fetchQR} variant="outline">Conectar WhatsApp</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Loader2 className="animate-spin text-yellow-600" size={18} />
        <span className="text-sm text-yellow-700 font-medium">Aguardando scan do QR Code...</span>
      </div>

      <div className="w-48 h-48 rounded-lg overflow-hidden border bg-white flex items-center justify-center">
        {loading && !qrBase64 ? (
          <Skeleton className="w-full h-full" />
        ) : qrBase64 ? (
          <Image
            src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
            alt="WhatsApp QR Code"
            width={192}
            height={192}
            unoptimized
          />
        ) : null}
      </div>

      <p className="text-xs text-gray-500">
        Abra o WhatsApp → Dispositivos conectados → Conectar um dispositivo
      </p>

      <Button onClick={fetchQR} variant="ghost" size="sm">Atualizar QR</Button>
    </div>
  )
}
```

- [ ] **Step 2: Write app/(dashboard)/settings/whatsapp/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { WhatsAppQR } from '@/components/whatsapp/whatsapp-qr'

export default async function WhatsAppSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userRow } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  if (!userRow?.tenant_id) {
    return <div className="p-6 text-gray-500">Tenant não configurado.</div>
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, evolution_instance_status')
    .eq('id', userRow.tenant_id)
    .single()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-2">WhatsApp</h1>
      <p className="text-sm text-gray-500 mb-6">Conecte o WhatsApp para receber mensagens dos leads.</p>
      <WhatsAppQR
        tenantId={tenant!.id}
        initialStatus={tenant!.evolution_instance_status as any}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/whatsapp/ frontend/app/(dashboard)/settings/
git commit -m "feat(frontend): WhatsApp QR component with Realtime status"
```

---

### Task 7: Lead detail page + settings pages

**Files:**
- Create: `frontend/app/(dashboard)/leads/[id]/page.tsx`
- Create: `frontend/app/(dashboard)/settings/google-ads/page.tsx`
- Create: `frontend/app/(dashboard)/settings/keywords/page.tsx`
- Create: `frontend/app/(dashboard)/reports/page.tsx`

- [ ] **Step 1: Write leads/[id]/page.tsx**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { api, type Lead } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatPhone, timeAgo } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

const STAGE_LABELS = { 1: 'Novo Lead', 2: 'Qualificado', 3: 'Convertido' }
const STAGE_COLORS = { 1: 'secondary', 2: 'default', 3: 'destructive' } as const

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [lead, setLead] = useState<Lead | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    api.leads.get(id).then((l) => {
      setLead(l)
      setForm({ name: l.name || '', email: l.email || '', phone: l.phone })
    })
  }, [id])

  async function handleSave() {
    if (!lead) return
    setSaving(true)
    try {
      const updated = await api.leads.update(lead.id, form)
      setLead(updated)
      setEditing(false)
      toast({ title: 'Lead atualizado' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (!lead) return <div className="p-6 text-gray-400">Carregando...</div>

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{lead.name || formatPhone(lead.phone)}</h1>
          <Badge variant={STAGE_COLORS[lead.stage as 1|2|3]} className="mt-1">
            {STAGE_LABELS[lead.stage as 1|2|3]}
          </Badge>
        </div>
        <Button variant="outline" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancelar' : 'Editar'}
        </Button>
      </div>

      <div className="space-y-4">
        {editing ? (
          <>
            <Field label="Nome" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
            <Field label="Gmail" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} type="email" />
            <Field label="Telefone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        ) : (
          <>
            <ReadField label="Nome" value={lead.name} />
            <ReadField label="Gmail" value={lead.email} />
            <ReadField label="Telefone" value={formatPhone(lead.phone)} />
            <ReadField label="Cidade" value={lead.city ? `${lead.city}, ${lead.region}` : null} />
            <ReadField label="País" value={lead.country} />
            <ReadField label="gclid" value={lead.gclid} mono />
            <ReadField label="IP" value={lead.ip} mono />
            <ReadField label="Criado em" value={timeAgo(lead.created_at)} />
            <ReadField label="Primeira mensagem" value={timeAgo(lead.first_message_at)} />
            {lead.qualified_at && <ReadField label="Qualificado em" value={timeAgo(lead.qualified_at)} />}
            {lead.converted_at && <ReadField label="Convertido em" value={timeAgo(lead.converted_at)} />}
            {lead.conversion_value && (
              <ReadField label="Valor" value={`R$ ${lead.conversion_value.toFixed(2)}`} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function ReadField({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>
        {value || <span className="text-gray-300">—</span>}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Write settings/google-ads/page.tsx**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { api, type Tenant } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

export default function GoogleAdsSettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [form, setForm] = useState({
    google_ads_customer_id: '',
    google_ads_conversion_new_lead: '',
    google_ads_conversion_qualified: '',
    google_ads_conversion_converted: '',
    conversion_value_qualified: '',
    conversion_value_converted: '',
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userRow } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userRow?.tenant_id) return
      const t = await api.tenants.get(userRow.tenant_id)
      setTenant(t)
      setForm({
        google_ads_customer_id: t.google_ads_customer_id || '',
        google_ads_conversion_new_lead: t.google_ads_conversion_new_lead || '',
        google_ads_conversion_qualified: t.google_ads_conversion_qualified || '',
        google_ads_conversion_converted: t.google_ads_conversion_converted || '',
        conversion_value_qualified: t.conversion_value_qualified?.toString() || '',
        conversion_value_converted: t.conversion_value_converted?.toString() || '',
      })
    }
    load()
  }, [])

  async function handleSave() {
    if (!tenant) return
    setSaving(true)
    try {
      await api.tenants.update(tenant.id, {
        ...form,
        conversion_value_qualified: form.conversion_value_qualified ? parseFloat(form.conversion_value_qualified) : undefined,
        conversion_value_converted: form.conversion_value_converted ? parseFloat(form.conversion_value_converted) : undefined,
      } as any)
      toast({ title: 'Configurações salvas' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Google Ads</h1>
        <p className="text-sm text-gray-500">Credenciais e nomes de conversão por etapa</p>
      </div>

      <div className="space-y-4">
        <Field label="Customer ID (ex: 123-456-7890)" id="customer_id" value={form.google_ads_customer_id} onChange={set('google_ads_customer_id')} />
        <Field label="Conversão Etapa 1 — Novo Lead" id="conv1" value={form.google_ads_conversion_new_lead} onChange={set('google_ads_conversion_new_lead')} />
        <Field label="Conversão Etapa 2 — Qualificado" id="conv2" value={form.google_ads_conversion_qualified} onChange={set('google_ads_conversion_qualified')} />
        <Field label="Valor fixo Etapa 2 (R$)" id="val2" value={form.conversion_value_qualified} onChange={set('conversion_value_qualified')} type="number" />
        <Field label="Conversão Etapa 3 — Convertido" id="conv3" value={form.google_ads_conversion_converted} onChange={set('google_ads_conversion_converted')} />
      </div>

      <Button onClick={handleSave} disabled={saving || !tenant}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}

function Field({ label, id, value, onChange, type = 'text' }: {
  label: string; id: string; value: string; onChange: (e: any) => void; type?: string
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={onChange} />
    </div>
  )
}
```

- [ ] **Step 3: Write settings/keywords/page.tsx**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { api, type Tenant } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { X, Plus } from 'lucide-react'

export default function KeywordsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [qualified, setQualified] = useState<string[]>([])
  const [converted, setConverted] = useState<string[]>([])
  const [inputQ, setInputQ] = useState('')
  const [inputC, setInputC] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userRow } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userRow?.tenant_id) return
      const t = await api.tenants.get(userRow.tenant_id)
      setTenant(t)
      setQualified(t.keywords_qualified)
      setConverted(t.keywords_converted)
    }
    load()
  }, [])

  async function handleSave() {
    if (!tenant) return
    setSaving(true)
    try {
      await api.tenants.update(tenant.id, { keywords_qualified: qualified, keywords_converted: converted } as any)
      toast({ title: 'Palavras-chave salvas' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Palavras-chave</h1>
        <p className="text-sm text-gray-500">Termos que avançam o lead automaticamente de etapa.</p>
      </div>

      <KeywordSection
        title="Etapa 1 → 2 (Qualificado)"
        keywords={qualified}
        input={inputQ}
        onInputChange={setInputQ}
        onAdd={() => { if (inputQ.trim()) { setQualified((p) => [...p, inputQ.trim()]); setInputQ('') }}}
        onRemove={(kw) => setQualified((p) => p.filter((k) => k !== kw))}
      />

      <KeywordSection
        title="Etapa 2 → 3 (Convertido)"
        keywords={converted}
        input={inputC}
        onInputChange={setInputC}
        onAdd={() => { if (inputC.trim()) { setConverted((p) => [...p, inputC.trim()]); setInputC('') }}}
        onRemove={(kw) => setConverted((p) => p.filter((k) => k !== kw))}
      />

      <Button onClick={handleSave} disabled={saving || !tenant}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}

function KeywordSection({ title, keywords, input, onInputChange, onAdd, onRemove }: {
  title: string; keywords: string[]; input: string
  onInputChange: (v: string) => void; onAdd: () => void; onRemove: (kw: string) => void
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-gray-700">{title}</h2>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Adicionar palavra-chave"
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <Button size="icon" variant="outline" onClick={onAdd}><Plus size={16} /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw) => (
          <Badge key={kw} variant="secondary" className="gap-1">
            {kw}
            <button onClick={() => onRemove(kw)}><X size={12} /></button>
          </Badge>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write reports/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userRow } = await supabase
    .from('users').select('tenant_id, role').eq('id', user!.id).single()

  const query = supabase.from('leads').select('stage, created_at, city, country')
  if (userRow?.role !== 'admin' && userRow?.tenant_id) {
    query.eq('tenant_id', userRow.tenant_id)
  }
  const { data: leads } = await query

  const totals = { 1: 0, 2: 0, 3: 0 }
  leads?.forEach((l) => { totals[l.stage as 1|2|3]++ })

  const rate12 = totals[1] > 0 ? ((totals[2] / totals[1]) * 100).toFixed(1) : '0'
  const rate23 = totals[2] > 0 ? ((totals[3] / totals[2]) * 100).toFixed(1) : '0'

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Relatórios</h1>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Novos Leads" value={totals[1]} />
        <StatCard label="Qualificados" value={totals[2]} />
        <StatCard label="Convertidos" value={totals[3]} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Taxa 1 → 2" value={`${rate12}%`} />
        <StatCard label="Taxa 2 → 3" value={`${rate23}%`} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/(dashboard)/
git commit -m "feat(frontend): lead detail, settings, reports pages"
```

---

### Task 8: Dockerfile

**Files:**
- Create: `frontend/Dockerfile`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

- [ ] **Step 2: Build locally**

```bash
cd frontend
npm run build
# Must complete without TypeScript/build errors
```

- [ ] **Step 3: Commit**

```bash
git add frontend/Dockerfile
git commit -m "feat(frontend): Dockerfile for production"
```

---

### Task 9: End-to-end smoke test

- [ ] **Step 1: Start backend**

```bash
cd backend && uvicorn app.main:app --reload
```

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Golden path checklist**

Open `http://localhost:3000` and verify:

```
[ ] /login — form renders, login works with admin credentials
[ ] /pipeline — kanban renders 3 columns
[ ] Drag card from column 1 to 2 — modal appears, requires name+email
[ ] Fill name+email → confirm → card moves to column 2
[ ] Drag card from column 2 to 3 — value modal appears
[ ] Fill value → confirm → card moves to column 3, locked
[ ] Try dragging stage-3 card — does not move
[ ] /leads/[id] — lead detail shows all fields, edit form works
[ ] /settings/whatsapp — QR component renders or shows connected status
[ ] /settings/google-ads — form loads tenant values
[ ] /settings/keywords — add/remove keywords works
[ ] /reports — stats render
[ ] Sidebar navigation works for all routes
[ ] Logout redirects to /login
```

- [ ] **Step 4: Commit**

```bash
git commit -m "test(frontend): golden path smoke test passing"
```
