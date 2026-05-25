ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS allowed_origins TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN tenants.allowed_origins IS
  'Origens (URLs) dos sites do cliente autorizados a chamar /api/track via navegador (CORS).';
