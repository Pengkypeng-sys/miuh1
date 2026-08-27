import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST } from '@/lib/db';
import { getSession, kelasDiizinkan } from '@/lib/auth';
import { logAction } from '@/lib/log';
import { DEMO_MODE, DEMO_SISWA } from '@/lib/demoData';

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const kelas = new URL(req.url).searchParams.get('kelas');
  if (DEMO_MODE) return NextResponse.json((DEMO_SISWA[kelas] || ['Contoh Siswa 1', 'Contoh Siswa 2']).sort((a, b) => a.localeCompare(b, 'id')));
  if (!KELAS_LIST.includes(kelas) || !kelasDiizinkan(session, kelas)) return NextResponse.json([]);

  try {
    const rows = throwIfError(await db().from('siswa').select('nama').eq('kelas', kelas));
    return NextResponse.json(rows.map(r => r.nama).sort((a, b) => a.localeCompare(b, 'id')));
  } catch (e) {
    console.error('GET /api/siswa gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil data siswa: ' + e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa mengelola siswa' });

  const { kelas, nama } = await req.json();
  if (!nama || !nama.trim()) return NextResponse.json({ sukses: false, pesan: 'Nama tidak boleh kosong' });
  const namaFinal = nama.trim().toUpperCase();

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `${namaFinal} berhasil ditambahkan ke ${kelas} (demo, gak tersimpan)` });
  if (!KELAS_LIST.includes(kelas)) return NextResponse.json({ sukses: false, pesan: 'Kelas gak valid' });

  try {
    const angkatan = new Date().getFullYear() - (KELAS_LIST.indexOf(kelas)); // KELAS 1 -> tahun ini, KELAS 2 -> tahun lalu, dst
    // unique(nama, kelas) di tabel siswa yang nolak duplikat — gak perlu lock manual kayak versi Sheets,
    // constraint DB nolak insert kedua kalau ada 2 request bareng, salah satunya bakal dapet error 23505.
    const { error } = await db().from('siswa').insert({ nama: namaFinal, kelas, angkatan });
    if (error) {
      if (error.code === '23505') return NextResponse.json({ sukses: false, pesan: 'Nama siswa sudah ada di kelas ini' });
      throw new Error(error.message);
    }

    await logAction(session.username, 'tambah-siswa', kelas, namaFinal, '', '', '');
    return NextResponse.json({ sukses: true, pesan: `${namaFinal} berhasil ditambahkan ke ${kelas}` });
  } catch (e) {
    console.error('POST /api/siswa gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal tambah siswa: ' + e.message });
  }
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa mengelola siswa' });

  const { kelas, nama } = await req.json();
  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `${nama} berhasil dihapus (demo, gak tersimpan)` });
  if (!KELAS_LIST.includes(kelas)) return NextResponse.json({ sukses: false, pesan: 'Kelas gak valid' });

  try {
    // on delete cascade di tabel pembayaran — hapus siswa otomatis ikut hapus semua data pembayarannya
    const { error, count } = await db().from('siswa').delete({ count: 'exact' }).eq('kelas', kelas).eq('nama', nama);
    if (error) throw new Error(error.message);
    if (!count) return NextResponse.json({ sukses: false, pesan: 'Siswa tidak ditemukan' });

    await logAction(session.username, 'hapus-siswa', kelas, nama, '', '', '');
    return NextResponse.json({ sukses: true, pesan: `${nama} berhasil dihapus` });
  } catch (e) {
    console.error('DELETE /api/siswa gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal hapus siswa: ' + e.message });
  }
}
