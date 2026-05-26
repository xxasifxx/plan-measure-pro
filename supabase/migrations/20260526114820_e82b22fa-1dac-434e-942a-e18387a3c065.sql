
REVOKE EXECUTE ON FUNCTION public.replace_project_schedule(uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_project_schedule(uuid, jsonb, jsonb, jsonb) TO authenticated;
