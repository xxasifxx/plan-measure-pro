-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all project_members
CREATE POLICY "Admins can view all project members"
ON public.project_members FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage all project_members
CREATE POLICY "Admins can manage all project members"
ON public.project_members FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can view all projects
CREATE POLICY "Admins can view all projects"
ON public.projects FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));