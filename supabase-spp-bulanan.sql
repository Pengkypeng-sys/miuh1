-- Jalankan sekali di Supabase SQL Editor (project PRODUCTION). Nyimpen status SPP per bulan per siswa,
-- biar bisa tau bulan mana yang udah LUNAS (dikunci, gak bisa dicentang lagi) vs masih nyicil/belum.
create table spp_bulanan (
  id bigint generated always as identity primary key,
  siswa_id bigint not null references siswa(id) on delete cascade,
  tahun int not null,
  bulan int not null check (bulan between 1 and 12),
  nominal numeric not null default 0,
  terakhir_diisi timestamptz,
  unique (siswa_id, tahun, bulan)
);

-- Nambah nominal per bulan secara atomic (sama pola kayak increment_pembayaran)
create or replace function increment_spp_bulanan(
  p_siswa_id bigint, p_tahun int, p_bulan int, p_delta numeric, p_terakhir_diisi timestamptz
) returns numeric as $$
declare
  hasil numeric;
begin
  insert into spp_bulanan (siswa_id, tahun, bulan, nominal, terakhir_diisi)
  values (p_siswa_id, p_tahun, p_bulan, p_delta, p_terakhir_diisi)
  on conflict (siswa_id, tahun, bulan)
  do update set nominal = spp_bulanan.nominal + excluded.nominal, terakhir_diisi = excluded.terakhir_diisi
  returning nominal into hasil;
  return hasil;
end;
$$ language plpgsql;
