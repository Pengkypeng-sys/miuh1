import { NextResponse } from 'next/server';
import { getSheetTitles, EXCLUDED_SHEETS } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { DEMO_MODE, DEMO_KELAS } from '@/lib/demoData';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  if (DEMO_MODE) return NextResponse.json(DEMO_KELAS);

  const titles = await getSheetTitles();
  return NextResponse.json(titles.filter(t => !EXCLUDED_SHEETS.includes(t)));
}
