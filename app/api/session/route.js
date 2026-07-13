import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Dipanggil pas reload halaman — cek cookie httpOnly masih valid apa nggak
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false });
  return NextResponse.json({ sukses: true, nama: session.nama, role: session.role });
}
