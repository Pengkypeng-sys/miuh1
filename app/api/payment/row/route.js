import { NextResponse } from 'next/server';
import { getValues } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { DEMO_MODE } from '@/lib/demoData';

// Ambil SEMUA nilai item siswa dalam 1 baris sekaligus (2 panggilan Sheets API total,
// bukan 1 panggilan per item) — biar gak kena rate limit pas ganti-ganti siswa.
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const kelas = params.get('kelas'), siswa = params.get('siswa');

  if (DEMO_MODE) return NextResponse.json({});

  const names = (await getValues(`${kelas}!A2:A`)).map(r => r[0]);
  const idx = names.indexOf(siswa);
  if (idx === -1) return NextResponse.json({});

  const row = idx + 2;
  const values = (await getValues(`${kelas}!A${row}:Z${row}`))[0] || [];
  const result = {};
  values.forEach((val, i) => { if (i >= 1) result[i + 1] = val; }); // kolom B dst (1-based)
  return NextResponse.json(result);
}
