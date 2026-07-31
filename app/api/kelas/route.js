import { NextResponse } from 'next/server';
import { KELAS_LIST } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DEMO_MODE, DEMO_KELAS } from '@/lib/demoData';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  if (DEMO_MODE) return NextResponse.json(DEMO_KELAS);

  // Kelas cuma 6 nama tetap (KELAS 1..6) — gak perlu query, ALUMNI sengaja gak dimasukin
  // (siswa yang udah lulus gak muncul di listing pembayaran/kelola siswa aktif).
  return NextResponse.json(KELAS_LIST);
}
