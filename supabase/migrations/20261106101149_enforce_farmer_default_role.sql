create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Every self-service signup starts as a farmer.
  -- Technician access must be granted through a trusted admin/server workflow.
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    'farmer',
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  );
  return new;
end;
$$;
