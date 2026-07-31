import { NextResponse } from 'next/server';
import { db, throwIfError } from '@/lib/db';
import { hashPassword, signSession, setSessionCookie } from '@/lib/auth';
import { DEMO_MODE, DEMO_USERS } from '@/lib/demoData';
import { statusLisensi } from '@/lib/license';

export async function POST(req) {
  let lisensi;
  try {
    lisensi = DEMO_MODE ? { expired: false, peringatan: false, hariTersisa: 99, tanggalExpiry: '-' } : await statusLisensi();
  } catch (e) {
    console.error('POST /api/login gagal cek lisensi:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal cek status lisensi, coba lagi: ' + e.message });
  }
  if (lisensi.expired) {
    return NextResponse.json({ sukses: false, expired: true, pesan: `Masa aktif dashboard sudah habis (${lisensi.tanggalExpiry}). Hubungi admin buat perpanjang.` });
  }

  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ sukses: false, pesan: 'Isi username dan password' });
  }

  if (DEMO_MODE) {
    const u = DEMO_USERS[username];
    if (!u || u.password !== password) return NextResponse.json({ sukses: false, pesan: 'Username atau password salah' });
    const token = signSession({ username, nama: u.nama, role: u.role });
    await setSessionCookie(token);
    return NextResponse.json({ sukses: true, nama: u.nama, role: u.role, lisensi });
  }

  try {
    const hashed = hashPassword(password);
    const row = throwIfError(await db().from('users').select('nama, role, password_hash').eq('username', username).maybeSingle());

    if (!row || row.password_hash !== hashed) {
      return NextResponse.json({ sukses: false, pesan: 'Username atau password salah' });
    }

    const nama = row.nama || username;
    const role = row.role || 'staf';
    const token = signSession({ username, nama, role });
    await setSessionCookie(token);

    return NextResponse.json({ sukses: true, nama, role, lisensi });
  } catch (e) {
    console.error('POST /api/login gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal login: ' + e.message });
  }
}
