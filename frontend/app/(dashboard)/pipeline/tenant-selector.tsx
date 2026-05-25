'use client'

import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'

interface Props {
  tenants: { id: string; name: string }[]
  currentTenantId: string
}

export function TenantSelector({ tenants, currentTenantId }: Props) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-1.5">
      <Building2 size={13} className="text-zinc-600 shrink-0" />
      <select
        value={currentTenantId}
        onChange={(e) => router.push(`/pipeline?tenant=${e.target.value}`)}
        className="h-8 rounded-md border border-zinc-700 bg-zinc-900 pl-2 pr-6 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 cursor-pointer"
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
