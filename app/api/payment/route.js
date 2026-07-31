import { NextResponse } from 'next/server';
import { getValues, setValues, colToLetter, highlightCell, getOrCreateTimestampColumn, getTargetMap, findRow, isKelasValid } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { logAction, tanggalJakarta } from '@/lib/log';
import { DEMO_MODE } from '@/lib/demoData';
import { hitungStatus } from '@/lib/target';

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Session habis, silakan login ulang', sessionExpired: true });

  const { kelas, siswa, kolom, nominal, metode, mode, keterangan } = await req.json();
  if (DEMO_MODE) {
    let v = Number(nominal);
    if (v > 0 && v < 1000) v = v * 1000;
    return NextResponse.json({ sukses: true, pesan: `Berhasil: ${siswa} - Rp ${v.toLocaleString('id-ID')} (demo, gak tersimpan)` });
  }

  let angka = Number(nominal);
  if (!Number.isFinite(angka) || angka < 0) return NextResponse.json({ sukses: false, pesan: 'Nominal gak valid' });
  if (!(await isKelasValid(kelas))) return NextResponse.json({ sukses: false, pesan: 'Kelas gak valid' });

  try {
    const row = await findRow(kelas, siswa);
    if (row === -1) return NextResponse.json({ sukses: false, pesan: 'Nama siswa tidak ditemukan' });

    const itemName = (await getValues(`${kelas}!${colToLetter(kolom)}1`))[0]?.[0] || '';
    const oldValue = Number((await getValues(`${kelas}!${colToLetter(kolom)}${row}`))[0]?.[0]) || 0;

    if (angka > 0 && angka < 1000) angka = angka * 1000;
    const isSet = mode === 'set';
    const totalBaru = isSet ? angka : oldValue + angka;

    await setValues(`${kelas}!${colToLetter(kolom)}${row}`, [[totalBaru]]);
    const pattern = keterangan ? `#,##0" (${keterangan})"` : null;
    await highlightCell(kelas, row, kolom, { yellow: true, numberFormat: !pattern, numberFormatPattern: pattern });

    const tsCol = await getOrCreateTimestampColumn(kelas);
    await setValues(`${kelas}!${colToLetter(tsCol)}${row}`, [[tanggalJakarta().tanggal]], true);

    const targetMap = await getTargetMap();
    const status = hitungStatus(totalBaru, targetMap[itemName]);
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
  if (!(await isKelasValid(kelas))) return NextResponse.json({ sukses: false, pesan: 'Kelas gak valid' });

  try {
    const row = await findRow(kelas, siswa);
    if (row === -1) return NextResponse.json({ sukses: false, pesan: 'Nama siswa tidak ditemukan' });

    const itemName = (await getValues(`${kelas}!${colToLetter(kolom)}1`))[0]?.[0] || '';
    const oldValue = (await getValues(`${kelas}!${colToLetter(kolom)}${row}`))[0]?.[0] ?? '';

    await setValues(`${kelas}!${colToLetter(kolom)}${row}`, [['']]);
    await highlightCell(kelas, row, kolom, { yellow: false });

    await logAction(session.username, 'hapus-pembayaran', kelas, siswa, itemName, oldValue, '');
    return NextResponse.json({ sukses: true, pesan: `Data pembayaran ${siswa} berhasil dihapus` });
  } catch (e) {
    console.error('DELETE /api/payment gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal hapus pembayaran: ' + e.message });
  }
}
