import { NextResponse } from 'next/server';
import { getValues, setValues, colToLetter, highlightCell, getOrCreateTimestampColumn, getTargetMap } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/log';
import { DEMO_MODE } from '@/lib/demoData';
import { hitungStatus } from '@/lib/target';

async function findRow(kelas, siswa) {
  const names = (await getValues(`${kelas}!A2:A`)).map(r => r[0]);
  const idx = names.indexOf(siswa);
  return idx === -1 ? -1 : idx + 2;
}

const todayJakarta = () => new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('/');

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const kelas = params.get('kelas'), siswa = params.get('siswa'), kolom = Number(params.get('kolom'));
  if (DEMO_MODE) return NextResponse.json(Math.random() > 0.5 ? 70000 : '');

  const row = await findRow(kelas, siswa);
  if (row === -1) return NextResponse.json('');

  const val = (await getValues(`${kelas}!${colToLetter(kolom)}${row}`))[0]?.[0] ?? '';
  return NextResponse.json(val);
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Session habis, silakan login ulang', sessionExpired: true });

  const { kelas, siswa, kolom, nominal, metode, mode } = await req.json();
  if (DEMO_MODE) {
    let v = Number(nominal);
    if (v > 0 && v < 1000) v = v * 1000;
    return NextResponse.json({ sukses: true, pesan: `Berhasil: ${siswa} - Rp ${v.toLocaleString('id-ID')} (demo, gak tersimpan)` });
  }

  const row = await findRow(kelas, siswa);
  if (row === -1) return NextResponse.json({ sukses: false, pesan: 'Nama siswa tidak ditemukan' });

  const itemName = (await getValues(`${kelas}!${colToLetter(kolom)}1`))[0]?.[0] || '';
  const oldValue = Number((await getValues(`${kelas}!${colToLetter(kolom)}${row}`))[0]?.[0]) || 0;

  let angka = Number(nominal);
  if (angka > 0 && angka < 1000) angka = angka * 1000;
  const isSet = mode === 'set';
  const totalBaru = isSet ? angka : oldValue + angka;

  await setValues(`${kelas}!${colToLetter(kolom)}${row}`, [[totalBaru]]);
  await highlightCell(kelas, row, kolom, { yellow: true, numberFormat: true });

  const tsCol = await getOrCreateTimestampColumn(kelas);
  await setValues(`${kelas}!${colToLetter(tsCol)}${row}`, [[todayJakarta()]]);

  const targetMap = await getTargetMap();
  const status = hitungStatus(totalBaru, targetMap[itemName]);

  await logAction(session.username, isSet ? 'edit-langsung' : 'submit-pembayaran', kelas, siswa, itemName, oldValue, totalBaru, metode);
  return NextResponse.json({
    sukses: true,
    pesan: isSet
      ? `${itemName}: nilai dikoreksi jadi Rp ${totalBaru.toLocaleString('id-ID')} (${status === 'lunas' ? 'lunas' : status === 'cicil' ? 'masih nyicil' : 'belum bayar'})`
      : `${itemName}: setor Rp ${angka.toLocaleString('id-ID')} (total Rp ${totalBaru.toLocaleString('id-ID')}, ${status === 'lunas' ? 'lunas' : status === 'cicil' ? 'masih nyicil' : 'belum bayar'})`,
    status, total: totalBaru, item: itemName,
  });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Session habis, silakan login ulang', sessionExpired: true });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa menghapus data' });

  const { kelas, siswa, kolom } = await req.json();
  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `Data pembayaran ${siswa} berhasil dihapus (demo, gak tersimpan)` });

  const row = await findRow(kelas, siswa);
  if (row === -1) return NextResponse.json({ sukses: false, pesan: 'Nama siswa tidak ditemukan' });

  const itemName = (await getValues(`${kelas}!${colToLetter(kolom)}1`))[0]?.[0] || '';
  const oldValue = (await getValues(`${kelas}!${colToLetter(kolom)}${row}`))[0]?.[0] ?? '';

  await setValues(`${kelas}!${colToLetter(kolom)}${row}`, [['']]);
  await highlightCell(kelas, row, kolom, { yellow: false });

  await logAction(session.username, 'hapus-pembayaran', kelas, siswa, itemName, oldValue, '');
  return NextResponse.json({ sukses: true, pesan: `Data pembayaran ${siswa} berhasil dihapus` });
}
