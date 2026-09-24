import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST } from '@/lib/db';
import { getSession, kelasDiizinkan } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { DEMO_MODE } from '@/lib/demoData';

// Riwayat transaksi 1 siswa dari log_aktivitas — dipakai buat bikin kwitansi manual transaksi lama
// (siswa udah bayar kemarin/minggu lalu tapi kwitansinya ilang/kelupaan dicetak).
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin' }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const kelas = params.get('kelas'), siswa = params.get('siswa');
  if (DEMO_MODE) return NextResponse.json({ transaksi: [] });
  if (!KELAS_LIST.includes(kelas) || !siswa || !kelasDiizinkan(session, kelas)) return NextResponse.json({ transaksi: [] });

  try {
    const rows = throwIfError(
      await db().from('log_aktivitas').select('waktu, item, lama, baru, metode')
        .eq('kelas', kelas).eq('siswa', siswa)
        .in('aksi', ['submit-pembayaran', 'edit-langsung'])
        .order('waktu', { ascending: false })
    );

    const transaksi = rows
      .map(r => ({ waktu: r.waktu, item: r.item, nominal: (Number(r.baru) || 0) - (Number(r.lama) || 0), metode: r.metode || '-' }))
      .filter(t => t.nominal > 0)
      .map(t => ({ ...t, tanggal: tanggalJakarta(new Date(t.waktu)).tanggal }));

    return NextResponse.json({ transaksi });
  } catch (e) {
    console.error('GET /api/riwayat-transaksi gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil riwayat: ' + e.message }, { status: 500 });
  }
}
