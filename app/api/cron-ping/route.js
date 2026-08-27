import { NextResponse } from 'next/server';
import { db, throwIfError } from '@/lib/db';

// ponytail: query kecil doang, tujuannya cuma bikin Supabase nganggep project "aktif"
// biar gak kena auto-pause (free tier pause kalau >7 hari gak ada aktivitas).
export async function GET() {
  try {
    throwIfError(await db().from('lisensi').select('key').limit(1));
    return NextResponse.json({ sukses: true, waktu: new Date().toISOString() });
  } catch (e) {
    console.error('GET /api/cron-ping gagal:', e);
    return NextResponse.json({ sukses: false, pesan: e.message }, { status: 500 });
  }
}
