import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { DEMO_MODE, DEMO_REKAP } from '@/lib/demoData';
import { hitungStatus } from '@/lib/target';

const VARIAN_ITEMS = ['PPDB', 'BUKU']; // item yang dipecah per Gel./Kelas Buku waktu ditampilin

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  if (DEMO_MODE) return NextResponse.json(DEMO_REKAP);

  const kelasFilter = new URL(req.url).searchParams.get('kelas'); // null = semua kelas

  try {
    const today = tanggalJakarta().tanggal;
    const kelasList = kelasFilter ? [kelasFilter] : KELAS_LIST;

    const [itemRows, siswaRows] = await Promise.all([
      db().from('item_pembayaran').select('*').order('urutan').then(r => throwIfError(r)),
      db().from('siswa').select('id, nama, kelas').in('kelas', kelasList).then(r => throwIfError(r)),
    ]);

    const perKelas = kelasList.map(kelas => ({ kelas, totalSiswa: 0, lunasCount: 0, persenLunas: 0 }));
    const perKelasIdx = Object.fromEntries(perKelas.map((k, i) => [k.kelas, i]));

    const itemMap = {};
    itemRows.forEach(it => {
      itemMap[it.id] = { kolom: it.id, nama: it.nama, terisi: 0, nominal: 0 };
      if (VARIAN_ITEMS.includes(it.nama)) itemMap[it.id].varian = {};
    });

    const bayarHariIni = [];

    if (siswaRows.length > 0) {
      const siswaIds = siswaRows.map(s => s.id);
      const pembayaranRows = throwIfError(
        await db().from('pembayaran').select('siswa_id, item_id, nominal, keterangan, terakhir_diisi').in('siswa_id', siswaIds)
      );

      const paymentsBySiswa = {};
      pembayaranRows.forEach(p => {
        if (!paymentsBySiswa[p.siswa_id]) paymentsBySiswa[p.siswa_id] = {};
        paymentsBySiswa[p.siswa_id][p.item_id] = p;

        const item = itemMap[p.item_id];
        if (item) {
          item.terisi++;
          item.nominal += Number(p.nominal) || 0;
          if (item.varian) {
            const label = p.keterangan || 'Tanpa keterangan';
            if (!item.varian[label]) item.varian[label] = { label, terisi: 0, nominal: 0 };
            item.varian[label].terisi++;
            item.varian[label].nominal += Number(p.nominal) || 0;
          }
        }

        if (p.terakhir_diisi && tanggalJakarta(new Date(p.terakhir_diisi)).tanggal === today) {
          const siswaInfo = siswaRows.find(s => s.id === p.siswa_id);
          const itemInfo = itemMap[p.item_id];
          const label = itemInfo?.varian && p.keterangan ? `${itemInfo.nama} (${p.keterangan})` : itemInfo?.nama;
          if (siswaInfo && itemInfo) bayarHariIni.push({ kelas: siswaInfo.kelas, siswa: siswaInfo.nama, item: label, nominal: Number(p.nominal) || 0 });
        }
      });

      siswaRows.forEach(s => {
        const idx = perKelasIdx[s.kelas];
        perKelas[idx].totalSiswa++;
        const applicableItems = itemRows.filter(it => !it.kelas_scope || it.kelas_scope.includes(s.kelas));
        const pay = paymentsBySiswa[s.id] || {};
        const semuaLunas = applicableItems.length > 0 && applicableItems.every(it => hitungStatus(pay[it.id]?.nominal ?? '', it.target) === 'lunas');
        if (semuaLunas) perKelas[idx].lunasCount++;
      });
    }

    perKelas.forEach(k => { k.persenLunas = k.totalSiswa > 0 ? Math.round((k.lunasCount / k.totalSiswa) * 100) : 0; });

    const perItem = Object.values(itemMap).map(it => ({
      ...it,
      varian: it.varian ? Object.values(it.varian).sort((a, b) => b.nominal - a.nominal) : undefined,
    })).sort((a, b) => a.kolom - b.kolom);

    return NextResponse.json({ perItem, perKelas, bayarHariIni, kelasFilter: kelasFilter || null });
  } catch (e) {
    console.error('GET /api/rekap gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil rekap: ' + e.message }, { status: 500 });
  }
}
