import { NextResponse } from 'next/server';
import { db, throwIfError } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { DEMO_MODE } from '@/lib/demoData';

// Drill-down: item + bulan -> total, per kelas, per siswa (siapa aja yang bayar item itu bulan itu)
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const item = params.get('item'); // nama dasar, mis. 'SPP', 'BUKU'
  const tahun = Number(params.get('tahun'));
  const bulan = Number(params.get('bulan'));
  if (!item || !tahun || !bulan || bulan < 1 || bulan > 12) return NextResponse.json({ sukses: false, pesan: 'Item/tahun/bulan gak valid' }, { status: 400 });

  const bulanStr = String(bulan).padStart(2, '0');

  if (DEMO_MODE) {
    return NextResponse.json({
      sukses: true, item, tahun, bulan, total: 660000,
      perKelas: [{ kelas: 'KELAS 1', total: 660000, siswa: [{ nama: 'Ahmad Fauzi', total: 660000, tanggal: '13/07/2026' }] }],
    });
  }

  try {
    const logRows = throwIfError(await db().from('log_aktivitas').select('waktu, kelas, siswa, item, lama, baru'));

    const perKelasMap = {}; // kelas -> { total, siswaMap: { nama -> { total, tanggalTerakhir } } }
    let total = 0;
    // guru session dikunci ke kelasnya sendiri — sama pola kayak route lain
    const kelasGuru = session.role === 'guru' ? session.kelas : null;

    logRows.forEach(r => {
      if (!r.waktu || !r.kelas || !r.siswa || !r.item) return;
      if (!r.item.startsWith(item)) return;
      if (kelasGuru && r.kelas !== kelasGuru) return;
      const delta = (Number(r.baru) || 0) - (Number(r.lama) || 0);
      if (delta <= 0) return;
      const { tanggal } = tanggalJakarta(new Date(r.waktu));
      const [dd, mm, yyyy] = tanggal.split('/');
      if (`${yyyy}-${mm}` !== `${tahun}-${bulanStr}`) return;

      if (!perKelasMap[r.kelas]) perKelasMap[r.kelas] = { total: 0, siswaMap: {} };
      perKelasMap[r.kelas].total += delta;
      total += delta;
      if (!perKelasMap[r.kelas].siswaMap[r.siswa]) perKelasMap[r.kelas].siswaMap[r.siswa] = { total: 0, tanggal };
      perKelasMap[r.kelas].siswaMap[r.siswa].total += delta;
      perKelasMap[r.kelas].siswaMap[r.siswa].tanggal = tanggal; // tanggal transaksi terakhir bulan itu
    });

    const perKelas = Object.entries(perKelasMap)
      .map(([kelas, v]) => ({
        kelas, total: v.total,
        siswa: Object.entries(v.siswaMap).map(([nama, s]) => ({ nama, total: s.total, tanggal: s.tanggal })).sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => a.kelas.localeCompare(b.kelas));

    return NextResponse.json({ sukses: true, item, tahun, bulan, total, perKelas });
  } catch (e) {
    console.error('GET /api/rekap-item-bulan gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil rekap: ' + e.message }, { status: 500 });
  }
}
