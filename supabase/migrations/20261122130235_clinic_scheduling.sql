begin;

create schema if not exists clinic_private;
revoke all on schema clinic_private from public, anon, authenticated;

create table clinic_private.staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table clinic_private.services (
  id text primary key,
  name text not null,
  minutes integer not null check (minutes between 15 and 240 and minutes % 15 = 0)
);
create table clinic_private.hours (
  weekday integer primary key check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  enabled boolean not null,
  check (opens < closes and closes < time '24:00'
    and extract(second from opens) = 0 and extract(second from closes) = 0)
);
create table clinic_private.blocks (date date primary key);
create table clinic_private.appointments (
  id uuid primary key,
  service_id text not null references clinic_private.services(id),
  service_name text not null,
  start_at timestamptz not null,
  end_at timestamptz not null check (end_at > start_at),
  patient text not null check (char_length(patient) between 1 and 100),
  method text not null check (method in ('tel','email')),
  contact text not null check (char_length(contact) between 1 and 160),
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  created_at timestamptz not null default now(),
  exclude using gist (tstzrange(start_at,end_at,'[)') with &&) where (status = 'confirmed')
);

alter table clinic_private.staff enable row level security;
alter table clinic_private.services enable row level security;
alter table clinic_private.hours enable row level security;
alter table clinic_private.blocks enable row level security;
alter table clinic_private.appointments enable row level security;

insert into clinic_private.services values
  ('not-sure','Not sure yet',30), ('checkup','Dental Checkup (sample)',30),
  ('cleaning','Professional Cleaning (sample)',45), ('smile','Smile Consultation (sample)',30);
insert into clinic_private.hours
  select weekday, time '10:00', time '18:00', false from generate_series(0,6) as weekday;

create function clinic_private.require_staff() returns void
language plpgsql stable set search_path = ''
as $$
begin
  if not exists (select 1 from clinic_private.staff where user_id = auth.uid()) then
    raise insufficient_privilege using message = 'Clinic staff access is required.';
  end if;
end;
$$;

create function clinic_private.slots(service_id text, requested_date date, exclude_id uuid)
returns table(slot timestamptz)
language sql stable set search_path = ''
as $$
  select times.slot
  from clinic_private.hours h
  cross join clinic_private.services s
  cross join lateral generate_series(
    (requested_date + h.opens) at time zone 'Asia/Manila',
    ((requested_date + h.closes) at time zone 'Asia/Manila') - make_interval(mins => s.minutes),
    interval '15 minutes'
  ) as times(slot)
  where s.id = service_id and h.enabled and h.weekday = extract(dow from requested_date)
    and requested_date between (now() at time zone 'Asia/Manila')::date
      and (now() at time zone 'Asia/Manila')::date + 90
    and times.slot > now()
    and not exists (select 1 from clinic_private.blocks b where b.date = requested_date)
    and not exists (
      select 1 from clinic_private.appointments a
      where a.status = 'confirmed' and a.id is distinct from exclude_id
        and tstzrange(a.start_at,a.end_at,'[)') &&
          tstzrange(times.slot,times.slot + make_interval(mins => s.minutes),'[)')
    )
  order by times.slot;
$$;

create function public.clinic_services() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(s) order by case when id = 'not-sure' then 0 else 1 end,name),'[]')
  from clinic_private.services s;
$$;

create function public.clinic_slots(p_service text,p_date date) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(slot order by slot),'[]') from clinic_private.slots(p_service,p_date,null);
$$;

create function public.clinic_request(p_request jsonb) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  reference uuid := (p_request->>'id')::uuid;
  requested_start timestamptz := (p_request->>'start')::timestamptz;
  patient_name text := btrim(p_request->>'patient');
  contact_value text := btrim(p_request->>'contact');
  contact_method text := p_request->>'method';
  service clinic_private.services%rowtype;
  existing clinic_private.appointments%rowtype;
