
-- =====================================================
-- ROLES & USERS
-- =====================================================

CREATE TYPE public.app_role AS ENUM (
  'technician',
  'apprentice',
  'contractor',
  'admin_lokalvard',
  'lokalvardare',
  'verktygsforvaltare',
  'admin',
  'agare'
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Profiles policies
CREATE POLICY "Profiles readable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins manage profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_roles policies
CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));

-- =====================================================
-- LOCATIONS
-- =====================================================
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  type TEXT,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Locations readable by authenticated" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage locations" ON public.locations FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]));
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- TEAM MEMBERS
-- =====================================================
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  default_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  default_location_name TEXT,
  location_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  location_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TeamMembers readable by authorized" ON public.team_members FOR SELECT TO authenticated
  USING (
    email = (SELECT auth.jwt()->>'email') OR
    public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[])
  );
CREATE POLICY "Admins manage team members" ON public.team_members FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- CATEGORIES
-- =====================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  subcategories JSONB NOT NULL DEFAULT '[]'::jsonb,
  page_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories readable by managers" ON public.categories FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]));
CREATE POLICY "Categories managed by admins" ON public.categories FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.category_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_images TO authenticated;
GRANT ALL ON public.category_images TO service_role;
ALTER TABLE public.category_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CategoryImages readable" ON public.category_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "CategoryImages managed by admins" ON public.category_images FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER category_images_updated_at BEFORE UPDATE ON public.category_images FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- TOOLS / HAND_TOOLS / HUVUDMASKINER / ARBETSKLADER
-- =====================================================
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  category TEXT,
  subcategory TEXT,
  serial_number TEXT,
  status TEXT NOT NULL DEFAULT 'i_lager',
  condition TEXT DEFAULT 'bra',
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  location_name TEXT,
  assigned_to_email TEXT,
  assigned_to_name TEXT,
  huvudmaskin_id UUID,
  purchase_date DATE,
  purchase_price NUMERIC,
  barcode TEXT,
  image_url TEXT,
  notes TEXT,
  is_sold BOOLEAN NOT NULL DEFAULT false,
  sold_date DATE,
  sold_price NUMERIC,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tools TO authenticated;
GRANT ALL ON public.tools TO service_role;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tools readable" ON public.tools FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard','technician','apprentice','contractor']::public.app_role[]));
CREATE POLICY "Tools managed" ON public.tools FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]));
CREATE TRIGGER tools_updated_at BEFORE UPDATE ON public.tools FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.hand_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  manufacturer TEXT,
  category TEXT,
  subcategory TEXT,
  status TEXT NOT NULL DEFAULT 'i_lager',
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  location_name TEXT,
  assigned_to_email TEXT,
  assigned_to_name TEXT,
  purchase_date DATE,
  purchase_price NUMERIC,
  barcode TEXT,
  image_url TEXT,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hand_tools TO authenticated;
GRANT ALL ON public.hand_tools TO service_role;
ALTER TABLE public.hand_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HandTools readable" ON public.hand_tools FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]));
CREATE POLICY "HandTools managed" ON public.hand_tools FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]));
CREATE TRIGGER hand_tools_updated_at BEFORE UPDATE ON public.hand_tools FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.huvudmaskiner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  typ TEXT,
  manufacturer TEXT,
  model TEXT,
  year_model INTEGER,
  registration_number TEXT,
  project_number TEXT,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  location_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.huvudmaskiner TO authenticated;
GRANT ALL ON public.huvudmaskiner TO service_role;
ALTER TABLE public.huvudmaskiner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Huvudmaskiner readable" ON public.huvudmaskiner FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard','verktygsforvaltare']::public.app_role[]));
CREATE POLICY "Huvudmaskiner managed" ON public.huvudmaskiner FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]));
CREATE TRIGGER huvudmaskiner_updated_at BEFORE UPDATE ON public.huvudmaskiner FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.arbetsklader_utrustning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  manufacturer TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  size TEXT,
  quantity NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'i_lager',
  condition TEXT DEFAULT 'bra',
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  location_name TEXT,
  purchase_date DATE,
  purchase_price NUMERIC,
  barcode TEXT,
  image_url TEXT,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arbetsklader_utrustning TO authenticated;
