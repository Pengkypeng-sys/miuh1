import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/auth';
import { statusLisensi } from '@/lib/license';
import { DEMO_MODE } from '@/lib/demoData';

// Dipanggil pas reload halaman — cek cookie httpOnly masih valid apa nggak
export async function GET() {
  const lisensi = DEMO_MODE ? { expired: false, peringatan: false, hariTersisa: 99, tanggalExpiry: '-' } : await statusLisensi();
  if (lisensi.expired) {
    await clearSessionCookie();
    return NextResponse.json({ sukses: false, expired: true, pesan: `Masa aktif dashboard sudah habis (${lisensi.tanggalExpiry}). Hubungi admin buat perpanjang.` });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false });
  return NextResponse.json({ sukses: true, nama: session.nama, role: session.role, lisensi });
}
