-- LexTrack schema (single-user MVP). Times are stored in UTC (timestamptz).
create extension if not exists pgcrypto;

create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references clients(id) on delete set null,
  name         text not null,
  case_number  text,
  color        text not null default '#4f46e5',
  billable     boolean not null default false,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists time_entries (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects(id) on delete set null,
  description   text,
  started_at    timestamptz not null,
  stopped_at    timestamptz,
  duration_sec  integer generated always as
                (extract(epoch from (stopped_at - started_at))::int) stored,
  billable      boolean not null default false,
  source        text not null default 'timer' check (source in ('timer', 'manual')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (stopped_at is null or stopped_at > started_at)
);

-- at most one running timer
create unique index if not exists one_running_timer
  on time_entries ((true)) where stopped_at is null;
create index if not exists time_entries_started_idx on time_entries (started_at);

-- Read model for Power BI: finished sessions, local (Europe/Warsaw) time.
create or replace view v_sessions as
select
  e.id                                         as session_id,
  e.project_id,
  p.name                                       as project_name,
  p.case_number,
  c.name                                       as client_name,
  e.description,
  e.billable,
  e.source,
  (e.started_at at time zone 'Europe/Warsaw')  as start_local,
  (e.stopped_at at time zone 'Europe/Warsaw')  as end_local,
  (e.started_at at time zone 'Europe/Warsaw')::date as session_date,
  extract(hour from e.started_at at time zone 'Europe/Warsaw')::int  as start_hour,
  extract(isodow from e.started_at at time zone 'Europe/Warsaw')::int as weekday,
  e.duration_sec,
  round(e.duration_sec / 3600.0, 2)            as duration_hours
from time_entries e
left join projects p on p.id = e.project_id
left join clients  c on c.id = p.client_id
where e.stopped_at is not null;
