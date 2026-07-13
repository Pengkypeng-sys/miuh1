import { NextResponse } from 'next/server';
import { getValues, SYSTEM_SPREADSHEET_ID } from '@/lib/sheets';
import { hashPassword, signSession, setSessionCookie } from '@/lib/auth';
import { DEMO_MODE, DEMO_USERS } from '@/lib/demoData';
import { statusLisensi } from '@/lib/license';

export async function POST(req) {
  const lisensi = DEMO_MODE ? { expired: false, peringatan: false, hariTersisa: 99, tanggalExpiry: '-' } : await statusLisensi();
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

  const data = await getValues('Users!A2:D', SYSTEM_SPREADSHEET_ID);
  const hashed = hashPassword(password);
  const row = data.find(r => String(r[0]) === String(username) && String(r[1]) === hashed);

  if (!row) {
    return NextResponse.json({ sukses: false, pesan: 'Username atau password salah' });
  }

  const nama = row[2] || username;
  const role = row[3] || 'staf';
  const token = signSession({ username, nama, role });
  await setSessionCookie(token);

  return NextResponse.json({ sukses: true, nama, role, lisensi });
}
