ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS evolution_webhook_secret TEXT;
