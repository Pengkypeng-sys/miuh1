import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST } from '@/lib/db';
import { getSession } from '@/lib/auth';
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

  if (!KELAS_LIST.includes(kelas)) return NextResponse.json({ items: [], siswa: [] });

  try {
    const itemRows = throwIfError(await db().from('item_pembayaran').select('*').order('urutan'));
    const items = itemRows
      .filter(it => !it.kelas_scope || it.kelas_scope.includes(kelas))
      .map(it => ({ nama: it.nama, kolom: it.id, target: it.target }));

    const siswaRows = throwIfError(await db().from('siswa').select('id, nama').eq('kelas', kelas));
    if (siswaRows.length === 0) return NextResponse.json({ items, siswa: [] });

    const siswaIds = siswaRows.map(s => s.id);
    const pembayaranRows = throwIfError(
      await db().from('pembayaran').select('siswa_id, item_id, nominal, keterangan').in('siswa_id', siswaIds)
    );

    const bySiswa = {};
    pembayaranRows.forEach(p => {
      if (!bySiswa[p.siswa_id]) bySiswa[p.siswa_id] = {};
      bySiswa[p.siswa_id][p.item_id] = p;
    });

    const siswa = siswaRows
      .map(s => {
        const pay = bySiswa[s.id] || {};
        return {
          nama: s.nama,
          values: Object.fromEntries(items.map(it => [it.kolom, pay[it.kolom]?.nominal ?? ''])),
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
