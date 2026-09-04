import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST, targetSppKelas } from '@/lib/db';
import { getSession, kelasDiizinkan } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { BULAN_LIST } from '@/lib/format';
import { DEMO_MODE, DEMO_SISWA, DEMO_ITEMS } from '@/lib/demoData';

// Tabel siswa x item buat 1 kelas — 3 query total (item, siswa, pembayaran), bukan loop per siswa.
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const kelas = params.get('kelas');
  const { tanggal } = tanggalJakarta();
  const semuaBulan = params.get('bulan') === 'semua';
  const bulanSpp = Number(params.get('bulan')) || Number(tanggal.split('/')[1]);
  const tahunSpp = Number(params.get('tahun')) || Number(tanggal.split('/')[2]);

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
    const target = await targetSppKelas(kelas);
    // SPP normal: 1 kolom sesuai bulan/tahun yang dipilih. Mode "semua bulan": 12 kolom sekaligus.
    const items = itemRows
      .filter(it => !it.kelas_scope || it.kelas_scope.includes(kelas))
      .flatMap(it => {
        if (it.nama !== 'SPP') return [{ nama: it.nama, kolom: it.id, target: it.target }];
        if (semuaBulan) return BULAN_LIST.map((b, i) => ({ nama: `SPP ${b}`, kolom: `spp-${i + 1}`, target }));
        return [{ nama: `SPP ${BULAN_LIST[bulanSpp - 1] || ''}`, kolom: 'spp', target }];
      });

    const siswaRows = throwIfError(await db().from('siswa').select('id, nama, yatim').eq('kelas', kelas));
    if (siswaRows.length === 0) return NextResponse.json({ items, siswa: [] });

    const siswaIds = siswaRows.map(s => s.id);
    const [pembayaranRows, sppRows] = await Promise.all([
      db().from('pembayaran').select('siswa_id, item_id, nominal, keterangan').in('siswa_id', siswaIds).then(r => throwIfError(r)),
      semuaBulan
        ? db().from('spp_bulanan').select('siswa_id, bulan, nominal').in('siswa_id', siswaIds).eq('tahun', tahunSpp).then(r => throwIfError(r))
        : db().from('spp_bulanan').select('siswa_id, nominal').in('siswa_id', siswaIds).eq('tahun', tahunSpp).eq('bulan', bulanSpp).then(r => throwIfError(r)),
    ]);

    const bySiswa = {};
    pembayaranRows.forEach(p => {
      if (!bySiswa[p.siswa_id]) bySiswa[p.siswa_id] = {};
      bySiswa[p.siswa_id][p.item_id] = p;
    });
    // Mode 1 bulan: sppBySiswa[siswaId] = nominal. Mode semua bulan: sppBySiswa[siswaId] = { bulanKe: nominal }.
    const sppBySiswa = {};
    sppRows.forEach(r => {
      if (semuaBulan) {
        if (!sppBySiswa[r.siswa_id]) sppBySiswa[r.siswa_id] = {};
        sppBySiswa[r.siswa_id][r.bulan] = Number(r.nominal) || 0;
      } else {
        sppBySiswa[r.siswa_id] = Number(r.nominal) || 0;
      }
    });

    const siswa = siswaRows
      .map(s => {
        const pay = bySiswa[s.id] || {};
        return {
          nama: s.nama,
          values: Object.fromEntries(items.map(it => {
            if (typeof it.kolom === 'string' && it.kolom.startsWith('spp-')) {
              const bulanKe = Number(it.kolom.slice(4));
              return [it.kolom, s.yatim ? target : (sppBySiswa[s.id]?.[bulanKe] ?? '')];
            }
            if (it.kolom === 'spp') return [it.kolom, s.yatim ? target : (sppBySiswa[s.id] ?? '')];
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
