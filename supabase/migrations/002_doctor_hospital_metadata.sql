-- Persist hospital from signup metadata onto doctor_profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  begin
    v_role := (new.raw_user_meta_data ->> 'role')::user_role;
  exception when invalid_text_representation then
    v_role := 'patient';
  end;

  if v_role is null then
    v_role := 'patient';
  end if;

  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );

  if v_role = 'doctor' then
    insert into public.doctor_profiles (profile_id, specialty, hospital)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'specialty', 'General Physician'),
      new.raw_user_meta_data ->> 'hospital'
    );
  else
    insert into public.patient_profiles (profile_id)
    values (new.id);
  end if;

  return new;
end;
$$;
