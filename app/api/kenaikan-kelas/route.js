import { NextResponse } from 'next/server';
import { naikkanKelas } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/log';
import { DEMO_MODE } from '@/lib/demoData';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa jalankan kenaikan kelas' });

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: 'Kenaikan kelas dijalankan (demo, gak tersimpan)', ringkasan: [] });

  try {
    const ringkasan = await naikkanKelas();
    await logAction(session.username, 'kenaikan-kelas', '-', '-', ringkasan.join(' | '), '-', '-');
    return NextResponse.json({ sukses: true, pesan: 'Kenaikan kelas selesai', ringkasan });
  } catch (e) {
    return NextResponse.json({ sukses: false, pesan: e.message });
  }
}
