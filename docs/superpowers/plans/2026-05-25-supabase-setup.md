# Supabase Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **NOTE:** Before executing any Supabase task, invoke the `supabase:supabase` skill.

**Goal:** Create all DB schema migrations, RLS policies, and seed data for the WhatsApp → Google Ads tracking system on Supabase.

**Architecture:** 4 tables (tenants, users, leads, conversions) with Row Level Security enforcing tenant isolation. Supabase Auth handles JWT. Service role key used by backend for admin operations; anon key used by frontend with RLS.

**Tech Stack:** Supabase (PostgreSQL 15), Supabase CLI, SQL migrations

---

## File Structure

```
supabase/
├── migrations/
│   ├── 001_tenants.sql       - tenants table
│   ├── 002_users.sql         - users table linked to auth.users
│   ├── 003_leads.sql         - leads table with geo + gclid
│   ├── 004_conversions.sql   - conversions audit table
│   └── 005_rls_policies.sql  - RLS policies for all tables
└── seed/
    └── 001_seed_admin.sql    - first admin user (fill UUID after creating in Auth)
```

---

### Task 1: Create tenants migration

**Files:**
- Create: `supabase/migrations/001_tenants.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/001_tenants.sql
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
```

- [ ] **Step 2: Run in Supabase SQL Editor**

Paste into Supabase → SQL Editor → Run.

- [ ] **Step 3: Verify**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
ORDER BY ordinal_position;
-- Must return 17 rows
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_tenants.sql
git commit -m "feat(db): add tenants table"
```

---

### Task 2: Create users migration

**Files:**
- Create: `supabase/migrations/002_users.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/002_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  role TEXT CHECK (role IN ('admin', 'client')) DEFAULT 'client',
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger: auto-insert row in users when auth.users row created
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
```

- [ ] **Step 2: Run in Supabase SQL Editor**

- [ ] **Step 3: Verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
-- Returns: id, tenant_id, role, name, created_at
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_users.sql
git commit -m "feat(db): add users table with auth trigger"
```

---

### Task 3: Create leads migration

**Files:**
- Create: `supabase/migrations/003_leads.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/003_leads.sql
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

-- Index for fast tenant+phone lookup (dedup check)
CREATE UNIQUE INDEX leads_tenant_phone_idx ON leads (tenant_id, phone);

-- Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- [ ] **Step 2: Run in Supabase SQL Editor**

- [ ] **Step 3: Verify**

```sql
-- Verify unique index
SELECT indexname FROM pg_indexes WHERE tablename = 'leads';
-- Must include: leads_tenant_phone_idx

-- Verify updated_at trigger fires
INSERT INTO tenants (name, slug) VALUES ('Test', 'test-verify');
INSERT INTO leads (tenant_id, phone)
  SELECT id, '+5511999999999' FROM tenants WHERE slug = 'test-verify';
UPDATE leads SET name = 'Test Name' WHERE phone = '+5511999999999';
SELECT updated_at > created_at FROM leads WHERE phone = '+5511999999999';
-- Must return: true

-- Cleanup
DELETE FROM tenants WHERE slug = 'test-verify';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/003_leads.sql
git commit -m "feat(db): add leads table with unique phone index"
```

---

### Task 4: Create conversions migration

**Files:**
- Create: `supabase/migrations/004_conversions.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/004_conversions.sql
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

-- Index for fast lead history lookup
CREATE INDEX conversions_lead_idx ON conversions (lead_id);
CREATE INDEX conversions_tenant_idx ON conversions (tenant_id);
```

- [ ] **Step 2: Run in Supabase SQL Editor**

- [ ] **Step 3: Verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'conversions'
ORDER BY ordinal_position;
-- Returns 12 columns
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_conversions.sql
git commit -m "feat(db): add conversions table"
```

---

### Task 5: Enable RLS and create policies