GRANT ALL ON public.arbetsklader_utrustning TO service_role;
ALTER TABLE public.arbetsklader_utrustning ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Arbetsklader managed" ON public.arbetsklader_utrustning FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]));
CREATE TRIGGER arbetsklader_updated_at BEFORE UPDATE ON public.arbetsklader_utrustning FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- TOOL LOGS / TRANSFERS / LOAN_REQUESTS / WORKWEAR_REQUESTS
-- =====================================================
CREATE TABLE public.tool_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID,
  tool_type TEXT,
  tool_name TEXT,
  action TEXT NOT NULL,
  performed_by_email TEXT,
  performed_by_name TEXT,
  from_location_id UUID,
  from_location_name TEXT,
  to_location_id UUID,
  to_location_name TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tool_logs TO authenticated;
GRANT ALL ON public.tool_logs TO service_role;
ALTER TABLE public.tool_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ToolLogs readable" ON public.tool_logs FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]));
CREATE POLICY "ToolLogs insertable by auth" ON public.tool_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID,
  tool_type TEXT,
  tool_name TEXT,
  from_location_id UUID,
  from_location_name TEXT,
  to_location_id UUID,
  to_location_name TEXT,
  requested_by_email TEXT,
  requested_by_name TEXT,
  approved_by_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO service_role;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transfers readable" ON public.transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Transfers insert" ON public.transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Transfers update by managers" ON public.transfers FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]));
CREATE POLICY "Transfers delete by admins" ON public.transfers FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER transfers_updated_at BEFORE UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.loan_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID,
  tool_type TEXT,
  tool_name TEXT,
  borrower_email TEXT,
  borrower_name TEXT,
  from_location_id UUID,
  from_location_name TEXT,
  to_location_id UUID,
  to_location_name TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  approved_by_email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_requests TO authenticated;
GRANT ALL ON public.loan_requests TO service_role;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LoanRequests readable" ON public.loan_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "LoanRequests insert by auth" ON public.loan_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "LoanRequests update by managers" ON public.loan_requests FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare']::public.app_role[]));
CREATE POLICY "LoanRequests delete by admins" ON public.loan_requests FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER loan_requests_updated_at BEFORE UPDATE ON public.loan_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workwear_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email TEXT,
  requester_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  approved_by_email TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workwear_requests TO authenticated;
GRANT ALL ON public.workwear_requests TO service_role;
ALTER TABLE public.workwear_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WorkwearRequests readable" ON public.workwear_requests FOR SELECT TO authenticated
  USING (requester_email = (SELECT auth.jwt()->>'email')
    OR public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]));
CREATE POLICY "WorkwearRequests insert" ON public.workwear_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "WorkwearRequests update" ON public.workwear_requests FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]));
CREATE POLICY "WorkwearRequests delete" ON public.workwear_requests FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER workwear_requests_updated_at BEFORE UPDATE ON public.workwear_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- SERVICE
-- =====================================================
CREATE TABLE public.service_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  interval_months INTEGER,
  interval_hours INTEGER,
  description TEXT,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_templates TO authenticated;
GRANT ALL ON public.service_templates TO service_role;
ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ServiceTemplates readable" ON public.service_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "ServiceTemplates managed" ON public.service_templates FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare']::public.app_role[]));
CREATE TRIGGER service_templates_updated_at BEFORE UPDATE ON public.service_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID,
  tool_type TEXT,
  tool_name TEXT,
  service_date DATE NOT NULL,
  service_type TEXT,
  performed_by_email TEXT,
  performed_by_name TEXT,
  cost NUMERIC,
  hours_at_service INTEGER,
  notes TEXT,
  next_service_date DATE,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_records TO authenticated;
