import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST, findSiswaId } from '@/lib/db';
import { getSession, kelasDiizinkan } from '@/lib/auth';
import { DEMO_MODE } from '@/lib/demoData';

// Ambil semua nilai item 1 siswa sekaligus (2 query total, bukan 1 query per item).
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const kelas = params.get('kelas'), siswa = params.get('siswa');

  if (DEMO_MODE) return NextResponse.json({});
  if (!KELAS_LIST.includes(kelas) || !kelasDiizinkan(session, kelas)) return NextResponse.json({});

  try {
    const siswaId = await findSiswaId(kelas, siswa);
    if (!siswaId) return NextResponse.json({});

    const rows = throwIfError(await db().from('pembayaran').select('item_id, nominal, keterangan').eq('siswa_id', siswaId));
    const result = {};
    const keterangan = {};
    rows.forEach(r => {
      result[r.item_id] = r.nominal;
      if (r.keterangan) keterangan[r.item_id] = r.keterangan;
    });
    return NextResponse.json({ ...result, __keterangan: keterangan });
  } catch (e) {
    console.error('GET /api/payment/row gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil data pembayaran: ' + e.message }, { status: 500 });
  }
}
