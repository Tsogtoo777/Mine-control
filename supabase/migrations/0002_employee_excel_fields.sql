-- MINE CONTROL: employee master-data fields used by Excel import
alter table public.employees
  add column if not exists internal_no text,
  add column if not exists erp_number text,
  add column if not exists surname text,
  add column if not exists given_name text,
  add column if not exists section text,
  add column if not exists email text,
  add column if not exists phone text;

create unique index if not exists employees_employee_code_unique_idx
  on public.employees (employee_code)
  where employee_code is not null;