**Files:**
- Create: `supabase/migrations/005_rls_policies.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/005_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- Helper function: get calling user's tenant_id
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: check if calling user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- tenants: admin sees all, client sees own
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (is_admin() OR id = get_my_tenant_id());

CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (is_admin() OR id = get_my_tenant_id());

CREATE POLICY tenants_insert ON tenants FOR INSERT
  WITH CHECK (is_admin());

-- users: admin sees all, client sees own row
CREATE POLICY users_select ON users FOR SELECT
  USING (is_admin() OR id = auth.uid());

CREATE POLICY users_update ON users FOR UPDATE
  USING (is_admin() OR id = auth.uid());

-- leads: admin sees all, client sees own tenant
CREATE POLICY leads_select ON leads FOR SELECT
  USING (is_admin() OR tenant_id = get_my_tenant_id());

CREATE POLICY leads_insert ON leads FOR INSERT
  WITH CHECK (is_admin() OR tenant_id = get_my_tenant_id());

CREATE POLICY leads_update ON leads FOR UPDATE
  USING (is_admin() OR tenant_id = get_my_tenant_id());

-- conversions: admin sees all, client sees own tenant
CREATE POLICY conversions_select ON conversions FOR SELECT
  USING (is_admin() OR tenant_id = get_my_tenant_id());

CREATE POLICY conversions_insert ON conversions FOR INSERT
  WITH CHECK (is_admin() OR tenant_id = get_my_tenant_id());
```

- [ ] **Step 2: Run in Supabase SQL Editor**

- [ ] **Step 3: Verify RLS is enabled**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('tenants', 'users', 'leads', 'conversions')
  AND schemaname = 'public';
-- All 4 rows must have rowsecurity = true
```

- [ ] **Step 4: Verify policies exist**

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('tenants', 'users', 'leads', 'conversions')
ORDER BY tablename, policyname;
-- Must return 9 policies
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_rls_policies.sql
git commit -m "feat(db): enable RLS and create tenant isolation policies"
```

---

### Task 6: Create first admin user

**Files:**
- Create: `supabase/seed/001_seed_admin.sql`

- [ ] **Step 1: Create user in Supabase Auth**

Supabase dashboard → Authentication → Users → "Add user" (email + password).
Copy the generated UUID.

- [ ] **Step 2: Write seed SQL (fill in UUID)**

```sql
-- supabase/seed/001_seed_admin.sql
-- Replace <UUID_FROM_AUTH> with the actual UUID from step 1
UPDATE public.users
SET role = 'admin', name = 'Admin P12'
WHERE id = '<UUID_FROM_AUTH>';
```

- [ ] **Step 3: Run in Supabase SQL Editor**

- [ ] **Step 4: Verify**

```sql
SELECT id, role, name FROM users WHERE role = 'admin';
-- Returns 1 row with role = 'admin'
```

- [ ] **Step 5: Commit**

```bash
git add supabase/seed/001_seed_admin.sql
git commit -m "feat(db): add admin user seed"
```

---

### Task 7: Test tenant isolation end-to-end

No code files — verification in Supabase SQL Editor.

- [ ] **Step 1: Create 2 test tenants and 2 test leads**

```sql
-- Create 2 tenants
INSERT INTO tenants (name, slug) VALUES
  ('Cliente A', 'cliente-a'),
  ('Cliente B', 'cliente-b');

-- Get their IDs
SELECT id, slug FROM tenants WHERE slug IN ('cliente-a', 'cliente-b');
-- Note: <ID_A> and <ID_B>

-- Insert a lead for each tenant
INSERT INTO leads (tenant_id, phone, name)
SELECT id, '+5511000000001', 'Lead A' FROM tenants WHERE slug = 'cliente-a';

INSERT INTO leads (tenant_id, phone, name)
SELECT id, '+5511000000002', 'Lead B' FROM tenants WHERE slug = 'cliente-b';
```

- [ ] **Step 2: Verify dedup index (same phone in same tenant = error)**

```sql
-- This MUST fail with unique violation
INSERT INTO leads (tenant_id, phone, name)
SELECT id, '+5511000000001', 'Lead A Dup' FROM tenants WHERE slug = 'cliente-a';
-- Expected: ERROR: duplicate key value violates unique constraint "leads_tenant_phone_idx"
```

- [ ] **Step 3: Verify same phone allowed across tenants**

```sql
-- This MUST succeed (same phone, different tenant)
INSERT INTO leads (tenant_id, phone, name)
SELECT id, '+5511000000001', 'Lead A in B' FROM tenants WHERE slug = 'cliente-b';
-- Expected: INSERT 0 1
```

- [ ] **Step 4: Cleanup test data**

```sql
DELETE FROM tenants WHERE slug IN ('cliente-a', 'cliente-b');
```

- [ ] **Step 5: Commit**

```bash
git commit -m "test(db): verify tenant isolation and dedup logic"
```
