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
  updated_at?: string
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
  allowed_origins: string[]
  evolution_instance_status: 'disconnected' | 'connecting' | 'connected'
  evolution_qr_code: string | null
  created_at?: string
}

export type UserRole = 'super_admin' | 'admin' | 'client'

export type User = {
  id: string
  name: string | null
  tenant_id: string | null
  role: UserRole
  created_at: string
  email?: string
}
