import { NextResponse } from 'next/server';
import { db, throwIfError } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import { DEMO_MODE } from '@/lib/demoData';

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const { passwordLama, passwordBaru } = await req.json();
  if (!passwordLama || !passwordBaru) return NextResponse.json({ sukses: false, pesan: 'Isi password lama dan baru' });
  if (passwordBaru.length < 6) return NextResponse.json({ sukses: false, pesan: 'Password baru minimal 6 karakter' });

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: 'Password berhasil diganti (demo, gak tersimpan)' });

  try {
    const row = throwIfError(await db().from('users').select('password_hash').eq('username', session.username).maybeSingle());
    if (!row || row.password_hash !== hashPassword(passwordLama)) {
      return NextResponse.json({ sukses: false, pesan: 'Password lama salah' });
    }
    throwIfError(await db().from('users').update({ password_hash: hashPassword(passwordBaru) }).eq('username', session.username));
    return NextResponse.json({ sukses: true, pesan: 'Password berhasil diganti' });
  } catch (e) {
    console.error('PUT /api/account/password gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ganti password: ' + e.message });
  }
}