begin
  if reference is null or requested_start is null
    or coalesce(char_length(patient_name),0) not between 1 and 100
    or coalesce(char_length(contact_value),0) not between 1 and 160
    or not coalesce(
      (contact_method = 'email' and contact_value ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
      or (contact_method = 'tel' and contact_value ~ '^[+]?[0-9 ().-]+$'
        and regexp_replace(contact_value,'[^0-9]','','g') ~ '^(09[0-9]{9}|639[0-9]{9})$'),false) then
    raise exception 'Check the patient name and contact details.';
  end if;
  perform pg_advisory_xact_lock(71036104);
  select * into existing from clinic_private.appointments where id = reference;
  if found then
    if existing.patient = patient_name and existing.contact = contact_value and existing.method = contact_method
      and existing.service_id = p_request->>'service_id' then return reference; end if;
    raise exception 'This request could not be matched. Start another request.';
  end if;
  select * into service from clinic_private.services where id = p_request->>'service_id';
  if not exists (select 1 from clinic_private.slots(service.id,(requested_start at time zone 'Asia/Manila')::date,null)
    where slot = requested_start) then
    raise exception 'That time is no longer available. Please choose another time.';
  end if;
  insert into clinic_private.appointments (id,service_id,service_name,start_at,end_at,patient,method,contact)
  values (reference,service.id,service.name,requested_start,requested_start + make_interval(mins => service.minutes),
    patient_name,contact_method,contact_value);
  return reference;
end;
$$;

create function public.clinic_dashboard() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform clinic_private.require_staff();
  return jsonb_build_object(
    'services',public.clinic_services(),
    'hours',(select jsonb_agg(to_jsonb(h) order by weekday) from clinic_private.hours h),
    'blocks',(select coalesce(jsonb_agg(to_jsonb(b) order by date),'[]') from clinic_private.blocks b),
    'appointments',(select coalesce(jsonb_agg(
      (to_jsonb(a) - 'start_at' - 'end_at') || jsonb_build_object('start',start_at,'end',end_at)
      order by start_at desc),'[]') from clinic_private.appointments a)
  );
end;
$$;

create function public.clinic_move_slots(p_id uuid,p_date date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare service_id text;
begin
  perform clinic_private.require_staff();
  select a.service_id into service_id from clinic_private.appointments a where a.id = p_id;
  return (select coalesce(jsonb_agg(slot order by slot),'[]') from clinic_private.slots(service_id,p_date,p_id));
end;
$$;

create function public.clinic_update(p_id uuid,p_status text,p_move timestamptz) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  appointment clinic_private.appointments%rowtype;
  target_start timestamptz;
  target_end timestamptz;
begin
  perform clinic_private.require_staff();
  perform pg_advisory_xact_lock(71036104);
  select * into appointment from clinic_private.appointments where id = p_id for update;
  if not found or (p_move is null) = (p_status is null)
    or (p_move is not null and appointment.status not in ('pending','confirmed'))
    or (p_status is not null and not (
      (appointment.status = 'pending' and p_status in ('confirmed','cancelled'))
      or (appointment.status = 'confirmed' and p_status in ('completed','cancelled'))
    )) then
    raise exception 'That appointment has changed. Refresh and try again.';
  end if;
  if p_status = 'completed' and appointment.start_at > now() then
    raise exception 'This appointment has not started yet.';
  end if;
  target_start := coalesce(p_move,appointment.start_at);
  target_end := appointment.end_at;
  if p_move is not null or p_status = 'confirmed' then
    if not exists (select 1 from clinic_private.slots(appointment.service_id,(target_start at time zone 'Asia/Manila')::date,p_id)
      where slot = target_start) then
      raise exception 'That time is outside availability or overlaps a confirmed appointment.';
    end if;
    select target_start + make_interval(mins => minutes) into target_end
      from clinic_private.services where id = appointment.service_id;
  end if;
  update clinic_private.appointments
  set start_at = target_start,end_at = target_end,status = coalesce(p_status,appointment.status)
  where id = p_id;
  return jsonb_build_object('id',p_id);
end;
$$;

create function public.clinic_setting(p_kind text,p_value jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  blocked_on date;
begin
  perform clinic_private.require_staff();
  perform pg_advisory_xact_lock(71036104);
  case p_kind
    when 'hours' then
      if jsonb_array_length(p_value) <> 7 or (
        select count(distinct rule.weekday) from jsonb_to_recordset(p_value) as rule(weekday integer)
        where rule.weekday between 0 and 6
      ) <> 7 then raise exception 'Provide hours for all seven weekdays.'; end if;
      update clinic_private.hours h set opens = rule.opens,closes = rule.closes,enabled = rule.enabled
        from jsonb_to_recordset(p_value) as rule(weekday integer,opens time,closes time,enabled boolean)
        where h.weekday = rule.weekday;
    when 'services' then
      update clinic_private.services s set minutes = rule.minutes
        from jsonb_to_recordset(p_value) as rule(id text,minutes integer)
        where s.id = rule.id;
    when 'block' then
      blocked_on := (p_value->>'date')::date;
      if (p_value->>'blocked')::boolean then
        if blocked_on < (now() at time zone 'Asia/Manila')::date then raise exception 'Choose today or a future date.'; end if;
        if exists (select 1 from clinic_private.appointments where status = 'confirmed'
          and (start_at at time zone 'Asia/Manila')::date = blocked_on) then
          raise exception 'Reschedule or cancel confirmed appointments before blocking this date.';
        end if;
        insert into clinic_private.blocks values (blocked_on) on conflict do nothing;
      else
        delete from clinic_private.blocks where date = blocked_on;
      end if;
    else
      raise exception 'Unknown scheduling setting.';
  end case;
  return '{"saved":true}'::jsonb;
end;
$$;

revoke all on all tables in schema clinic_private from public, anon, authenticated;
revoke all on all functions in schema clinic_private from public, anon, authenticated;
revoke all on function public.clinic_services(),public.clinic_slots(text,date),public.clinic_request(jsonb),
  public.clinic_dashboard(),public.clinic_move_slots(uuid,date),public.clinic_update(uuid,text,timestamptz),
  public.clinic_setting(text,jsonb) from public,anon,authenticated;
grant execute on function public.clinic_services(),public.clinic_slots(text,date),public.clinic_request(jsonb) to anon,authenticated;
grant execute on function public.clinic_dashboard(),public.clinic_move_slots(uuid,date),
  public.clinic_update(uuid,text,timestamptz),public.clinic_setting(text,jsonb) to authenticated;

commit;
