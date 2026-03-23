
-- Drop the auto-assign trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();

-- Create invitations table
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL,
  invited_by uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations
CREATE POLICY "Admins can manage invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view invitations sent to their email (for acceptance)
CREATE POLICY "Users can view own invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.jwt()->>'email'));

-- Create assign_owner_role function: assigns admin role to organic signups (no invitation)
CREATE OR REPLACE FUNCTION public.assign_owner_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign if user has zero roles AND no invitation record
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
     AND NOT EXISTS (SELECT 1 FROM public.invitations WHERE lower(email) = lower((SELECT email FROM auth.users WHERE id = _user_id)) AND accepted_at IS NOT NULL)
  THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin');
  END IF;
END;
$$;

-- Create accept_invitation function
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  calling_user_id uuid;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.invitations WHERE token = _token AND accepted_at IS NULL;
  IF NOT FOUND THEN
    RETURN 'invalid_or_used';
  END IF;

  -- Verify email matches
  IF lower(inv.email) != lower((SELECT email FROM auth.users WHERE id = calling_user_id)) THEN
    RETURN 'email_mismatch';
  END IF;

  -- Assign the role
  INSERT INTO public.user_roles (user_id, role) VALUES (calling_user_id, inv.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Mark accepted
  UPDATE public.invitations SET accepted_at = now() WHERE id = inv.id;

  RETURN 'ok';
END;
$$;
