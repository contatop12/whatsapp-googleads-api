CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  google_ads_customer_id TEXT,
  google_ads_conversion_new_lead TEXT,
  google_ads_conversion_qualified TEXT,
  google_ads_conversion_converted TEXT,
  conversion_value_qualified NUMERIC(10,2),
  conversion_value_converted NUMERIC(10,2),
  evolution_api_instance TEXT,
  evolution_api_key TEXT,
  evolution_instance_status TEXT DEFAULT 'disconnected'
    CHECK (evolution_instance_status IN ('disconnected', 'connecting', 'connected')),
  evolution_qr_code TEXT,
  evolution_qr_expires_at TIMESTAMPTZ,
  keywords_qualified TEXT[] DEFAULT '{}',
  keywords_converted TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
