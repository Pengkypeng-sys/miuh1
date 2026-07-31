import { db, throwIfError } from './db';

// Fallback kalau row LICENSE_EXPIRY belum ada di tabel lisensi — dipakai sekali doang pas pertama kali.
const DEFAULT_EXPIRY = '2026-08-13';
const PERINGATAN_H_MINUS = 7;

export async function getLicenseExpiry() {
  const row = throwIfError(await db().from('lisensi').select('value').eq('key', 'LICENSE_EXPIRY').maybeSingle());
  if (!row) {
    await db().from('lisensi').upsert({ key: 'LICENSE_EXPIRY', value: DEFAULT_EXPIRY });
    return DEFAULT_EXPIRY;
  }
  return row.value || DEFAULT_EXPIRY;
}

export async function setLicenseExpiry(newExpiry) {
  throwIfError(await db().from('lisensi').upsert({ key: 'LICENSE_EXPIRY', value: newExpiry }));
}

export async function statusLisensi() {
  const tanggalExpiry = await getLicenseExpiry();
  const now = new Date();
  const expiry = new Date(`${tanggalExpiry}T23:59:59+07:00`);
  const msTersisa = expiry - now;
  const hariTersisa = Math.ceil(msTersisa / (1000 * 60 * 60 * 24));

  return {
    expired: msTersisa < 0,
    peringatan: hariTersisa <= PERINGATAN_H_MINUS && hariTersisa >= 0,
    hariTersisa: Math.max(hariTersisa, 0),
    tanggalExpiry,
  };
}
