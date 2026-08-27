import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buatBackup } from '@/lib/backup';
import { DEMO_MODE } from '@/lib/demoData';

// Dipanggil Vercel Cron (mingguan, tanpa session — server-to-server) ATAU manual oleh admin lewat tombol di UI.
export async function GET() {
  return jalankan();
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa backup manual' });
  return jalankan();
}

async function jalankan() {
  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: 'Backup dijalankan (demo, gak tersimpan)' });
  try {
    const hasil = await buatBackup();
    return NextResponse.json({ sukses: true, pesan: `Backup "${hasil.filename}" tersimpan (${hasil.jumlahSiswa} siswa, ${hasil.jumlahPembayaran} pembayaran)`, ...hasil });
  } catch (e) {
    console.error('GET/POST /api/cron-backup gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal backup: ' + e.message }, { status: 500 });
  }
}
