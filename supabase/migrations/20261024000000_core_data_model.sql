-- Dad Care · core data model (spec v1, "Data, privacy and reliability")
-- Household, Person, Device, Event, State, Alert, Routine, plus medicines and daily summaries.
-- Raw events are kept 30 days (pruning job comes later); daily_summaries are kept long-term.

create type public.person_role    as enum ('care_receiver', 'caregiver', 'responder', 'viewer');
create type public.responder_role as enum ('first_responder', 'backup', 'driver');
create type public.device_type    as enum ('phone', 'watch', 'room_sensor', 'simulator');
create type public.event_type     as enum ('presence', 'checkin', 'dose', 'help', 'fall', 'bp', 'voice_note', 'device', 'system');
create type public.activity       as enum ('in_chair', 'napping', 'asleep', 'moving', 'bathroom', 'in_room', 'out', 'unsure');
create type public.mood           as enum ('good', 'so_so', 'not_good');
create type public.alert_level    as enum ('urgent', 'attention', 'info');
create type public.ladder_status  as enum ('waiting', 'calling', 'no_answer', 'accepted', 'skipped');

-- ---------- tables ----------

create table public.households (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  address           text,
  timezone          text not null default 'Africa/Lagos',
  map               jsonb not null default '{"rooms": [], "spots": []}',  -- rooms, tagged spots, layout
  hospital_plan     jsonb not null default '{}',                          -- first choice, backup, route
  sharing_paused_at timestamptz,                                          -- Dad's "Pause sharing"; shown to Phil, never hidden
  created_at        timestamptz not null default now()
);

create table public.people (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households on delete cascade,
  user_id        uuid references auth.users on delete set null,  -- null for responders: they never sign in
  role           public.person_role not null,
  display_name   text not null,
  phone          text,
  responder_role public.responder_role,
  reachable_from time,
  reachable_to   time,
  travel_minutes smallint check (travel_minutes >= 0),
  ladder_order   smallint,
  created_at     timestamptz not null default now(),
  unique (household_id, user_id),
  unique (household_id, ladder_order)
);
create index on public.people (user_id);

create table public.devices (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  type         public.device_type not null,
  label        text not null,
  room         text,               -- room key from households.map
  last_seen_at timestamptz,
  battery      smallint check (battery between 0 and 100),
  created_at   timestamptz not null default now()
);

create table public.medications (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name         text not null,
  dose_note    text,               -- "1 tablet"
  photo_path   text,               -- Supabase Storage path to the photo of the actual pill
  colour       text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.dose_schedules (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households on delete cascade,
  label          text not null,    -- "Morning"
  time_of_day    time not null,
  medication_ids uuid[] not null default '{}',
  created_at     timestamptz not null default now()
);

create table public.events (
  id           bigint generated always as identity primary key,
  household_id uuid not null references public.households on delete cascade,
  device_id    uuid references public.devices on delete set null,
  person_id    uuid references public.people on delete set null,
  type         public.event_type not null,
  value        jsonb not null default '{}',
  occurred_at  timestamptz not null default now(),  -- when it happened at the house (offline queue keeps this)
  received_at  timestamptz not null default now()   -- when the backend got it
);
create index on public.events (household_id, occurred_at desc);

create table public.states (
  household_id uuid primary key references public.households on delete cascade,
  room         text,
  spot         text,
  activity     public.activity not null default 'unsure',
  mood         public.mood,
  confidence   real not null default 0 check (confidence between 0 and 1),
  since        timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.alerts (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households on delete cascade,
  level           public.alert_level not null,
  trigger         text not null,   -- "help_pressed", "fall", "dose_missed", ...
  title           text not null,
  detail          text,
  created_at      timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at     timestamptz,
  outcome         text,            -- "ok", "hospital", ...
  resolved_by     uuid references public.people on delete set null
);
create index on public.alerts (household_id, created_at desc);

create table public.alert_steps (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  alert_id     uuid not null references public.alerts on delete cascade,
  person_id    uuid not null references public.people on delete cascade,
  step_order   smallint not null,
  status       public.ladder_status not null default 'waiting',
  called_at    timestamptz,
  responded_at timestamptz,
  unique (alert_id, step_order)
);

create table public.routines (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households on delete cascade,
  activity        text not null,   -- "wake", "nap", "bathroom", ...
  window_start    time,
  window_end      time,
  typical_minutes smallint,
  sample_days     smallint not null default 0,
  updated_at      timestamptz not null default now(),
  unique (household_id, activity)
);

create table public.daily_summaries (
  household_id uuid not null references public.households on delete cascade,
  day          date not null,
  summary      jsonb not null default '{}',
  primary key (household_id, day)
);

-- ---------- access control ----------
-- Each signed-in user sees only households they belong to. Caregivers manage setup;
-- Dad's phone (care_receiver) can add events; viewers only read.
-- Sensors, the simulator and the alert engine write with the service role, which bypasses RLS.

create function public.my_role(hid uuid)
returns public.person_role
language sql stable security definer set search_path = ''
as $$
  select role from public.people where household_id = hid and user_id = auth.uid() limit 1
$$;

-- A new caregiver creates a household and becomes its first member in one step.
create function public.create_household(household_name text, caregiver_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.households (name) values (household_name) returning id into hid;
  insert into public.people (household_id, user_id, role, display_name)
    values (hid, auth.uid(), 'caregiver', caregiver_name);
  insert into public.states (household_id) values (hid);
  return hid;
end
$$;

revoke execute on function public.my_role(uuid), public.create_household(text, text) from public, anon;
grant execute on function public.my_role(uuid), public.create_household(text, text) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['households','people','devices','medications','dose_schedules','events','states',
                           'alerts','alert_steps','routines','daily_summaries'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- every member can read
  foreach t in array array['people','devices','medications','dose_schedules','events','states',
                           'alerts','alert_steps','routines','daily_summaries'] loop
    execute format($p$create policy "members read" on public.%I for select to authenticated
                      using (public.my_role(household_id) is not null)$p$, t);
  end loop;

  -- caregivers manage setup tables
  foreach t in array array['people','devices','medications','dose_schedules','routines'] loop
    execute format($p$create policy "caregivers manage" on public.%I for all to authenticated
                      using (public.my_role(household_id) = 'caregiver')
                      with check (public.my_role(household_id) = 'caregiver')$p$, t);
  end loop;
end
$$;

create policy "members read" on public.households for select to authenticated
  using (public.my_role(id) is not null);
create policy "caregivers update" on public.households for update to authenticated
  using (public.my_role(id) = 'caregiver') with check (public.my_role(id) = 'caregiver');

-- Dad's phone and caregivers can record events (check-ins, doses, help, voice notes).
create policy "dad and caregivers add events" on public.events for insert to authenticated
  with check (public.my_role(household_id) in ('care_receiver', 'caregiver'));

-- Caregivers acknowledge alerts from the dashboard.
create policy "caregivers update alerts" on public.alerts for update to authenticated
  using (public.my_role(household_id) = 'caregiver') with check (public.my_role(household_id) = 'caregiver');

-- ---------- realtime ----------
-- Phil's dashboard subscribes to these so the map, timeline and ladder update live.
alter publication supabase_realtime add table public.events, public.states, public.alerts, public.alert_steps;
