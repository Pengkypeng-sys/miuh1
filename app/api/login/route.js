import { NextResponse } from 'next/server';
import { getValues } from '@/lib/sheets';
import { hashPassword, signSession, setSessionCookie } from '@/lib/auth';
import { DEMO_MODE, DEMO_USERS } from '@/lib/demoData';

export async function POST(req) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ sukses: false, pesan: 'Isi username dan password' });
  }

  if (DEMO_MODE) {
    const u = DEMO_USERS[username];
    if (!u || u.password !== password) return NextResponse.json({ sukses: false, pesan: 'Username atau password salah' });
    const token = signSession({ username, nama: u.nama, role: u.role });
    await setSessionCookie(token);
    return NextResponse.json({ sukses: true, nama: u.nama, role: u.role });
  }

  const data = await getValues('Users!A2:D');
  const hashed = hashPassword(password);
  const row = data.find(r => String(r[0]) === String(username) && String(r[1]) === hashed);

  if (!row) {
    return NextResponse.json({ sukses: false, pesan: 'Username atau password salah' });
  }

  const nama = row[2] || username;
  const role = row[3] || 'staf';
  const token = signSession({ username, nama, role });
  await setSessionCookie(token);

  return NextResponse.json({ sukses: true, nama, role });
}
