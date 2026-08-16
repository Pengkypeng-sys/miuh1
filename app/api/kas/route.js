import { NextResponse } from 'next/server';
import { db, throwIfError } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { DEMO_MODE } from '@/lib/demoData';

const DEMO_KAS = {
  tanggal: '13/07/2026',
  masuk: 850000,
  keluar: 300000,
  saldo: 550000,
  transaksiMasuk: [
    { tanggal: '13/07/2026', jam: '08:12:03', user: 'guru.miuh1', kelas: 'KELAS 1', siswa: 'Ahmad Fauzi', item: 'SPP', nominal: 70000 },
    { tanggal: '13/07/2026', jam: '09:30:41', user: 'guru.miuh1', kelas: 'KELAS 3', siswa: 'Nadia Putri', item: 'PTS 1', nominal: 50000 },
    { tanggal: '13/07/2026', jam: '10:05:18', user: 'mi.uh1', kelas: 'KELAS 5', siswa: 'Rizki Ramadhan', item: 'BUKU', nominal: 120000 },
    { tanggal: '13/07/2026', jam: '10:40:02', user: 'guru.miuh1', kelas: 'KELAS 2', siswa: 'Dewi Lestari', item: 'SPP', nominal: 70000 },
  ],
  transaksiKeluar: [
    { tanggal: '13/07/2026', keterangan: 'Beli ATK kantor', nominal: 150000, user: 'mi.uh1', kategori: 'ATK' },
    { tanggal: '13/07/2026', keterangan: 'Konsumsi rapat guru', nominal: 150000, user: 'mi.uh1', kategori: 'Konsumsi' },
  ],
  trend7hari: [
    { tanggal: '07/07', saldo: 200000 }, { tanggal: '08/07', saldo: -50000 }, { tanggal: '09/07', saldo: 400000 },
    { tanggal: '10/07', saldo: 0 }, { tanggal: '11/07', saldo: 150000 }, { tanggal: '12/07', saldo: 300000 },
    { tanggal: '13/07', saldo: 550000 },
  ],
  rekapBulanan: [
    { bulan: 'Mar 2026', masuk: 4200000, keluar: 900000, saldo: 3300000, perKategori: [{ kategori: 'Operasional', total: 500000 }, { kategori: 'ATK', total: 400000 }] },
    { bulan: 'Apr 2026', masuk: 5100000, keluar: 1200000, saldo: 3900000, perKategori: [{ kategori: 'Operasional', total: 700000 }, { kategori: 'Konsumsi', total: 500000 }] },
    { bulan: 'Mei 2026', masuk: 3800000, keluar: 700000, saldo: 3100000, perKategori: [{ kategori: 'ATK', total: 400000 }, { kategori: 'Kebersihan', total: 300000 }] },
    { bulan: 'Jun 2026', masuk: 4600000, keluar: 1000000, saldo: 3600000, perKategori: [{ kategori: 'Operasional', total: 600000 }, { kategori: 'ATK', total: 400000 }] },
    { bulan: 'Jul 2026', masuk: 5300000, keluar: 1500000, saldo: 3800000, perKategori: [{ kategori: 'Operasional', total: 900000 }, { kategori: 'Konsumsi', total: 600000 }] },
    { bulan: 'Agu 2026', masuk: 850000, keluar: 300000, saldo: 550000, perKategori: [{ kategori: 'ATK', total: 150000 }, { kategori: 'Konsumsi', total: 150000 }] },
  ],
};
DEMO_KAS.rekapPerItem = rekapPerItem(DEMO_KAS.transaksiMasuk);
DEMO_KAS.rekapPerKategori = rekapPerKategori(DEMO_KAS.transaksiKeluar);

