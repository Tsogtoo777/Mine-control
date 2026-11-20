-- MINE CONTROL V1 — ил уурхайн үндсэн өгөгдлийн сан
-- Үндсэн үйлдвэрлэлийн нэгж: m3; тээвэрлэлтийн хэмжүүр: рейс.
-- Data Event-тэй тусдаа database байна.

create extension if not exists pgcrypto;

create type public.app_role as enum (
  'admin','management','mine_engineer','mine_master','dispatcher',
  'geologist','surveyor','maintenance_engineer','report_operator','viewer'
);
create type public.shift_kind as enum ('day','night');
create type public.record_status as enum ('draft','submitted','approved','voided');
create type public.material_kind as enum ('ore','waste','other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'viewer',
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique,
  full_name text not null,
  position text,
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null, -- ээлж эхэлсэн календарийн өдөр
  shift_kind public.shift_kind not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.record_status not null default 'draft',
  supervisor_id uuid references public.employees(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (shift_date, shift_kind)
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  equipment_code text not null unique,
  equipment_type text not null,
  make_model text,
  serial_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.mine_areas (
  id uuid primary key default gen_random_uuid(),
  area_code text not null unique,
  area_name text not null,
  description text,
  is_active boolean not null default true
);

create table public.mine_blocks (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.mine_areas(id),
  block_code text not null,
  level_name text,
  geometry_json jsonb, -- эхний 2D зураглалын GeoJSON-compatible geometry
  design_volume_m3 numeric(14,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(area_id, block_code)
);

create table public.mine_faces (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.mine_blocks(id),
  face_code text not null,
  material public.material_kind not null default 'ore',
  geometry_json jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(block_id, face_code)
);

create table public.work_records (
  id uuid primary key default gen_random_uuid(),
  record_no bigint generated always as identity unique,
  shift_id uuid not null references public.shifts(id),
  equipment_id uuid references public.equipment(id),
  block_id uuid references public.mine_blocks(id),
  face_id uuid references public.mine_faces(id),
  material public.material_kind not null,
  work_type text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  volume_m3 numeric(14,2) not null default 0 check (volume_m3 >= 0),
  operator_id uuid references public.employees(id),
  notes text,
  status public.record_status not null default 'draft',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at)
);

create table public.production_records (
  id uuid primary key default gen_random_uuid(),
  work_record_id uuid references public.work_records(id),
  shift_id uuid not null references public.shifts(id),
  block_id uuid references public.mine_blocks(id),
  face_id uuid references public.mine_faces(id),
  material public.material_kind not null,
  volume_m3 numeric(14,2) not null check (volume_m3 >= 0),
  measured_at timestamptz not null,
  status public.record_status not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.haul_records (
  id uuid primary key default gen_random_uuid(),
  record_no bigint generated always as identity unique,
  shift_id uuid not null references public.shifts(id),
  equipment_id uuid not null references public.equipment(id),
  material public.material_kind not null,
  source_face_id uuid references public.mine_faces(id),
  destination_name text not null,
  trip_count integer not null default 1 check (trip_count > 0),
  departed_at timestamptz not null,
  arrived_at timestamptz,
  status public.record_status not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (arrived_at is null or arrived_at >= departed_at)
);

create table public.maintenance_orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity unique,
  equipment_id uuid not null references public.equipment(id),
  reported_at timestamptz not null,
  fault_category text not null,
  description text not null,
  repair_started_at timestamptz,
  repair_finished_at timestamptz,
  returned_at timestamptz,
  status public.record_status not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.plan_records (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  shift_kind public.shift_kind,
  area_id uuid references public.mine_areas(id),
  block_id uuid references public.mine_blocks(id),
  material public.material_kind not null,
  planned_volume_m3 numeric(14,2) not null check (planned_volume_m3 >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE','VOID')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index idx_work_records_shift on public.work_records(shift_id);
create index idx_work_records_equipment on public.work_records(equipment_id);
create index idx_work_records_face on public.work_records(face_id);
create index idx_work_records_started on public.work_records(started_at);
create index idx_production_shift on public.production_records(shift_id);
create index idx_haul_shift on public.haul_records(shift_id);
create index idx_haul_equipment on public.haul_records(equipment_id);

-- Нэвтэрсэн хэрэглэгч өөрийн профайлыг уншина.
alter table public.profiles enable row level security;
create policy "profile read self" on public.profiles
  for select to authenticated using (id = auth.uid());

-- Бусад хүснэгтэд RLS-г асаана. Нарийвчилсан role policy-г
-- auth болон role mapping баталгаажуулсны дараа дараагийн migration-д нэмнэ.
alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.equipment enable row level security;
alter table public.mine_areas enable row level security;
alter table public.mine_blocks enable row level security;
alter table public.mine_faces enable row level security;
alter table public.work_records enable row level security;
alter table public.production_records enable row level security;
alter table public.haul_records enable row level security;
alter table public.maintenance_orders enable row level security;
alter table public.plan_records enable row level security;
alter table public.audit_logs enable row level security;

-- No permissive policies are intentionally added yet: access remains denied
-- until role-specific policies are reviewed and installed in migration 0002.
