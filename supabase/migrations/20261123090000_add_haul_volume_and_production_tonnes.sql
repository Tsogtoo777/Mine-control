-- Keep haulage trip count as the source measure and expose its standard volume.
-- Mine operating convention: 1 haulage trip = 84 m3.
alter table public.haul_records
  add column volume_m3 numeric(14,2)
  generated always as (trip_count::numeric * 84.00) stored;

-- Tonnage is independent from volume and is optional where the source has no weight.
alter table public.production_records
  add column tonnes numeric(14,2)
  check (tonnes is null or tonnes >= 0);

comment on column public.haul_records.volume_m3 is
  'Generated from trip_count using the mine standard of 84 m3 per trip.';
comment on column public.production_records.tonnes is
  'Measured production mass in metric tonnes; kept separate from volume_m3.';
