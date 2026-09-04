import { createClient } from '@supabase/supabase-js';

// Service role key — server-side doang, jangan pernah ke-expose ke client.
// RLS dimatiin di semua tabel (lihat supabase-schema.sql), akses cuma lewat sini.
let client = null;
export function db() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      // ponytail: Next.js nge-cache fetch() secara default (Data Cache) — tanpa ini,
      // query lama ke-cache permanen dan gak pernah lihat data baru walau row berubah.
      global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) },
    });
  }
  return client;
}

// Lempar Error kalau query Supabase gagal — biar konsisten ketangkep try/catch di tiap route,
// bukan silently return data:null yang gampang kelewat dicek.
export function throwIfError({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

export const KELAS_LIST = ['KELAS 1', 'KELAS 2', 'KELAS 3', 'KELAS 4', 'KELAS 5', 'KELAS 6'];
export const EXCLUDED_KELAS = ['ALUMNI']; // gak nongol di listing kelas aktif buat pembayaran

// Cari id baris siswa by nama+kelas — dipakai di semua route pembayaran (payment, pindah, row),
// sebelumnya disalin persis di 3 tempat.
export async function findSiswaId(kelas, siswa) {
  const row = throwIfError(await db().from('siswa').select('id').eq('kelas', kelas).eq('nama', siswa).maybeSingle());
  return row?.id ?? null;
}

// Target SPP 1 kelas — diedit admin di Jenis Pembayaran (tabel spp_target), fallback ke default
// kode kalau row-nya belum ada. Dipakai di route spp-bulanan & kelas-detail.
export async function targetSppKelas(kelas) {
  const { SPP_TARGET_PER_KELAS } = await import('./format.js');
  const row = throwIfError(await db().from('spp_target').select('target').eq('kelas', kelas).maybeSingle());
  return row ? Number(row.target) || 0 : (SPP_TARGET_PER_KELAS[kelas] || 0);
}

// Kenaikan kelas tahunan: KELAS 1->2->...->6->ALUMNI. Data pembayaran ikut otomatis
// (foreign key siswa_id, gak perlu copy kolom kayak versi Sheets dulu — jauh lebih simpel & gak ada
// resiko "item hilang karena kolom beda nama antar sheet").
// Proses dari kelas TERTINGGI ke terendah biar gak ada siswa yang kepindah dobel dalam 1 run.
export async function naikkanKelas() {
  const ringkasan = [];

  // Snapshot jumlah siswa per kelas SEBELUM dipindah — buat grafik trend jumlah siswa antar tahun ajaran.
  // upsert by tahun: kalau kenaikan kelas kejalanin ulang di tahun yang sama, snapshot ke-timpa bukan dobel.
  const perKelasSebelum = {};
  for (const kelas of KELAS_LIST) {
    const { count } = await db().from('siswa').select('id', { count: 'exact', head: true }).eq('kelas', kelas);
    perKelasSebelum[kelas] = count || 0;
  }
  const tahun = new Date().getFullYear();
  const totalSiswa = Object.values(perKelasSebelum).reduce((s, v) => s + v, 0);
  await db().from('riwayat_siswa').upsert({ tahun, per_kelas: perKelasSebelum, total_siswa: totalSiswa }, { onConflict: 'tahun' });

  for (const n of [6, 5, 4, 3, 2, 1]) {
    const src = `KELAS ${n}`;
    const dst = n === 6 ? 'ALUMNI' : `KELAS ${n + 1}`;
    const { data, error } = await db().from('siswa').update({ kelas: dst }).eq('kelas', src).select('id');
    if (error) throw new Error(error.message);
    if (!data.length) { ringkasan.push(`${src}: kosong, gak ada yang dipindah`); continue; }
    ringkasan.push(`${src} -> ${dst}: ${data.length} siswa dipindah`);
  }
  return ringkasan;
}