GRANT ALL ON public.service_records TO service_role;
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ServiceRecords readable" ON public.service_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "ServiceRecords managed" ON public.service_records FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare']::public.app_role[]));
CREATE TRIGGER service_records_updated_at BEFORE UPDATE ON public.service_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- DEPRECIATION
-- =====================================================
CREATE TABLE public.depreciation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_name TEXT NOT NULL,
  annual_percentage NUMERIC NOT NULL,
  minimum_value_percentage NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.depreciation_settings TO authenticated;
GRANT ALL ON public.depreciation_settings TO service_role;
ALTER TABLE public.depreciation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Depreciation readable" ON public.depreciation_settings FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard','verktygsforvaltare']::public.app_role[]));
CREATE POLICY "Depreciation managed by owner" ON public.depreciation_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'agare'))
  WITH CHECK (public.has_role(auth.uid(), 'agare'));
CREATE TRIGGER depreciation_settings_updated_at BEFORE UPDATE ON public.depreciation_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- LOKALVARD
-- =====================================================
CREATE TABLE public.kunder (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namn TEXT NOT NULL,
  typ TEXT NOT NULL,
  projektnummer TEXT,
  status TEXT NOT NULL DEFAULT 'aktiv',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kunder TO authenticated;
GRANT ALL ON public.kunder TO service_role;
ALTER TABLE public.kunder ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kunder readable" ON public.kunder FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard','lokalvardare']::public.app_role[]));
CREATE POLICY "Kunder managed" ON public.kunder FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]));
CREATE TRIGGER kunder_updated_at BEFORE UPDATE ON public.kunder FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lokalvards_artiklar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artikelnummer TEXT,
  namn TEXT NOT NULL,
  beskrivning TEXT,
  kategori TEXT,
  underkategori TEXT,
  enhet TEXT,
  pris_per_enhet NUMERIC,
  lagersaldo NUMERIC DEFAULT 0,
  minimum_lagersaldo NUMERIC DEFAULT 0,
  leverantor TEXT,
  streckkod TEXT,
  image_url TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lokalvards_artiklar TO authenticated;
GRANT ALL ON public.lokalvards_artiklar TO service_role;
ALTER TABLE public.lokalvards_artiklar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artiklar readable" ON public.lokalvards_artiklar FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard','lokalvardare']::public.app_role[]));
CREATE POLICY "Artiklar managed" ON public.lokalvards_artiklar FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]));
CREATE TRIGGER lokalvards_artiklar_updated_at BEFORE UPDATE ON public.lokalvards_artiklar FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lokalvard_inkop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artikel_id UUID REFERENCES public.lokalvards_artiklar(id) ON DELETE SET NULL,
  artikel_namn TEXT,
  datum DATE NOT NULL,
  antal NUMERIC NOT NULL DEFAULT 0,
  pris NUMERIC,
  leverantor TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lokalvard_inkop TO authenticated;
GRANT ALL ON public.lokalvard_inkop TO service_role;
ALTER TABLE public.lokalvard_inkop ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inkop readable" ON public.lokalvard_inkop FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard','lokalvardare']::public.app_role[]));
CREATE POLICY "Inkop managed" ON public.lokalvard_inkop FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]));
CREATE TRIGGER lokalvard_inkop_updated_at BEFORE UPDATE ON public.lokalvard_inkop FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lokalvard_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artikel_id UUID REFERENCES public.lokalvards_artiklar(id) ON DELETE SET NULL,
  artikel_namn TEXT,
  kund_id UUID REFERENCES public.kunder(id) ON DELETE SET NULL,
  kund_namn TEXT,
  projektnummer TEXT,
  antal NUMERIC NOT NULL DEFAULT 0,
  datum TIMESTAMPTZ NOT NULL DEFAULT now(),
  utfort_av_email TEXT,
  utfort_av_namn TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lokalvard_checkouts TO authenticated;
