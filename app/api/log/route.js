import { NextResponse } from 'next/server';
import { getValues, ensureLogSheet, SYSTEM_SPREADSHEET_ID } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { DEMO_MODE } from '@/lib/demoData';

const DEMO_LOG = [
  { waktu: '13/07/2026 10:05:18', user: 'mi.uh1', aksi: 'submit-pembayaran', kelas: 'KELAS 5', siswa: 'Rizki Ramadhan', item: 'BUKU', lama: '0', baru: '120000', metode: 'Cash' },
  { waktu: '13/07/2026 09:30:41', user: 'guru.miuh1', aksi: 'submit-pembayaran', kelas: 'KELAS 3', siswa: 'Nadia Putri', item: 'PTS 1', lama: '0', baru: '50000', metode: 'Transfer' },
  { waktu: '13/07/2026 08:15:02', user: 'mi.uh1', aksi: 'tambah-siswa', kelas: 'KELAS 2', siswa: 'Contoh Siswa Baru', item: '', lama: '', baru: '', metode: '' },
];

// Riwayat semua aksi (submit/hapus pembayaran, tambah/hapus siswa, tambah/hapus item, edit manual)
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  if (DEMO_MODE) return NextResponse.json({ tanggal: 'Semua Tanggal', semua: true, entries: DEMO_LOG });

  const params = new URL(req.url).searchParams;
  const tanggal = params.get('tanggal') || tanggalJakarta().tanggal;
  const semua = tanggal === 'semua';

  await ensureLogSheet();
  const rows = await getValues('Log!A2:I', SYSTEM_SPREADSHEET_ID);

  let entries = rows
    .filter(r => typeof r[0] === 'string' && r[0])
    .filter(r => semua || r[0].startsWith(tanggal))
    .map(r => ({ waktu: r[0], user: r[1], aksi: r[2], kelas: r[3], siswa: r[4], item: r[5], lama: r[6], baru: r[7], metode: r[8] }))
    .sort((a, b) => b.waktu.localeCompare(a.waktu));

  const total = entries.length;
  const dipotong = entries.length > 200;
  entries = entries.slice(0, 200);

  return NextResponse.json({ tanggal: semua ? 'Semua Tanggal' : tanggal, semua, entries, total, dipotong });
}
