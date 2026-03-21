
-- ============================================
-- ENUM: app_role
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'project_manager', 'inspector');

-- ============================================
-- TABLE: profiles
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- TABLE: user_roles (separate from profiles!)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNCTION: has_role (security definer)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles: users can read own roles, admins can manage all
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- TABLE: projects
-- ============================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contract_number TEXT,
  pdf_storage_path TEXT,
  specs_storage_path TEXT,
  toc JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABLE: project_members
-- ============================================
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'inspector' CHECK (role IN ('manager', 'inspector')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABLE: pay_items
-- ============================================
CREATE TABLE public.pay_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  contract_quantity NUMERIC,
  drawable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pay_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABLE: calibrations
-- ============================================
CREATE TABLE public.calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  point1 JSONB NOT NULL,
  point2 JSONB NOT NULL,
  real_distance NUMERIC NOT NULL,
  pixels_per_foot NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, page)
);

ALTER TABLE public.calibrations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABLE: annotations
-- ============================================
CREATE TABLE public.annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('line', 'polygon', 'count')),
  points JSONB NOT NULL DEFAULT '[]'::jsonb,
  pay_item_id UUID REFERENCES public.pay_items(id) ON DELETE SET NULL,
  page INTEGER NOT NULL,
  depth NUMERIC,
  measurement NUMERIC NOT NULL DEFAULT 0,
  measurement_unit TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER: is_project_member
-- ============================================
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id
  ) OR EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND created_by = _user_id
  )
$$;

-- ============================================
-- RLS POLICIES: projects
-- ============================================
CREATE POLICY "Creators can manage own projects"
  ON public.projects FOR ALL
  USING (auth.uid() = created_by);

CREATE POLICY "Members can view assigned projects"
  ON public.projects FOR SELECT
  USING (public.is_project_member(auth.uid(), id));

-- ============================================
-- RLS POLICIES: project_members
-- ============================================
CREATE POLICY "Project creators can manage members"
  ON public.project_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

CREATE POLICY "Members can view own membership"
  ON public.project_members FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: pay_items
-- ============================================
CREATE POLICY "Project members can view pay items"
  ON public.pay_items FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project creators can manage pay items"
  ON public.pay_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- ============================================
-- RLS POLICIES: calibrations
-- ============================================
CREATE POLICY "Project members can view calibrations"
  ON public.calibrations FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project creators can manage calibrations"
  ON public.calibrations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- ============================================
-- RLS POLICIES: annotations
-- ============================================
CREATE POLICY "Users can manage own annotations"
  ON public.annotations FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Project members can view all annotations"
  ON public.annotations FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('project-pdfs', 'project-pdfs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('specs-pdfs', 'specs-pdfs', false);

-- Storage policies: project members can access PDFs
CREATE POLICY "Authenticated users can upload project PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-pdfs');

CREATE POLICY "Authenticated users can read project PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'project-pdfs');

CREATE POLICY "Authenticated users can upload specs PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'specs-pdfs');

CREATE POLICY "Authenticated users can read specs PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'specs-pdfs');

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER: update updated_at on projects
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