GRANT ALL ON public.lokalvard_checkouts TO service_role;
ALTER TABLE public.lokalvard_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Checkouts readable" ON public.lokalvard_checkouts FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard','lokalvardare']::public.app_role[]));
CREATE POLICY "Checkouts insertable" ON public.lokalvard_checkouts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Checkouts managed" ON public.lokalvard_checkouts FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]));
CREATE POLICY "Checkouts deletable" ON public.lokalvard_checkouts FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER lokalvard_checkouts_updated_at BEFORE UPDATE ON public.lokalvard_checkouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lokalvard_artikel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artikel_id UUID REFERENCES public.lokalvards_artiklar(id) ON DELETE SET NULL,
  artikel_namn TEXT,
  requester_email TEXT,
  requester_name TEXT,
  antal NUMERIC NOT NULL DEFAULT 1,
  kund_id UUID REFERENCES public.kunder(id) ON DELETE SET NULL,
  kund_namn TEXT,
  projektnummer TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  approved_by_email TEXT,
  approved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lokalvard_artikel_requests TO authenticated;
GRANT ALL ON public.lokalvard_artikel_requests TO service_role;
ALTER TABLE public.lokalvard_artikel_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ArtikelReq readable" ON public.lokalvard_artikel_requests FOR SELECT TO authenticated
  USING (requester_email = (SELECT auth.jwt()->>'email')
    OR public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]));
CREATE POLICY "ArtikelReq insert" ON public.lokalvard_artikel_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ArtikelReq update" ON public.lokalvard_artikel_requests FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]));
CREATE POLICY "ArtikelReq delete" ON public.lokalvard_artikel_requests FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER lokalvard_artikel_requests_updated_at BEFORE UPDATE ON public.lokalvard_artikel_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.uttag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kund_id UUID REFERENCES public.kunder(id) ON DELETE SET NULL,
  kund_namn TEXT,
  projektnummer TEXT,
  datum DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_pris NUMERIC DEFAULT 0,
  utfort_av_email TEXT,
  utfort_av_namn TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uttag TO authenticated;
GRANT ALL ON public.uttag TO service_role;
ALTER TABLE public.uttag ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Uttag readable" ON public.uttag FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard','lokalvardare']::public.app_role[]));
CREATE POLICY "Uttag managed" ON public.uttag FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard','lokalvardare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard','lokalvardare']::public.app_role[]));
CREATE TRIGGER uttag_updated_at BEFORE UPDATE ON public.uttag FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- REPORTS / INVENTORY
-- =====================================================
CREATE TABLE public.checkout_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project TEXT NOT NULL,
  recipient_first_name TEXT NOT NULL,
  recipient_last_name TEXT NOT NULL,
  checked_out_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  checked_out_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_reports TO authenticated;
GRANT ALL ON public.checkout_reports TO service_role;
ALTER TABLE public.checkout_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CheckoutReports own/admin read" ON public.checkout_reports FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE POLICY "CheckoutReports insert" ON public.checkout_reports FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "CheckoutReports update" ON public.checkout_reports FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE POLICY "CheckoutReports delete" ON public.checkout_reports FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER checkout_reports_updated_at BEFORE UPDATE ON public.checkout_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.inventory_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID,
  location_name TEXT,
  tool_type TEXT,
  mode TEXT,
  performed_by_email TEXT,
  performed_by_name TEXT,
  performed_at TIMESTAMPTZ NOT NULL,
  total_items NUMERIC NOT NULL DEFAULT 0,
  checked_items NUMERIC NOT NULL DEFAULT 0,
  unchecked_items NUMERIC NOT NULL DEFAULT 0,
  checked_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  unchecked_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_reports TO authenticated;
GRANT ALL ON public.inventory_reports TO service_role;
ALTER TABLE public.inventory_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "InvReports readable" ON public.inventory_reports FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare']::public.app_role[]));
CREATE POLICY "InvReports managed" ON public.inventory_reports FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER inventory_reports_updated_at BEFORE UPDATE ON public.inventory_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.inventory_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pagaende',
  mode TEXT NOT NULL,
  location_id UUID,
  location_name TEXT,
  tool_type TEXT NOT NULL,
  checked_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  manual_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_by_email TEXT,
  started_by_name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_sessions TO authenticated;
