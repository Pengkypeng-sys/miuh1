import { NextResponse } from 'next/server';
import { getValues, appendRow, ensurePengeluaranSheet, ensureLogSheet, SYSTEM_SPREADSHEET_ID } from '@/lib/sheets';
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
    { tanggal: '13/07/2026', keterangan: 'Beli ATK kantor', nominal: 150000, user: 'mi.uh1' },
    { tanggal: '13/07/2026', keterangan: 'Konsumsi rapat guru', nominal: 150000, user: 'mi.uh1' },
  ],
};
DEMO_KAS.rekapPerItem = rekapPerItem(DEMO_KAS.transaksiMasuk);

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

// Uang masuk hari ini = jumlah setoran dari sheet Log (aksi submit-pembayaran, delta baru-lama)
// Uang keluar hari ini = jumlah dari sheet Pengeluaran
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  if (DEMO_MODE) return NextResponse.json(DEMO_KAS);

  const params = new URL(req.url).searchParams;
  const tanggal = params.get('tanggal') || tanggalJakarta().tanggal;
  const semua = tanggal === 'semua';

  await Promise.all([ensurePengeluaranSheet(), ensureLogSheet()]);
  const [logRows, pengeluaranRows] = await Promise.all([
    getValues('Log!A2:I', SYSTEM_SPREADSHEET_ID),
    getValues('Pengeluaran!A2:D', SYSTEM_SPREADSHEET_ID),
  ]);

  const transaksiMasuk = [];
  let masuk = 0;
  logRows.forEach(r => {
    const [waktu, user, aksi, kelas, siswa, item, lama, baru, metode] = r;
    if (typeof waktu !== 'string' || !waktu) return;
    if (!semua && !waktu.startsWith(tanggal)) return;
    if (!['submit-pembayaran', 'edit-manual', 'edit-langsung'].includes(aksi)) return;
    const delta = (Number(baru) || 0) - (Number(lama) || 0);
    if (delta <= 0) return;
    masuk += delta;
    transaksiMasuk.push({ tanggal: waktu.split(' ')[0] || '', jam: waktu.split(' ')[1] || '', user, kelas, siswa, item, nominal: delta, metode: metode || '-' });
  });

  const transaksiKeluar = [];
  let keluar = 0;
  pengeluaranRows.forEach(r => {
    const [tgl, keterangan, nominal, user] = r;
    if (!tgl) return;
    if (!semua && tgl !== tanggal) return;
    const n = Number(nominal) || 0;
    keluar += n;
    transaksiKeluar.push({ tanggal: tgl, keterangan, nominal: n, user });
  });

  return NextResponse.json({
    tanggal: semua ? 'Semua Tanggal' : tanggal, semua, masuk, keluar, saldo: masuk - keluar,
    transaksiMasuk: transaksiMasuk.sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam)).reverse(),
    transaksiKeluar,
    rekapPerItem: rekapPerItem(transaksiMasuk),
  });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Session habis, silakan login ulang', sessionExpired: true });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa mencatat pengeluaran' });

  const { keterangan, nominal } = await req.json();
  if (!keterangan || !nominal) return NextResponse.json({ sukses: false, pesan: 'Isi keterangan dan nominal' });

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: 'Pengeluaran dicatat (demo, gak tersimpan)' });

  await ensurePengeluaranSheet();
  const { tanggal } = tanggalJakarta();
  await appendRow('Pengeluaran', [tanggal, keterangan, Number(nominal), session.username], true, SYSTEM_SPREADSHEET_ID);

  return NextResponse.json({ sukses: true, pesan: `Pengeluaran "${keterangan}" - Rp ${Number(nominal).toLocaleString('id-ID')} dicatat` });
}
