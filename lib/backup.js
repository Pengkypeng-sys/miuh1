import { db, throwIfError } from './db';

const BUCKET = 'backups';
const MAX_DISIMPAN = 8; // ponytail: simpen 8 backup terakhir doang (mingguan = ~2 bulan histori), biar gak numpuk di storage gratis

// Dump semua tabel inti (bukan log_aktivitas — terlalu besar & gampang di-rebuild dari tabel lain)
// jadi 1 file JSON, upload ke Supabase Storage. Bucket dibikin otomatis kalau belum ada.
export async function buatBackup() {
  const [siswa, item, pembayaran, pengeluaran, users, riwayatSiswa] = await Promise.all([
    db().from('siswa').select('*').then(r => throwIfError(r)),
    db().from('item_pembayaran').select('*').then(r => throwIfError(r)),
    db().from('pembayaran').select('*').then(r => throwIfError(r)),
    db().from('pengeluaran').select('*').then(r => throwIfError(r)),
    db().from('users').select('username, nama, role, kelas').then(r => throwIfError(r)), // password_hash gak diikutin
    db().from('riwayat_siswa').select('*').then(r => throwIfError(r)).catch(() => []),
  ]);

  const backup = { dibuat: new Date().toISOString(), siswa, item_pembayaran: item, pembayaran, pengeluaran, users, riwayat_siswa: riwayatSiswa };
  const filename = `backup-${new Date().toISOString().slice(0, 10)}.json`;

  const buckets = throwIfError(await db().storage.listBuckets());
  if (!buckets.some(b => b.name === BUCKET)) {
    await db().storage.createBucket(BUCKET, { public: false });
  }

  const { error } = await db().storage.from(BUCKET).upload(filename, JSON.stringify(backup, null, 2), {
    contentType: 'application/json', upsert: true,
  });
  if (error) throw new Error(error.message);

  // Beresin backup lama biar gak numpuk
  const { data: files } = await db().storage.from(BUCKET).list('', { sortBy: { column: 'name', order: 'desc' } });
  const lebih = (files || []).slice(MAX_DISIMPAN);
  if (lebih.length) await db().storage.from(BUCKET).remove(lebih.map(f => f.name));

  return { filename, jumlahSiswa: siswa.length, jumlahPembayaran: pembayaran.length };
}
