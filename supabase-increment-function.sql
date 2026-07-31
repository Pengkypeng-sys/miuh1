-- Jalankan sekali di Supabase SQL Editor. Ini bikin nambah nominal pembayaran jadi ATOMIC
-- (1 statement di database), gak ada lagi celah baca-hitung-tulis yang bisa bikin lost update
-- kalau 2 request nyerempet bareng buat siswa+item yang sama.
create or replace function increment_pembayaran(
  p_siswa_id bigint,
  p_item_id bigint,
  p_delta numeric,
  p_keterangan text,
  p_terakhir_diisi timestamptz
) returns numeric as $$
declare
  hasil numeric;
begin
  insert into pembayaran (siswa_id, item_id, nominal, keterangan, terakhir_diisi)
  values (p_siswa_id, p_item_id, p_delta, p_keterangan, p_terakhir_diisi)
  on conflict (siswa_id, item_id)
  do update set
    nominal = pembayaran.nominal + excluded.nominal,
    keterangan = excluded.keterangan,
    terakhir_diisi = excluded.terakhir_diisi
  returning nominal into hasil;
  return hasil;
end;
$$ language plpgsql;
