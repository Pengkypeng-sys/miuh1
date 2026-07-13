import { NextResponse } from 'next/server';
import { getValues, setValues, colToLetter, highlightCell, getOrCreateTimestampColumn } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { logAction, tanggalJakarta } from '@/lib/log';
import { DEMO_MODE } from '@/lib/demoData';

async function findRow(kelas, siswa) {
  const names = (await getValues(`${kelas}!A2:A`)).map(r => r[0]);
  const idx = names.indexOf(siswa);
  return idx === -1 ? -1 : idx + 2;
}

// Pindahin nominal dari 1 item ke item lain buat siswa yang sama — buat koreksi salah pilih item pas input.
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Session habis, silakan login ulang', sessionExpired: true });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa memindahkan pembayaran' });

  const { kelas, siswa, dariKolom, keKolom, nominal } = await req.json();
  if (!dariKolom || !keKolom || String(dariKolom) === String(keKolom)) {
    return NextResponse.json({ sukses: false, pesan: 'Pilih item tujuan yang beda dari item asal' });
  }

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: 'Pembayaran dipindahkan (demo, gak tersimpan)' });

  const row = await findRow(kelas, siswa);
  if (row === -1) return NextResponse.json({ sukses: false, pesan: 'Nama siswa tidak ditemukan' });

  const [dariNama, keNama] = await Promise.all([
    getValues(`${kelas}!${colToLetter(dariKolom)}1`).then(v => v[0]?.[0] || ''),
    getValues(`${kelas}!${colToLetter(keKolom)}1`).then(v => v[0]?.[0] || ''),
  ]);
  const dariLama = Number((await getValues(`${kelas}!${colToLetter(dariKolom)}${row}`))[0]?.[0]) || 0;
  const keLama = Number((await getValues(`${kelas}!${colToLetter(keKolom)}${row}`))[0]?.[0]) || 0;

  let pindah = Number(nominal);
  if (!pindah || pindah <= 0) pindah = dariLama;
  if (pindah > dariLama) pindah = dariLama;

  const dariBaru = dariLama - pindah;
  const keBaru = keLama + pindah;

  await setValues(`${kelas}!${colToLetter(dariKolom)}${row}`, [[dariBaru]]);
  await setValues(`${kelas}!${colToLetter(keKolom)}${row}`, [[keBaru]]);
  await highlightCell(kelas, row, keKolom, { yellow: true, numberFormat: true });
  if (dariBaru === 0) await highlightCell(kelas, row, dariKolom, { yellow: false });

  const tsCol = await getOrCreateTimestampColumn(kelas);
  const { tanggal } = tanggalJakarta();
  await setValues(`${kelas}!${colToLetter(tsCol)}${row}`, [[tanggal]]);

  await logAction(session.username, 'pindah-pembayaran', kelas, siswa, `${dariNama} → ${keNama}`, dariLama, keBaru);

  return NextResponse.json({
    sukses: true,
    pesan: `Rp ${pindah.toLocaleString('id-ID')} dipindah dari "${dariNama}" ke "${keNama}"`,
    dariKolom, keKolom, dariBaru, keBaru,
  });
}
