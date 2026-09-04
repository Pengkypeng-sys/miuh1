import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buatLaporanBulanan, daftarItemLaporan } from '@/lib/laporanBulanan';
import { DEMO_MODE } from '@/lib/demoData';

// Daftar nama item yang bisa dicentang di form export — dipanggil FE pas buka panel Laporan Bulanan
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin' }, { status: 403 });
  if (DEMO_MODE) return NextResponse.json({ sukses: true, items: ['SPP', 'BUKU', 'PPDB'] });

  try {
    const items = await daftarItemLaporan();
    return NextResponse.json({ sukses: true, items });
  } catch (e) {
    console.error('POST /api/laporan-bulanan gagal:', e);
    return NextResponse.json({ sukses: false, pesan: e.message }, { status: 500 });
  }
}

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa export laporan bulanan' }, { status: 403 });
  if (DEMO_MODE) return NextResponse.json({ sukses: false, pesan: 'Gak tersedia di mode demo' });

  const params = new URL(req.url).searchParams;
  const tahun = Number(params.get('tahun'));
  const bulan = Number(params.get('bulan'));
  if (!tahun || !bulan || bulan < 1 || bulan > 12) return NextResponse.json({ sukses: false, pesan: 'Tahun/bulan gak valid' }, { status: 400 });
  const items = (params.get('items') || '').split(',').filter(Boolean);
  const includePengeluaran = params.get('pengeluaran') !== '0';

  try {
    const wb = await buatLaporanBulanan(tahun, bulan, items, includePengeluaran);
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
