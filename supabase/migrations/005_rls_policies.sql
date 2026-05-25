ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- Helper functions in private schema (not exposed via REST API)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- tenants
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (private.is_admin() OR id = private.get_my_tenant_id());
CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (private.is_admin() OR id = private.get_my_tenant_id());
CREATE POLICY tenants_insert ON tenants FOR INSERT
  WITH CHECK (private.is_admin());

-- users
CREATE POLICY users_select ON users FOR SELECT
  USING (private.is_admin() OR id = auth.uid());
CREATE POLICY users_update ON users FOR UPDATE
  USING (private.is_admin() OR id = auth.uid());

-- leads
CREATE POLICY leads_select ON leads FOR SELECT
  USING (private.is_admin() OR tenant_id = private.get_my_tenant_id());
CREATE POLICY leads_insert ON leads FOR INSERT
  WITH CHECK (private.is_admin() OR tenant_id = private.get_my_tenant_id());
CREATE POLICY leads_update ON leads FOR UPDATE
  USING (private.is_admin() OR tenant_id = private.get_my_tenant_id());

-- conversions
CREATE POLICY conversions_select ON conversions FOR SELECT
  USING (private.is_admin() OR tenant_id = private.get_my_tenant_id());
CREATE POLICY conversions_insert ON conversions FOR INSERT
  WITH CHECK (private.is_admin() OR tenant_id = private.get_my_tenant_id());
