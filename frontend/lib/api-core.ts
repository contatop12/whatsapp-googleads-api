import type { Lead, Tenant } from '@/lib/api-types'

export const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'

export type ApiFetch = <T>(path: string, init?: RequestInit) => Promise<T>

function parseError(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item: { msg?: string }) => item.msg || String(item))
      .join(', ')
  }
  return 'Erro na API'
}

export function createApiFetch(getToken: () => Promise<string | null>): ApiFetch {
  return async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getToken()
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        parseError((err as { detail?: unknown }).detail) || `API error ${res.status}`
      )
    }

    return res.json()
  }
}

export function buildApi(apiFetch: ApiFetch) {
  return {
    leads: {
      list: (tenantId: string) => apiFetch<Lead[]>(`/api/leads?tenant_id=${tenantId}`),
      get: (id: string) => apiFetch<Lead>(`/api/leads/${id}`),
      update: (id: string, data: Partial<Lead>) =>
        apiFetch<Lead>(`/api/leads/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      move: (id: string, newStage: number, conversionValue?: number) =>
        apiFetch<Lead>(`/api/leads/${id}/move`, {
          method: 'POST',
          body: JSON.stringify({
            new_stage: newStage,
            conversion_value: conversionValue,
            triggered_by: 'manual',
          }),
        }),
    },
    tenants: {
      list: () => apiFetch<Tenant[]>('/api/tenants'),
      get: (id: string) => apiFetch<Tenant>(`/api/tenants/${id}`),
      update: (id: string, data: Partial<Tenant>) =>
        apiFetch<Tenant>(`/api/tenants/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
    },
    whatsapp: {
      qr: (tenantId: string) =>
        apiFetch<{ base64: string | null; status: string }>(
          `/api/tenants/${tenantId}/whatsapp/qr`
        ),
      status: (tenantId: string) =>
        apiFetch<{ evolution_instance_status: string }>(
          `/api/tenants/${tenantId}/whatsapp/status`
        ),
    },
  }
}
