-- MINE CONTROL: өрөмдлөг болон техникийн мото цагийн бүртгэл
create table public.drill_records (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id),
  equipment_id uuid not null references public.equipment(id),
  operator_id uuid references public.employees(id),
  block_id uuid references public.mine_blocks(id),
  face_id uuid references public.mine_faces(id),
  drilled_holes numeric(12,2) not null default 0 check (drilled_holes >= 0),
  drilled_meters numeric(14,2) not null default 0 check (drilled_meters >= 0),
  engine_hours numeric(10,2) not null default 0 check (engine_hours >= 0),
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  status public.record_status not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (ended_at is null or started_at is null or ended_at > started_at)
);
create table public.equipment_hour_records (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id),
  equipment_id uuid not null references public.equipment(id),
  operator_id uuid references public.employees(id),
  start_hours numeric(12,2) not null check (start_hours >= 0),
  end_hours numeric(12,2) not null check (end_hours >= start_hours),
  worked_hours numeric(10,2) generated always as (end_hours - start_hours) stored,
  recorded_at timestamptz not null default now(),
  notes text,
  status public.record_status not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_drill_records_shift on public.drill_records(shift_id);
create index idx_drill_records_equipment on public.drill_records(equipment_id);
create index idx_equipment_hours_shift on public.equipment_hour_records(shift_id);
create index idx_equipment_hours_equipment on public.equipment_hour_records(equipment_id);
alter table public.drill_records enable row level security;
alter table public.equipment_hour_records enable row level security;
grant select, insert, update on public.drill_records to authenticated;
grant select, insert, update on public.equipment_hour_records to authenticated;
create policy "active users read drill records" on public.drill_records for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true));
create policy "authorized users insert drill records" on public.drill_records for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true and p.role in ('admin','management','mine_master','dispatcher','mine_engineer','geologist','surveyor')));
create policy "managers update drill records" on public.drill_records for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true and p.role in ('admin','management','mine_master')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true and p.role in ('admin','management','mine_master')));
create policy "active users read equipment hours" on public.equipment_hour_records for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true));
create policy "authorized users insert equipment hours" on public.equipment_hour_records for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true and p.role in ('admin','management','mine_master','dispatcher','mine_engineer','maintenance_engineer')));
create policy "managers update equipment hours" on public.equipment_hour_records for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true and p.role in ('admin','management','mine_master')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true and p.role in ('admin','management','mine_master')));
