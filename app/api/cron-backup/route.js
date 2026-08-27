import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buatBackup } from '@/lib/backup';
import { DEMO_MODE } from '@/lib/demoData';

// Dipanggil Vercel Cron (mingguan, tanpa session — server-to-server) ATAU manual oleh admin lewat tombol di UI.
// Vercel otomatis kirim header Authorization: Bearer <CRON_SECRET> kalau env var itu di-set —
// tanpa cek ini, siapa aja yang tau URL-nya bisa spam-trigger backup (nulis ke Storage berkali-kali).
export async function GET(req) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ sukses: false, pesan: 'Unauthorized' }, { status: 401 });
  }
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
