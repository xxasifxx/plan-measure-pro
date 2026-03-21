ALTER TABLE public.annotations ADD COLUMN manual_quantity numeric DEFAULT NULL;
ALTER TABLE public.annotations ADD COLUMN location text DEFAULT '';
ALTER TABLE public.annotations ADD COLUMN notes text DEFAULT '';