GRANT ALL ON public.inventory_sessions TO service_role;
ALTER TABLE public.inventory_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "InvSessions readable" ON public.inventory_sessions FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]));
CREATE POLICY "InvSessions managed" ON public.inventory_sessions FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare','admin_lokalvard']::public.app_role[]));
CREATE TRIGGER inventory_sessions_updated_at BEFORE UPDATE ON public.inventory_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.inventeringar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum TIMESTAMPTZ NOT NULL,
  personal_id UUID,
  personal_namn TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pagaende',
  scanningar JSONB NOT NULL DEFAULT '[]'::jsonb,
  anteckningar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventeringar TO authenticated;
GRANT ALL ON public.inventeringar TO service_role;
ALTER TABLE public.inventeringar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inventeringar readable" ON public.inventeringar FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE POLICY "Inventeringar managed" ON public.inventeringar FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER inventeringar_updated_at BEFORE UPDATE ON public.inventeringar FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.inventering_skanningar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventering_id UUID REFERENCES public.inventeringar(id) ON DELETE CASCADE,
  artikel_id UUID,
  artikel_namn TEXT NOT NULL,
  streckkod TEXT NOT NULL,
  scannad_antal NUMERIC NOT NULL,
  registrerad_tid TIMESTAMPTZ NOT NULL DEFAULT now(),
  scannad_av_email TEXT,
  scannad_av_namn TEXT,
  anteckningar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventering_skanningar TO authenticated;
GRANT ALL ON public.inventering_skanningar TO service_role;
ALTER TABLE public.inventering_skanningar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skanningar readable" ON public.inventering_skanningar FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare']::public.app_role[]));
CREATE POLICY "Skanningar insert" ON public.inventering_skanningar FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare','verktygsforvaltare']::public.app_role[]));
CREATE POLICY "Skanningar managed" ON public.inventering_skanningar FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE POLICY "Skanningar deletable" ON public.inventering_skanningar FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));

-- =====================================================
-- ROLE PERMISSIONS / GLOBAL CONFIG / SPREADSHEET
-- =====================================================
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  resource TEXT NOT NULL,
  permission TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, resource, permission)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RolePerm readable" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "RolePerm managed" ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'agare'))
  WITH CHECK (public.has_role(auth.uid(), 'agare'));
CREATE TRIGGER role_permissions_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.global_app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_app_config TO authenticated;
GRANT ALL ON public.global_app_config TO service_role;
ALTER TABLE public.global_app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Config readable" ON public.global_app_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Config managed" ON public.global_app_config FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER global_app_config_updated_at BEFORE UPDATE ON public.global_app_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.spreadsheet_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  col_index INTEGER NOT NULL,
  value TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sheet_id, row_index, col_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spreadsheet_cells TO authenticated;
GRANT ALL ON public.spreadsheet_cells TO service_role;
ALTER TABLE public.spreadsheet_cells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cells readable" ON public.spreadsheet_cells FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cells managed" ON public.spreadsheet_cells FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','agare']::public.app_role[]));
CREATE TRIGGER spreadsheet_cells_updated_at BEFORE UPDATE ON public.spreadsheet_cells FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_tools_location ON public.tools(location_id);
CREATE INDEX idx_tools_status ON public.tools(status);
CREATE INDEX idx_hand_tools_location ON public.hand_tools(location_id);
CREATE INDEX idx_arbetsklader_location ON public.arbetsklader_utrustning(location_id);
CREATE INDEX idx_transfers_status ON public.transfers(status);
CREATE INDEX idx_loan_requests_status ON public.loan_requests(status);
CREATE INDEX idx_lokalvard_inkop_artikel ON public.lokalvard_inkop(artikel_id);
CREATE INDEX idx_lokalvard_checkouts_artikel ON public.lokalvard_checkouts(artikel_id);
CREATE INDEX idx_lokalvard_checkouts_kund ON public.lokalvard_checkouts(kund_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
