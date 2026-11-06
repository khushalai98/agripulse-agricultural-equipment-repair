create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := lower(coalesce(new.raw_user_meta_data ->> 'role', 'farmer'));
  if requested_role not in ('farmer', 'technician') then
    requested_role := 'farmer';
  end if;

  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    requested_role,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  );
  return new;
end;
$$;
