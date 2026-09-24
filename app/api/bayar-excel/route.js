import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { db, throwIfError, fetchAllRows, KELAS_LIST } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { DEMO_MODE } from '@/lib/demoData';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A7A4C' } };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F3EC' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const CURRENCY = '#,##0';
const THIN = { style: 'thin', color: { argb: 'FFB9D4C4' } };
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN };

// Excel rapi (header hijau, kolom Rp diformat ribuan, baris TOTAL) buat panel "Bayar" —
// reuse gaya visual yang sama kayak Laporan Bulanan, bukan CSV polos.
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const tanggal = params.get('tanggal') || tanggalJakarta().tanggal;
  const itemFilter = params.get('item') || '';

  let rows = [];
  if (DEMO_MODE) {
    rows = [{ kelas: 'KELAS 1', siswa: 'Contoh Siswa', item: 'SPP', nominal: 100000 }];
  } else {
    const kelasList = session.role === 'guru' && session.kelas ? [session.kelas] : KELAS_LIST;
    const [itemRows, siswaRows] = await Promise.all([
      db().from('item_pembayaran').select('id, nama').then(r => throwIfError(r)),
      db().from('siswa').select('id, nama, kelas').in('kelas', kelasList).then(r => throwIfError(r)),
    ]);
    const itemMap = Object.fromEntries(itemRows.map(it => [it.id, it.nama]));
    const siswaMap = Object.fromEntries(siswaRows.map(s => [s.id, s]));
    const siswaIds = siswaRows.map(s => s.id);

    const pembayaranRows = siswaIds.length
      ? await fetchAllRows('pembayaran', 'siswa_id, item_id, nominal, keterangan, terakhir_diisi', q => q.in('siswa_id', siswaIds))
      : [];

    pembayaranRows.forEach(p => {
      if (!p.terakhir_diisi) return;
      if (tanggal !== 'semua' && tanggalJakarta(new Date(p.terakhir_diisi)).tanggal !== tanggal) return;
      const s = siswaMap[p.siswa_id];
      const namaItem = itemMap[p.item_id];
      if (!s || !namaItem) return;
      if (itemFilter && namaItem !== itemFilter) return;
      rows.push({ kelas: s.kelas, siswa: s.nama, item: namaItem, nominal: Number(p.nominal) || 0 });
    });
    rows.sort((a, b) => a.kelas.localeCompare(b.kelas) || a.siswa.localeCompare(b.siswa));
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Bayar');
  ws.columns = [
    { header: 'Kelas', key: 'kelas', width: 12 },
    { header: 'Siswa', key: 'siswa', width: 30 },
    { header: 'Item', key: 'item', width: 20 },
    { header: 'Rp', key: 'nominal', width: 16 },
  ];
  const headerRow = ws.getRow(1);
  headerRow.eachCell(c => { c.fill = HEADER_FILL; c.font = HEADER_FONT; c.alignment = { vertical: 'middle', horizontal: 'center' }; c.border = BORDER_ALL; });

  rows.forEach(r => {
    const row = ws.addRow(r);
    row.getCell(4).numFmt = CURRENCY;
    row.eachCell(c => { c.border = BORDER_ALL; });
  });

  const total = rows.reduce((s, r) => s + r.nominal, 0);
  const totalRow = ws.addRow({ kelas: '', siswa: '', item: 'TOTAL', nominal: total });
  totalRow.eachCell(c => { c.font = { bold: true }; c.fill = TOTAL_FILL; c.border = BORDER_ALL; });
  totalRow.getCell(4).numFmt = CURRENCY;

  const buffer = await wb.xlsx.writeBuffer();
  const namaFile = `bayar-${itemFilter || 'semua'}-${tanggal === 'semua' ? 'semua-tanggal' : tanggal.replace(/\//g, '-')}.xlsx`;
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${namaFile}"`,
    },
  });
}
