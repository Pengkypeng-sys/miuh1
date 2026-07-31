import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST, findSiswaId } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/log';
import { DEMO_MODE } from '@/lib/demoData';

// Pindahin nominal dari 1 item ke item lain buat siswa yang sama — buat koreksi salah pilih item pas input.
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Session habis, silakan login ulang', sessionExpired: true });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa memindahkan pembayaran' });

  const { kelas, siswa, dariKolom, keKolom, nominal } = await req.json();
  if (!dariKolom || !keKolom || String(dariKolom) === String(keKolom)) {
    return NextResponse.json({ sukses: false, pesan: 'Pilih item tujuan yang beda dari item asal' });
  }

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: 'Pembayaran dipindahkan (demo, gak tersimpan)' });
  if (!KELAS_LIST.includes(kelas)) return NextResponse.json({ sukses: false, pesan: 'Kelas gak valid' });

  try {
    const siswaId = await findSiswaId(kelas, siswa);
    if (!siswaId) return NextResponse.json({ sukses: false, pesan: 'Nama siswa tidak ditemukan' });

    const [dariItem, keItem] = await Promise.all([
      db().from('item_pembayaran').select('nama').eq('id', dariKolom).maybeSingle().then(r => throwIfError(r)),
      db().from('item_pembayaran').select('nama').eq('id', keKolom).maybeSingle().then(r => throwIfError(r)),
    ]);
    const dariNama = dariItem?.nama || '';
    const keNama = keItem?.nama || '';

    const [dariRow, keRow] = await Promise.all([
      db().from('pembayaran').select('nominal').eq('siswa_id', siswaId).eq('item_id', dariKolom).maybeSingle().then(r => throwIfError(r)),
      db().from('pembayaran').select('nominal').eq('siswa_id', siswaId).eq('item_id', keKolom).maybeSingle().then(r => throwIfError(r)),
    ]);
    const dariLama = dariRow?.nominal || 0;
    const keLama = keRow?.nominal || 0;

    let pindah = Number(nominal);
    if (!pindah || pindah <= 0) pindah = dariLama;
    if (pindah > dariLama) pindah = dariLama;

    const dariBaru = dariLama - pindah;
    const keBaru = keLama + pindah;
    const now = new Date().toISOString();

    await Promise.all([
      db().from('pembayaran').upsert({ siswa_id: siswaId, item_id: dariKolom, nominal: dariBaru, terakhir_diisi: now }, { onConflict: 'siswa_id,item_id' }),
      db().from('pembayaran').upsert({ siswa_id: siswaId, item_id: keKolom, nominal: keBaru, terakhir_diisi: now }, { onConflict: 'siswa_id,item_id' }),
    ]);

    await logAction(session.username, 'pindah-pembayaran', kelas, siswa, `${dariNama} → ${keNama}`, dariLama, keBaru);

    return NextResponse.json({
      sukses: true,
      pesan: `Rp ${pindah.toLocaleString('id-ID')} dipindah dari "${dariNama}" ke "${keNama}"`,
      dariKolom, keKolom, dariBaru, keBaru,
    });
  } catch (e) {
    console.error('POST /api/payment/pindah gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal pindah pembayaran: ' + e.message });
  }
}
