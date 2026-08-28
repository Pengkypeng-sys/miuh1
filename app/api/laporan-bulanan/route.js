import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buatLaporanBulanan } from '@/lib/laporanBulanan';
import { DEMO_MODE } from '@/lib/demoData';

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa export laporan bulanan' }, { status: 403 });
  if (DEMO_MODE) return NextResponse.json({ sukses: false, pesan: 'Gak tersedia di mode demo' });

  const params = new URL(req.url).searchParams;
  const tahun = Number(params.get('tahun'));
  const bulan = Number(params.get('bulan'));
  if (!tahun || !bulan || bulan < 1 || bulan > 12) return NextResponse.json({ sukses: false, pesan: 'Tahun/bulan gak valid' }, { status: 400 });

  try {
    const wb = await buatLaporanBulanan(tahun, bulan);
    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="LAPORAN BULANAN ${bulan}-${tahun}.xlsx"`,
      },
    });
  } catch (e) {
    console.error('GET /api/laporan-bulanan gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal generate laporan: ' + e.message }, { status: 500 });
  }
}
