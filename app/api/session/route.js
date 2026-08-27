import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/auth';
import { statusLisensi } from '@/lib/license';
import { DEMO_MODE } from '@/lib/demoData';

export const dynamic = 'force-dynamic';

// Dipanggil pas reload halaman — cek cookie httpOnly masih valid apa nggak
export async function GET() {
  try {
    const lisensi = DEMO_MODE ? { expired: false, peringatan: false, hariTersisa: 99, tanggalExpiry: '-' } : await statusLisensi();
    if (lisensi.expired) {
      await clearSessionCookie();
      return NextResponse.json({ sukses: false, expired: true, pesan: `Masa aktif dashboard sudah habis (${lisensi.tanggalExpiry}). Hubungi admin buat perpanjang.` });
    }

    const session = await getSession();
    if (!session) return NextResponse.json({ sukses: false });
    return NextResponse.json({ sukses: true, nama: session.nama, role: session.role, kelas: session.kelas || null, lisensi, loginInfo: { waktu: session.iat * 1000, ua: session.ua || '' } });
  } catch (e) {
    // Endpoint ini dipanggil di SETIAP load halaman sebelum apa pun dirender — kalau gak ditangkep,
    // gangguan sesaat ke database bikin seluruh app gak bisa dibuka sama sekali.
    console.error('GET /api/session gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal cek sesi, coba muat ulang halaman: ' + e.message });
  }
}
