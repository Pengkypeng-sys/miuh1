import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST, findSiswaId } from '@/lib/db';
import { getSession, kelasDiizinkan } from '@/lib/auth';
import { logAction } from '@/lib/log';
import { DEMO_MODE } from '@/lib/demoData';
import { hitungStatus } from '@/lib/target';

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Session habis, silakan login ulang', sessionExpired: true });

  if (session.role === 'guru') return NextResponse.json({ sukses: false, pesan: 'Akun ini cuma bisa liat, gak bisa input pembayaran' });

  const { kelas, siswa, kolom, nominal, metode, mode, keterangan } = await req.json();
  if (DEMO_MODE) {
    let v = Number(nominal);
    if (v > 0 && v < 1000) v = v * 1000;
    return NextResponse.json({ sukses: true, pesan: `Berhasil: ${siswa} - Rp ${v.toLocaleString('id-ID')} (demo, gak tersimpan)` });
  }

  let angka = Number(nominal);
  if (!Number.isFinite(angka) || angka < 0) return NextResponse.json({ sukses: false, pesan: 'Nominal gak valid' });
  if (!KELAS_LIST.includes(kelas)) return NextResponse.json({ sukses: false, pesan: 'Kelas gak valid' });
  if (!kelasDiizinkan(session, kelas)) return NextResponse.json({ sukses: false, pesan: 'Gak bisa akses kelas ini' });

  try {
    const siswaId = await findSiswaId(kelas, siswa);
    if (!siswaId) return NextResponse.json({ sukses: false, pesan: 'Nama siswa tidak ditemukan' });

    const item = throwIfError(await db().from('item_pembayaran').select('nama, target').eq('id', kolom).maybeSingle());
    if (!item) return NextResponse.json({ sukses: false, pesan: 'Item pembayaran tidak ditemukan' });
    const itemName = item.nama;

    if (angka > 0 && angka < 1000) angka = angka * 1000;
    const isSet = mode === 'set';
    const now = new Date().toISOString();
    let totalBaru, oldValue;

    if (isSet) {
      // "set" = timpa nilai absolut (koreksi manual) — bukan operasi tambah, aman di-upsert biasa.
      const existing = throwIfError(await db().from('pembayaran').select('nominal').eq('siswa_id', siswaId).eq('item_id', kolom).maybeSingle());
      oldValue = existing?.nominal || 0;
      totalBaru = angka;
      throwIfError(await db().from('pembayaran').upsert(
        { siswa_id: siswaId, item_id: kolom, nominal: totalBaru, keterangan: keterangan || null, terakhir_diisi: now },
        { onConflict: 'siswa_id,item_id' }
      ));
    } else {
      // "tambah" = nambah ke nilai yang ada. Pake RPC atomic (nominal = nominal + delta di 1 statement SQL)
      // biar gak ada celah baca-hitung-tulis kalau 2 request nyerempet bareng (lost update).
      totalBaru = throwIfError(await db().rpc('increment_pembayaran', {
        p_siswa_id: siswaId, p_item_id: kolom, p_delta: angka, p_keterangan: keterangan || null, p_terakhir_diisi: now,
      }));
      oldValue = totalBaru - angka; // valid buat delta request ini sendiri, gak kepengaruh concurrent write lain
    }

    const status = hitungStatus(totalBaru, item.target);
    // Hindari label dobel kayak "BUKU (BUKU 2)" — kalau keterangan udah mulai sama nama item, tampilin keterangannya aja
    const itemLabel = keterangan
      ? (keterangan.toUpperCase().startsWith(itemName.toUpperCase()) ? keterangan : `${itemName} (${keterangan})`)
      : itemName;

    await logAction(session.username, isSet ? 'edit-langsung' : 'submit-pembayaran', kelas, siswa, itemLabel, oldValue, totalBaru, metode);
    return NextResponse.json({
      sukses: true,
      pesan: isSet
        ? `${itemLabel}: nilai dikoreksi jadi Rp ${totalBaru.toLocaleString('id-ID')} (${status === 'lunas' ? 'lunas' : status === 'cicil' ? 'masih nyicil' : 'belum bayar'})`
        : `${itemLabel}: setor Rp ${angka.toLocaleString('id-ID')} (total Rp ${totalBaru.toLocaleString('id-ID')}, ${status === 'lunas' ? 'lunas' : status === 'cicil' ? 'masih nyicil' : 'belum bayar'})`,
      status, total: totalBaru, item: itemLabel,
    });
  } catch (e) {
    console.error('POST /api/payment gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal simpan pembayaran: ' + e.message });
  }
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Session habis, silakan login ulang', sessionExpired: true });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa menghapus data' });

  const { kelas, siswa, kolom } = await req.json();
  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `Data pembayaran ${siswa} berhasil dihapus (demo, gak tersimpan)` });
  if (!KELAS_LIST.includes(kelas)) return NextResponse.json({ sukses: false, pesan: 'Kelas gak valid' });

  try {
    const siswaId = await findSiswaId(kelas, siswa);
    if (!siswaId) return NextResponse.json({ sukses: false, pesan: 'Nama siswa tidak ditemukan' });

    const item = throwIfError(await db().from('item_pembayaran').select('nama').eq('id', kolom).maybeSingle());
    const existing = throwIfError(await db().from('pembayaran').select('nominal').eq('siswa_id', siswaId).eq('item_id', kolom).maybeSingle());
    const oldValue = existing?.nominal ?? '';

    throwIfError(await db().from('pembayaran').delete().eq('siswa_id', siswaId).eq('item_id', kolom));

    await logAction(session.username, 'hapus-pembayaran', kelas, siswa, item?.nama || '', oldValue, '');
    return NextResponse.json({ sukses: true, pesan: `Data pembayaran ${siswa} berhasil dihapus` });
  } catch (e) {
    console.error('DELETE /api/payment gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal hapus pembayaran: ' + e.message });
  }
}
