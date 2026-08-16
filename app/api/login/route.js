import { NextResponse } from 'next/server';
import { db, throwIfError } from '@/lib/db';
import { hashPassword, signSession, setSessionCookie } from '@/lib/auth';
import { DEMO_MODE, DEMO_USERS } from '@/lib/demoData';
import { statusLisensi } from '@/lib/license';

// ponytail: lockout in-memory per instance, sama pola kayak /api/dev/license & /api/account/password
const MAX_PERCOBAAN = 5;
const WINDOW_MS = 10 * 60 * 1000;
const percobaanGagal = new Map(); // ip -> { count, mulai }

function terkunci(ip) {
  const gagal = percobaanGagal.get(ip);
  return gagal && gagal.count >= MAX_PERCOBAAN && Date.now() - gagal.mulai < WINDOW_MS;
}
function catatGagal(ip) {
  const now = Date.now();
  const prev = percobaanGagal.get(ip);
  percobaanGagal.set(ip, prev && now - prev.mulai < WINDOW_MS ? { count: prev.count + 1, mulai: prev.mulai } : { count: 1, mulai: now });
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (terkunci(ip)) return NextResponse.json({ sukses: false, pesan: 'Terlalu banyak percobaan login gagal, coba lagi 10 menit lagi' }, { status: 429 });

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

  const ua = req.headers.get('user-agent') || '';

  if (DEMO_MODE) {
    const u = DEMO_USERS[username];
    if (!u || u.password !== password) { catatGagal(ip); return NextResponse.json({ sukses: false, pesan: 'Username atau password salah' }); }
    percobaanGagal.delete(ip);
    const token = signSession({ username, nama: u.nama, role: u.role, ua });
    await setSessionCookie(token);
    return NextResponse.json({ sukses: true, nama: u.nama, role: u.role, lisensi });
  }

  try {
    const hashed = hashPassword(password);
    const row = throwIfError(await db().from('users').select('nama, role, password_hash').eq('username', username).maybeSingle());

    if (!row || row.password_hash !== hashed) {
      catatGagal(ip);
      return NextResponse.json({ sukses: false, pesan: 'Username atau password salah' });
    }
    percobaanGagal.delete(ip);

    const nama = row.nama || username;
    const role = row.role || 'staf';
    const token = signSession({ username, nama, role, ua });
    await setSessionCookie(token);

    return NextResponse.json({ sukses: true, nama, role, lisensi });
  } catch (e) {
    console.error('POST /api/login gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal login: ' + e.message });
  }
}