// Kelompokin transaksi hari ini per jenis item: berapa orang (siswa unik) & total Rp
function rekapPerItem(transaksiMasuk) {
  const map = {};
  transaksiMasuk.forEach(t => {
    if (!map[t.item]) map[t.item] = { item: t.item, siswaSet: new Set(), total: 0 };
    map[t.item].siswaSet.add(t.siswa);
    map[t.item].total += t.nominal;
  });
  return Object.values(map)
    .map(({ item, siswaSet, total }) => ({ item, orang: siswaSet.size, total }))
    .sort((a, b) => b.total - a.total);
}

// Kelompokin pengeluaran per kategori: berapa transaksi & total Rp
function rekapPerKategori(transaksiKeluar) {
  const map = {};
  transaksiKeluar.forEach(t => {
    const kat = t.kategori || 'Lainnya';
    if (!map[kat]) map[kat] = { kategori: kat, jumlah: 0, total: 0 };
    map[kat].jumlah += 1;
    map[kat].total += t.nominal;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// Saldo per hari 7 hari terakhir (termasuk hari ini), dari log_aktivitas + pengeluaran mentah (belum difilter tanggal)
function hitungTrend7Hari(logRows, pengeluaranRows) {
  const perHari = {}; // 'YYYY-MM-DD' -> { masuk, keluar }
  logRows.forEach(r => {
    if (!r.waktu || !['submit-pembayaran', 'edit-manual', 'edit-langsung'].includes(r.aksi)) return;
    const delta = (Number(r.baru) || 0) - (Number(r.lama) || 0);
    if (delta <= 0) return;
    const key = tanggalJakarta(new Date(r.waktu)).tanggal.split('/').reverse().join('-');
    if (!perHari[key]) perHari[key] = { masuk: 0, keluar: 0 };
    perHari[key].masuk += delta;
  });
  pengeluaranRows.forEach(r => {
    if (!r.tanggal) return;
    if (!perHari[r.tanggal]) perHari[r.tanggal] = { masuk: 0, keluar: 0 };
    perHari[r.tanggal].keluar += Number(r.nominal) || 0;
  });

  const hasilList = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const ddmmyyyy = tanggalJakarta(d).tanggal; // 'DD/MM/YYYY'
    const [dd, mm, yyyy] = ddmmyyyy.split('/');
    const key = `${yyyy}-${mm}-${dd}`;
    const { masuk = 0, keluar = 0 } = perHari[key] || {};
    hasilList.push({ tanggal: `${dd}/${mm}`, saldo: masuk - keluar });
  }
  return hasilList;
}

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Masuk/keluar/saldo per bulan, 6 bulan terakhir (termasuk bulan ini)
function hitungRekapBulanan(logRows, pengeluaranRows) {
  const perBulan = {}; // 'YYYY-MM' -> { masuk, keluar, perKategori }
  logRows.forEach(r => {
    if (!r.waktu || !['submit-pembayaran', 'edit-manual', 'edit-langsung'].includes(r.aksi)) return;
    const delta = (Number(r.baru) || 0) - (Number(r.lama) || 0);
    if (delta <= 0) return;
    const { tanggal } = tanggalJakarta(new Date(r.waktu));
    const [dd, mm, yyyy] = tanggal.split('/');
    const key = `${yyyy}-${mm}`;
    if (!perBulan[key]) perBulan[key] = { masuk: 0, keluar: 0, perKategori: {} };
    perBulan[key].masuk += delta;
  });
  pengeluaranRows.forEach(r => {
    if (!r.tanggal) return;
    const key = r.tanggal.slice(0, 7); // 'YYYY-MM-DD' -> 'YYYY-MM'
    if (!perBulan[key]) perBulan[key] = { masuk: 0, keluar: 0, perKategori: {} };
    const n = Number(r.nominal) || 0;
    perBulan[key].keluar += n;
    const kat = r.kategori || 'Lainnya';
    perBulan[key].perKategori[kat] = (perBulan[key].perKategori[kat] || 0) + n;
  });

  const hasilList = [];
  const now = new Date(tanggalJakarta().tanggal.split('/').reverse().join('-'));
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const { masuk = 0, keluar = 0, perKategori = {} } = perBulan[key] || {};
    hasilList.push({
      bulan: `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`, masuk, keluar, saldo: masuk - keluar,
      perKategori: Object.entries(perKategori).map(([kategori, total]) => ({ kategori, total })).sort((a, b) => b.total - a.total),
    });
  }
  return hasilList;
}

// Uang masuk = delta baru-lama dari log_aktivitas (aksi submit-pembayaran/edit-*)
// Uang keluar = tabel pengeluaran
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  if (DEMO_MODE) return NextResponse.json(DEMO_KAS);

  const params = new URL(req.url).searchParams;
  const tanggal = params.get('tanggal') || tanggalJakarta().tanggal;
  const semua = tanggal === 'semua';

  try {
    const [logRows, pengeluaranRows] = await Promise.all([
      db().from('log_aktivitas').select('waktu, user_name, aksi, kelas, siswa, item, lama, baru, metode').then(r => throwIfError(r)),
      db().from('pengeluaran').select('tanggal, keterangan, nominal, dicatat_oleh, kategori').then(r => throwIfError(r)),
    ]);

    const transaksiMasuk = [];
    let masuk = 0;
    logRows.forEach(r => {
      if (!r.waktu) return;
      if (!['submit-pembayaran', 'edit-manual', 'edit-langsung'].includes(r.aksi)) return;
      const { tanggal: tgl, jam } = tanggalJakarta(new Date(r.waktu));
      if (!semua && tgl !== tanggal) return;
      const delta = (Number(r.baru) || 0) - (Number(r.lama) || 0);
      if (delta <= 0) return;
      masuk += delta;
      transaksiMasuk.push({ tanggal: tgl, jam, user: r.user_name, kelas: r.kelas, siswa: r.siswa, item: r.item, nominal: delta, metode: r.metode || '-' });
    });

    const transaksiKeluar = [];
    let keluar = 0;
    pengeluaranRows.forEach(r => {
      if (!r.tanggal) return;
      const tgl = r.tanggal.split('-').reverse().join('/'); // 'YYYY-MM-DD' (Postgres date) -> 'DD/MM/YYYY'
      if (!semua && tgl !== tanggal) return;
      const n = Number(r.nominal) || 0;
      keluar += n;
      transaksiKeluar.push({ tanggal: tgl, keterangan: r.keterangan, nominal: n, user: r.dicatat_oleh, kategori: r.kategori || 'Lainnya' });
    });

    return NextResponse.json({
      tanggal: semua ? 'Semua Tanggal' : tanggal, semua, masuk, keluar, saldo: masuk - keluar,
      transaksiMasuk: transaksiMasuk.sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam)).reverse(),
      transaksiKeluar,
      rekapPerItem: rekapPerItem(transaksiMasuk),
      rekapPerKategori: rekapPerKategori(transaksiKeluar),
      trend7hari: hitungTrend7Hari(logRows, pengeluaranRows),
      rekapBulanan: hitungRekapBulanan(logRows, pengeluaranRows),
    });
  } catch (e) {
    console.error('GET /api/kas gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil data kas: ' + e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Session habis, silakan login ulang', sessionExpired: true });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa mencatat pengeluaran' });

  const { keterangan, nominal, kategori } = await req.json();
  if (!keterangan || !nominal) return NextResponse.json({ sukses: false, pesan: 'Isi keterangan dan nominal' });

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: 'Pengeluaran dicatat (demo, gak tersimpan)' });

  try {
    throwIfError(await db().from('pengeluaran').insert({ keterangan, nominal: Number(nominal), dicatat_oleh: session.username, kategori: kategori || 'Lainnya' }));
    return NextResponse.json({ sukses: true, pesan: `Pengeluaran "${keterangan}" - Rp ${Number(nominal).toLocaleString('id-ID')} dicatat` });
  } catch (e) {
    console.error('POST /api/kas gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal catat pengeluaran: ' + e.message });
  }
}
