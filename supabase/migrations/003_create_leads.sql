CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  gclid TEXT,
  ip TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  stage INTEGER DEFAULT 1 CHECK (stage IN (1, 2, 3)),
  conversion_value NUMERIC(10,2),
  first_message_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Dedup: one phone per tenant
CREATE UNIQUE INDEX leads_tenant_phone_idx ON leads (tenant_id, phone);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
