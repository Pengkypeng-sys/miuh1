import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST, targetSppKelas, fetchAllRows } from '@/lib/db';
import { getSession, kelasDiizinkan } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { BULAN_LIST } from '@/lib/format';
import { DEMO_MODE, DEMO_SISWA, DEMO_ITEMS } from '@/lib/demoData';

// Tabel siswa x item buat 1 kelas — 3 query total (item, siswa, pembayaran), bukan loop per siswa.
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const kelas = params.get('kelas'); // 1 kelas ("KELAS 1") ATAU gabungan dipisah koma ("KELAS 1,KELAS 3")
  const kelasArr = kelas ? kelas.split(',') : [];
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

  if (kelasArr.length === 0 || !kelasArr.every(k => KELAS_LIST.includes(k) && kelasDiizinkan(session, k))) {
    return NextResponse.json({ items: [], siswa: [] });
  }

  try {
    const itemRows = throwIfError(await db().from('item_pembayaran').select('*').order('urutan'));
    // Target SPP bisa beda per kelas — kalau gabungan kelas dipilih, ambil semua target-nya sekaligus,
    // 1 kolom SPP tetep dipakai bareng tapi target ditentuin per-siswa dari kelas siswa itu sendiri.
    const targetPerKelas = Object.fromEntries(await Promise.all(kelasArr.map(async k => [k, await targetSppKelas(k)])));
    const targetContoh = targetPerKelas[kelasArr[0]];
    // SPP normal: 1 kolom sesuai bulan/tahun yang dipilih. Mode "semua bulan": 12 kolom sekaligus.
    const items = itemRows
      .filter(it => !it.kelas_scope || kelasArr.some(k => it.kelas_scope.includes(k)))
      .flatMap(it => {
        if (it.nama !== 'SPP') return [{ nama: it.nama, kolom: it.id, target: it.target }];
        if (semuaBulan) return BULAN_LIST.map((b, i) => ({ nama: `SPP ${b}`, kolom: `spp-${i + 1}`, target: targetContoh }));
        return [{ nama: `SPP ${BULAN_LIST[bulanSpp - 1] || ''}`, kolom: 'spp', target: targetContoh }];
      });

    const siswaRows = throwIfError(await db().from('siswa').select('id, nama, kelas, yatim').in('kelas', kelasArr));
    if (siswaRows.length === 0) return NextResponse.json({ items, siswa: [] });

    const siswaIds = siswaRows.map(s => s.id);
    const [pembayaranRows, sppRows] = await Promise.all([
      fetchAllRows('pembayaran', 'siswa_id, item_id, nominal, keterangan', q => q.in('siswa_id', siswaIds)),
      semuaBulan
        ? fetchAllRows('spp_bulanan', 'siswa_id, bulan, nominal', q => q.in('siswa_id', siswaIds).eq('tahun', tahunSpp))
        : fetchAllRows('spp_bulanan', 'siswa_id, nominal', q => q.in('siswa_id', siswaIds).eq('tahun', tahunSpp).eq('bulan', bulanSpp)),
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
        const targetSiswa = targetPerKelas[s.kelas] ?? targetContoh;
        return {
          nama: s.nama,
          kelas: s.kelas,
          values: Object.fromEntries(items.map(it => {
            if (typeof it.kolom === 'string' && it.kolom.startsWith('spp-')) {
              const bulanKe = Number(it.kolom.slice(4));
              return [it.kolom, s.yatim ? targetSiswa : (sppBySiswa[s.id]?.[bulanKe] ?? '')];
            }
            if (it.kolom === 'spp') return [it.kolom, s.yatim ? targetSiswa : (sppBySiswa[s.id] ?? '')];
            return [it.kolom, pay[it.kolom]?.nominal ?? ''];
          })),
          keterangan: Object.fromEntries(items.map(it => [it.kolom, pay[it.kolom]?.keterangan || ''])),
        };
      })
      .sort((a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama, 'id'));

    return NextResponse.json({ items, siswa });
  } catch (e) {
    console.error('GET /api/kelas-detail gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil detail kelas: ' + e.message }, { status: 500 });
  }
}
