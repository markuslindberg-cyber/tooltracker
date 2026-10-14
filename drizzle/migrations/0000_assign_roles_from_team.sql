CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _r text; _role app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;

  SELECT role INTO _r FROM public.team_members WHERE lower(email) = lower(NEW.email) LIMIT 1;
  _role := CASE _r
    WHEN 'ägare' THEN 'agare' WHEN 'admin' THEN 'admin'
    WHEN 'admin lokalvård' THEN 'admin_lokalvard' WHEN 'admin_lokalvård' THEN 'admin_lokalvard'
    WHEN 'lokalvårdare' THEN 'lokalvardare' WHEN 'verktygsförvaltare' THEN 'verktygsforvaltare'
    WHEN 'technician' THEN 'technician' WHEN 'apprentice' THEN 'apprentice' WHEN 'contractor' THEN 'contractor'
    ELSE NULL END;
  IF _role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role) ON CONFLICT DO NOTHING;
    UPDATE public.team_members SET user_id = NEW.id WHERE lower(email) = lower(NEW.email) AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$function$;