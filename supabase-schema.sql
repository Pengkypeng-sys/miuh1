-- Jalankan ini sekali di Supabase SQL Editor (project baru) sebelum migrasi data.
-- RLS sengaja dimatiin (default off) — semua akses lewat server pakai service role key,
-- gak ada query langsung dari browser (sama kayak model Sheets: client gak pernah pegang credential).

create table users (
  username text primary key,
  password_hash text not null,   -- sha256 hex, sama persis skema lama — gak perlu reset password user
  nama text not null,
  role text not null default 'staf'
);

create table siswa (
  id bigint generated always as identity primary key,
  nama text not null,
  kelas text not null,            -- 'KELAS 1'..'KELAS 6', 'ALUMNI'
  angkatan int,
  created_at timestamptz default now(),
  unique (nama, kelas)
);

create table item_pembayaran (
  id bigint generated always as identity primary key,
  nama text not null unique,       -- 'PPDB', 'BUKU', 'SPP', 'SERAGAM', dst
  target numeric not null default 0,
  icon text not null default 'receipt',
  kategori text not null default 'Lainnya',
  urutan int not null default 0,
  kelas_scope text[]                -- null = semua kelas; array = item cuma buat kelas tertentu
);

create table pembayaran (
  id bigint generated always as identity primary key,
  siswa_id bigint not null references siswa(id) on delete cascade,
  item_id bigint not null references item_pembayaran(id) on delete cascade,
  nominal numeric not null default 0,
  keterangan text,                  -- 'GEL.3 LAKI-LAKI' / 'BUKU 2' / 'Bulan Juli, Agustus' dst
  terakhir_diisi timestamptz,
  unique (siswa_id, item_id)
);

create table log_aktivitas (
  id bigint generated always as identity primary key,
  waktu timestamptz default now(),
  user_name text,
  aksi text,
  kelas text,
  siswa text,
  item text,
  lama text,
  baru text,
  metode text
);

create table pengeluaran (
  id bigint generated always as identity primary key,
  tanggal date default current_date,
  keterangan text,
  nominal numeric,
  dicatat_oleh text
);

create table lisensi (
  key text primary key,
  value text
);

create index on pembayaran (siswa_id);
create index on pembayaran (item_id);
create index on siswa (kelas);
create index on log_aktivitas (waktu);
create index on pengeluaran (tanggal);
