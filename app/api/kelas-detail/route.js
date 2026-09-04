import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST } from '@/lib/db';
import { getSession, kelasDiizinkan } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { BULAN_LIST, SPP_TARGET_PER_KELAS } from '@/lib/format';
import { DEMO_MODE, DEMO_SISWA, DEMO_ITEMS } from '@/lib/demoData';

// Tabel siswa x item buat 1 kelas — 3 query total (item, siswa, pembayaran), bukan loop per siswa.
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const kelas = new URL(req.url).searchParams.get('kelas');

  if (DEMO_MODE) {
    const siswa = (DEMO_SISWA[kelas] || ['Contoh Siswa 1', 'Contoh Siswa 2'])
      .map(nama => ({
        nama,
        values: Object.fromEntries(DEMO_ITEMS.map(i => [i.kolom, Math.random() > 0.4 ? i.target : (Math.random() > 0.5 ? Math.round(i.target / 2) : '')])),
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    return NextResponse.json({ items: DEMO_ITEMS, siswa });
  }

  if (!KELAS_LIST.includes(kelas) || !kelasDiizinkan(session, kelas)) return NextResponse.json({ items: [], siswa: [] });

  try {
    const itemRows = throwIfError(await db().from('item_pembayaran').select('*').order('urutan'));
    // SPP dipecah jadi 12 kolom bulan (dari tabel spp_bulanan, target per kelas) — bukan 1 kolom flat,
    // biar keliatan bulan mana yang udah lunas kayak di form Bayar.
    const items = itemRows
      .filter(it => !it.kelas_scope || it.kelas_scope.includes(kelas))
      .flatMap(it => it.nama === 'SPP'
        ? BULAN_LIST.map((b, i) => ({ nama: `SPP ${b}`, kolom: `spp-${i + 1}`, target: SPP_TARGET_PER_KELAS[kelas] || 0 }))
        : [{ nama: it.nama, kolom: it.id, target: it.target }]);

    const siswaRows = throwIfError(await db().from('siswa').select('id, nama, yatim').eq('kelas', kelas));
    if (siswaRows.length === 0) return NextResponse.json({ items, siswa: [] });

    const siswaIds = siswaRows.map(s => s.id);
    const tahun = Number(tanggalJakarta().tanggal.split('/')[2]);
    const [pembayaranRows, sppRows] = await Promise.all([
      db().from('pembayaran').select('siswa_id, item_id, nominal, keterangan').in('siswa_id', siswaIds).then(r => throwIfError(r)),
      db().from('spp_bulanan').select('siswa_id, bulan, nominal').in('siswa_id', siswaIds).eq('tahun', tahun).then(r => throwIfError(r)),
    ]);

    const bySiswa = {};
    pembayaranRows.forEach(p => {
      if (!bySiswa[p.siswa_id]) bySiswa[p.siswa_id] = {};
      bySiswa[p.siswa_id][p.item_id] = p;
    });
    const sppBySiswa = {};
    sppRows.forEach(r => {
      if (!sppBySiswa[r.siswa_id]) sppBySiswa[r.siswa_id] = {};
      sppBySiswa[r.siswa_id][r.bulan] = Number(r.nominal) || 0;
    });

    const siswa = siswaRows
      .map(s => {
        const pay = bySiswa[s.id] || {};
        const spp = sppBySiswa[s.id] || {};
        const target = SPP_TARGET_PER_KELAS[kelas] || 0;
        return {
          nama: s.nama,
          values: Object.fromEntries(items.map(it => {
            if (typeof it.kolom === 'string' && it.kolom.startsWith('spp-')) {
              const bulanKe = Number(it.kolom.slice(4));
              return [it.kolom, s.yatim ? target : (spp[bulanKe] ?? '')];
            }
            return [it.kolom, pay[it.kolom]?.nominal ?? ''];
          })),
          keterangan: Object.fromEntries(items.map(it => [it.kolom, pay[it.kolom]?.keterangan || ''])),
        };
      })
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

    return NextResponse.json({ items, siswa });
  } catch (e) {
    console.error('GET /api/kelas-detail gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil detail kelas: ' + e.message }, { status: 500 });
  }
}
