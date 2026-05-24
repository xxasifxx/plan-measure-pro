ALTER TABLE public.pay_items ADD COLUMN IF NOT EXISTS p6_activity_id text;
CREATE INDEX IF NOT EXISTS idx_pay_items_p6_activity ON public.pay_items(project_id, p6_activity_id) WHERE p6_activity_id IS NOT NULL;
COMMENT ON COLUMN public.pay_items.p6_activity_id IS 'Optional Primavera P6 Activity Id this pay item rolls up to for PMXML export. Set in /project/:id/p6-export.';