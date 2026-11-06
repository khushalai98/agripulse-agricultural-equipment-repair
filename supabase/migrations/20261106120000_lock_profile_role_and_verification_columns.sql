-- Remove inherited table-level write privileges that override the intended
-- column-level profile update grant. Profile role and phone verification are
-- managed only by trusted server-side processes.
revoke all privileges on table public.profiles from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, phone, village_city, district, state, pin_code, updated_at)
  on table public.profiles to authenticated;
