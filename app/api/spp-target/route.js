import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DEMO_MODE } from '@/lib/demoData';
import { SPP_TARGET_PER_KELAS } from '@/lib/format';

// Target SPP per kelas — beda tahun ajaran, bisa beda angka lagi, jadi harus bisa diedit admin
// (bukan hardcode di kode) lewat halaman Jenis Pembayaran.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (DEMO_MODE) return NextResponse.json(SPP_TARGET_PER_KELAS);

  try {
    const rows = throwIfError(await db().from('spp_target').select('kelas, target'));
    const byKelas = Object.fromEntries(rows.map(r => [r.kelas, Number(r.target) || 0]));
    // Fallback ke default kalau ada kelas yang belum kesimpen row-nya di tabel.
    const hasil = Object.fromEntries(KELAS_LIST.map(k => [k, byKelas[k] ?? SPP_TARGET_PER_KELAS[k] ?? 0]));
    return NextResponse.json(hasil);
  } catch (e) {
    console.error('GET /api/spp-target gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil target SPP: ' + e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin' }, { status: 403 });

  const { kelas, target } = await req.json();
  if (DEMO_MODE) return NextResponse.json({ sukses: true });
  if (!KELAS_LIST.includes(kelas)) return NextResponse.json({ sukses: false, pesan: 'Kelas gak valid' });

  try {
    throwIfError(await db().from('spp_target').upsert({ kelas, target: Number(target) || 0 }, { onConflict: 'kelas' }));
    return NextResponse.json({ sukses: true, pesan: `Target SPP ${kelas} berhasil diubah` });
  } catch (e) {
    console.error('PUT /api/spp-target gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ubah target SPP: ' + e.message }, { status: 500 });
  }
}
