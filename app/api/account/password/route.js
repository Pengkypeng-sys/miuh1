import { NextResponse } from 'next/server';
import { db, throwIfError } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import { DEMO_MODE } from '@/lib/demoData';

// ponytail: lockout in-memory per instance, reset kalau serverless function cold-start —
// cukup buat nahan brute force kasar dari 1 request terus-terusan, bukan proteksi penuh.
const MAX_PERCOBAAN = 5;
const WINDOW_MS = 10 * 60 * 1000;
const percobaanGagal = new Map(); // username -> { count, mulai }

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const { passwordLama, passwordBaru } = await req.json();
  if (!passwordLama || !passwordBaru) return NextResponse.json({ sukses: false, pesan: 'Isi password lama dan baru' });
  if (passwordBaru.length < 6) return NextResponse.json({ sukses: false, pesan: 'Password baru minimal 6 karakter' });

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: 'Password berhasil diganti (demo, gak tersimpan)' });

  const gagal = percobaanGagal.get(session.username);
  if (gagal && gagal.count >= MAX_PERCOBAAN && Date.now() - gagal.mulai < WINDOW_MS) {
    return NextResponse.json({ sukses: false, pesan: 'Terlalu banyak percobaan salah, coba lagi 10 menit lagi' });
  }

  try {
    const row = throwIfError(await db().from('users').select('password_hash').eq('username', session.username).maybeSingle());
    if (!row || row.password_hash !== hashPassword(passwordLama)) {
      const now = Date.now();
      const prev = percobaanGagal.get(session.username);
      percobaanGagal.set(session.username, prev && now - prev.mulai < WINDOW_MS ? { count: prev.count + 1, mulai: prev.mulai } : { count: 1, mulai: now });
      return NextResponse.json({ sukses: false, pesan: 'Password lama salah' });
    }
    percobaanGagal.delete(session.username);
    throwIfError(await db().from('users').update({ password_hash: hashPassword(passwordBaru) }).eq('username', session.username));
    return NextResponse.json({ sukses: true, pesan: 'Password berhasil diganti' });
  } catch (e) {
    console.error('PUT /api/account/password gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ganti password: ' + e.message });
  }
}
