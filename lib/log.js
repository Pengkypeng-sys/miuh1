import { db, throwIfError } from './db';

const pad = (n) => String(n).padStart(2, '0');

// Format tanggal Jakarta jadi "dd/MM/yyyy" dan "HH:mm:ss" — padded, konsisten, gampang di-parse
export function tanggalJakarta(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(date).map(p => [p.type, p.value])
  );
  return {
    tanggal: `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`,
    jam: `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`,
  };
}

export async function logAction(user, aksi, kelas, siswa, item, lama, baru, metode) {
  throwIfError(await db().from('log_aktivitas').insert({
    waktu: new Date().toISOString(), // timestamptz, instant tersimpan benar; ditampilin dalam Jakarta time pas dibaca
    user_name: user, aksi, kelas, siswa, item,
    lama: lama ?? '', baru: baru ?? '', metode: metode ?? '',
  }));
}
