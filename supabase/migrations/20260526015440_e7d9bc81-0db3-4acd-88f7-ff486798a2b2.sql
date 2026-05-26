CREATE TABLE public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own device tokens"
ON public.device_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own device tokens"
ON public.device_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own device tokens"
ON public.device_tokens FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own device tokens"
ON public.device_tokens FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_device_tokens_user ON public.device_tokens(user_id);