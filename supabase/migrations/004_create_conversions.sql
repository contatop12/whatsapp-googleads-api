CREATE TABLE conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  stage INTEGER NOT NULL CHECK (stage IN (1, 2, 3)),
  gclid TEXT NOT NULL,
  conversion_name TEXT NOT NULL,
  conversion_value NUMERIC(10,2),
  triggered_at TIMESTAMPTZ DEFAULT now(),
  google_ads_status TEXT DEFAULT 'pending'
    CHECK (google_ads_status IN ('pending', 'accepted', 'rejected')),
  google_ads_response JSONB,
  triggered_by TEXT CHECK (triggered_by IN ('auto', 'manual'))
);

CREATE INDEX conversions_lead_idx ON conversions (lead_id);
CREATE INDEX conversions_tenant_idx ON conversions (tenant_id);
