import { NextResponse } from 'next/server';
import { getValues, getTargetMap } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { hitungStatus } from '@/lib/target';
import { DEMO_MODE, DEMO_SISWA, DEMO_ITEMS } from '@/lib/demoData';

// Tabel siswa x item buat 1 kelas, 1 panggilan Sheets API doang (bukan per-siswa)
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const kelas = new URL(req.url).searchParams.get('kelas');

  if (DEMO_MODE) {
    const siswa = (DEMO_SISWA[kelas] || ['Contoh Siswa 1', 'Contoh Siswa 2'])
      .map(nama => ({
        nama,
        values: Object.fromEntries(DEMO_ITEMS.map(i => [i.kolom, Math.random() > 0.4 ? i.target : (Math.random() > 0.5 ? Math.round(i.target / 2) : '')])),
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    return NextResponse.json({ items: DEMO_ITEMS, siswa });
  }

  const rows = await getValues(`${kelas}!A1:Z`);
  if (rows.length < 1) return NextResponse.json({ items: [], siswa: [] });

  const header = rows[0];
  const tsColIdx = header.indexOf('Terakhir Diisi');
  const angkatanIdx = header.indexOf('Angkatan');
  const itemColStartIdx = angkatanIdx !== -1 ? angkatanIdx + 2 : 2; // lewatin kolom Angkatan kalau ada
  const itemColEndIdx = tsColIdx !== -1 ? tsColIdx : header.length;
  const targetMap = await getTargetMap();

  const items = header
    .map((nama, i) => ({ nama, kolom: i + 1, target: targetMap[nama] || 0 }))
    .filter(h => h.kolom >= itemColStartIdx && h.kolom <= itemColEndIdx && h.nama);

  const siswa = rows.slice(1)
    .filter(r => r[0])
    .map(r => ({
      nama: r[0],
      values: Object.fromEntries(items.map(it => [it.kolom, r[it.kolom - 1] ?? ''])),
    }))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

  return NextResponse.json({ items, siswa });
}
