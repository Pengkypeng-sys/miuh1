import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { DEMO_MODE, DEMO_REKAP } from '@/lib/demoData';
import { hitungStatus } from '@/lib/target';
import { targetSebenarnya } from '@/lib/format';

const VARIAN_ITEMS = ['PPDB', 'BUKU']; // item yang dipecah per Gel./Kelas Buku waktu ditampilin
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Total terkumpul per bulan, 6 bulan terakhir (termasuk bulan ini) — buat grafik trend di Dashboard
function hitungTrenBulanan(logRows) {
  const perBulan = {}; // 'YYYY-MM' -> total
  logRows.forEach(r => {
    if (!r.waktu || !['submit-pembayaran', 'edit-manual', 'edit-langsung'].includes(r.aksi)) return;
    const delta = (Number(r.baru) || 0) - (Number(r.lama) || 0);
    if (delta <= 0) return;
    const { tanggal } = tanggalJakarta(new Date(r.waktu));
    const [dd, mm, yyyy] = tanggal.split('/');
    const key = `${yyyy}-${mm}`;
    perBulan[key] = (perBulan[key] || 0) + delta;
  });

  const hasilList = [];
  const now = new Date(tanggalJakarta().tanggal.split('/').reverse().join('-'));
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    hasilList.push({ bulan: `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`, total: perBulan[key] || 0 });
  }
  return hasilList;
}

// Total pemasukan per TAHUN AJARAN (Juli-Juni, format "2025/2026") — seluruh histori data, max 5 tahun ajaran terakhir
function hitungTotalPerTahunAjaran(logRows) {
  const perTahunAjaran = {}; // "2025/2026" -> total
  logRows.forEach(r => {
    if (!r.waktu || !['submit-pembayaran', 'edit-manual', 'edit-langsung'].includes(r.aksi)) return;
    const delta = (Number(r.baru) || 0) - (Number(r.lama) || 0);
    if (delta <= 0) return;
    const { tanggal } = tanggalJakarta(new Date(r.waktu));
    const [dd, mm, yyyy] = tanggal.split('/').map(Number);
    const tahunAwal = mm >= 7 ? yyyy : yyyy - 1; // Juli-Desember masuk tahun ajaran yang dimulai tahun itu
    const key = `${tahunAwal}/${tahunAwal + 1}`;
    perTahunAjaran[key] = (perTahunAjaran[key] || 0) + delta;
  });

  return Object.entries(perTahunAjaran)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-5)
    .map(([tahunAjaran, total]) => ({ tahunAjaran, total }));
}

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  if (DEMO_MODE) return NextResponse.json(DEMO_REKAP);

  const params = new URL(req.url).searchParams;
  // Guru dikunci ke kelasnya sendiri, gak peduli query param yang dikirim
  const kelasFilter = session.role === 'guru' ? session.kelas : params.get('kelas'); // null = semua kelas
  const tanggalBayar = params.get('tanggalBayar') || tanggalJakarta().tanggal;

  try {
    const kelasList = kelasFilter ? [kelasFilter] : KELAS_LIST;

    const [itemRows, siswaRows, logRows] = await Promise.all([
      db().from('item_pembayaran').select('*').order('urutan').then(r => throwIfError(r)),
      db().from('siswa').select('id, nama, kelas, created_at').in('kelas', kelasList).then(r => throwIfError(r)),
      db().from('log_aktivitas').select('waktu, aksi, lama, baru').then(r => throwIfError(r)),
    ]);

    const perKelas = kelasList.map(kelas => ({ kelas, totalSiswa: 0, lunasCount: 0, persenLunas: 0 }));
    const perKelasIdx = Object.fromEntries(perKelas.map((k, i) => [k.kelas, i]));

    const itemMap = {};
    itemRows.forEach(it => {
      itemMap[it.id] = { kolom: it.id, nama: it.nama, terisi: 0, nominal: 0 };
      if (VARIAN_ITEMS.includes(it.nama)) itemMap[it.id].varian = {};
    });

    const bayarHariIni = [];
    const piutang = [];

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

        if (p.terakhir_diisi && tanggalJakarta(new Date(p.terakhir_diisi)).tanggal === tanggalBayar) {
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
        // Tabungan Wajib sifatnya nabung sukarela, bukan kewajiban — jangan ikut nentuin status "Lunas"
        const itemsWajib = applicableItems.filter(it => it.nama !== 'TABUNGAN WAJIB');
        const semuaLunas = itemsWajib.length > 0 && itemsWajib.every(it => hitungStatus(pay[it.id]?.nominal ?? '', it.target) === 'lunas');
        if (semuaLunas) perKelas[idx].lunasCount++;

        // piutang: total kurang bayar per siswa dari item yang belum lunas
        let kurangTotal = 0;
        const itemKurang = [];
        applicableItems.forEach(it => {
          const p = pay[it.id];
          const target = targetSebenarnya(it.nama, p?.keterangan, it.target);
          const status = hitungStatus(p?.nominal ?? '', target);
          if (status === 'lunas') return;
          const kurang = target - (Number(p?.nominal) || 0);
          if (kurang <= 0) return;
          kurangTotal += kurang;
          itemKurang.push({ nama: it.nama, kurang });
        });
        if (kurangTotal > 0) {
          const hariSejakDaftar = s.created_at ? Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000) : 0;
          piutang.push({ kelas: s.kelas, siswa: s.nama, kurang: kurangTotal, items: itemKurang, lewat30: hariSejakDaftar > 30 });
        }
      });
    }

    perKelas.forEach(k => { k.persenLunas = k.totalSiswa > 0 ? Math.round((k.lunasCount / k.totalSiswa) * 100) : 0; });

    const perItem = Object.values(itemMap).map(it => ({
      ...it,
      varian: it.varian ? Object.values(it.varian).sort((a, b) => b.nominal - a.nominal) : undefined,
    })).sort((a, b) => a.kolom - b.kolom);

    piutang.sort((a, b) => b.kurang - a.kurang);

    // Toleran kalau tabel riwayat_siswa belum dibuat (migrasi belum jalan) — jangan bikin rekap gagal total
    let riwayatSiswa = [];
    try {
      riwayatSiswa = throwIfError(await db().from('riwayat_siswa').select('tahun, total_siswa, per_kelas').order('tahun'));
    } catch (e) {
      console.error('Gagal ambil riwayat_siswa (mungkin tabel belum dibuat):', e.message);
    }

    return NextResponse.json({
      perItem, perKelas, bayarHariIni, piutang, riwayatSiswa, kelasFilter: kelasFilter || null, tanggalBayar,
      trendBulanan: hitungTrenBulanan(logRows), totalPerTahunAjaran: hitungTotalPerTahunAjaran(logRows),
    });
  } catch (e) {
    console.error('GET /api/rekap gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil rekap: ' + e.message }, { status: 500 });
  }
}
