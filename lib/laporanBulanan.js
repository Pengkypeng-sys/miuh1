import ExcelJS from 'exceljs';
import { db, throwIfError, KELAS_LIST } from './db';
import { tanggalJakarta } from './log';

const ROMAWI = { 'KELAS 1': 'I', 'KELAS 2': 'II', 'KELAS 3': 'III', 'KELAS 4': 'IV', 'KELAS 5': 'V', 'KELAS 6': 'VI' };
const NAMA_BULAN = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A7A4C' } };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F3EC' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const BOLD = { bold: true };
const CURRENCY = '#,##0';
const THIN = { style: 'thin', color: { argb: 'FFB9D4C4' } };
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function border(row, kolomTerakhir) {
  for (let i = 1; i <= kolomTerakhir; i++) row.getCell(i).border = BORDER_ALL;
}
function styleHeaderRow(row, kolomTerakhir) {
  row.eachCell(c => { c.fill = HEADER_FILL; c.font = HEADER_FONT; c.alignment = { vertical: 'middle', horizontal: 'center' }; });
  border(row, kolomTerakhir);
}
function styleJudul(ws, kolomTerakhir, teks) {
  ws.mergeCells(1, 1, 1, kolomTerakhir);
  const cell = ws.getCell(1, 1);
  cell.value = teks;
  cell.font = { bold: true, size: 13 };
  cell.alignment = { horizontal: 'center' };
  ws.getRow(1).height = 22;
}

// Laporan bulanan ala format Excel manual sekolah — 3 sheet: PENGELUARAN (list harian),
// SPP & BUKU (rekap pemasukan per kelas vs total pengeluaran bulan itu).
export async function buatLaporanBulanan(tahun, bulan) {
  const bulanStr = String(bulan).padStart(2, '0');
  const awal = `${tahun}-${bulanStr}-01`;
  const akhirDate = new Date(tahun, bulan, 0); // hari terakhir bulan itu
  const akhir = `${tahun}-${bulanStr}-${String(akhirDate.getDate()).padStart(2, '0')}`;

  const [pengeluaranRows, logRows] = await Promise.all([
    db().from('pengeluaran').select('tanggal, keterangan, nominal').gte('tanggal', awal).lte('tanggal', akhir).order('tanggal').then(r => throwIfError(r)),
    db().from('log_aktivitas').select('waktu, kelas, item, lama, baru').then(r => throwIfError(r)),
  ]);

  const totalPengeluaran = pengeluaranRows.reduce((s, r) => s + (Number(r.nominal) || 0), 0);

  // Pemasukan per kelas per item — filter log_aktivitas ke bulan ini pake Jakarta timezone (sama pola kayak hitungTrenBulanan)
  const masukPerKelas = {}; // kelas -> { SPP: total, BUKU: total }
  KELAS_LIST.forEach(k => { masukPerKelas[k] = { SPP: 0, BUKU: 0 }; });
  logRows.forEach(r => {
    if (!r.waktu || !r.kelas || !r.item) return;
    const delta = (Number(r.baru) || 0) - (Number(r.lama) || 0);
    if (delta <= 0) return;
    const { tanggal } = tanggalJakarta(new Date(r.waktu));
    const [dd, mm, yyyy] = tanggal.split('/');
    if (`${yyyy}-${mm}` !== `${tahun}-${bulanStr}`) return;
    if (!masukPerKelas[r.kelas]) return;
    if (r.item.startsWith('SPP')) masukPerKelas[r.kelas].SPP += delta;
    else if (r.item.startsWith('BUKU')) masukPerKelas[r.kelas].BUKU += delta;
  });

  const wb = new ExcelJS.Workbook();
  const judulBulan = `${NAMA_BULAN[bulan - 1]} ${tahun}`;

  // ===== Sheet PENGELUARAN =====
  const wsP = wb.addWorksheet('PENGELUARAN');
  wsP.columns = [{ width: 14 }, { width: 40 }, { width: 18 }];
  wsP.addRow([]); // baris 1 diisi styleJudul
  styleJudul(wsP, 3, judulBulan);
  const headerP = wsP.addRow(['TANGGAL', 'KETERANGAN', 'PENGELUARAN']);
  styleHeaderRow(headerP, 3);

  let tglSebelumnya = null;
  pengeluaranRows.forEach(r => {
    const sama = r.tanggal === tglSebelumnya;
    const row = wsP.addRow([sama ? null : new Date(r.tanggal), r.keterangan, Number(r.nominal) || 0]);
    if (!sama) row.getCell(1).numFmt = 'dd/mm/yyyy';
    row.getCell(3).numFmt = CURRENCY;
    row.getCell(3).alignment = { horizontal: 'right' };
    border(row, 3);
    tglSebelumnya = r.tanggal;
  });
  if (pengeluaranRows.length === 0) {
    const row = wsP.addRow(['', 'Belum ada pengeluaran bulan ini', '']);
    row.getCell(2).font = { italic: true, color: { argb: 'FF888888' } };
    border(row, 3);
  }
  const totalRowP = wsP.addRow(['', 'TOTAL', totalPengeluaran]);
  totalRowP.font = BOLD;
  totalRowP.getCell(3).numFmt = CURRENCY;
  totalRowP.getCell(3).alignment = { horizontal: 'right' };
  totalRowP.eachCell(c => { c.fill = TOTAL_FILL; });
  border(totalRowP, 3);
  wsP.views = [{ state: 'frozen', ySplit: 2 }];

  // ===== Sheet SPP & BUKU (sama struktur, beda item) =====
  for (const [namaSheet, key] of [['SPP', 'SPP'], ['BUKU', 'BUKU']]) {
    const ws = wb.addWorksheet(namaSheet);
    ws.columns = [{ width: 14 }, { width: 18 }, { width: 18 }];
    ws.addRow([]);
    styleJudul(ws, 3, judulBulan);
    const h1 = ws.addRow(['KELAS', 'PEMASUKAN', 'PENGELUARAN']);
    styleHeaderRow(h1, 3);

    let totalMasuk = 0;
    KELAS_LIST.forEach(kelas => {
      const nominal = masukPerKelas[kelas][key];
      totalMasuk += nominal;
      const row = ws.addRow([ROMAWI[kelas], nominal]);
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).numFmt = CURRENCY;
      row.getCell(2).alignment = { horizontal: 'right' };
      border(row, 3);
    });

    const totalRow = ws.addRow(['TOTAL', totalMasuk, totalPengeluaran]);
    totalRow.font = BOLD;
    totalRow.getCell(1).alignment = { horizontal: 'center' };
    totalRow.getCell(2).numFmt = CURRENCY;
    totalRow.getCell(2).alignment = { horizontal: 'right' };
    totalRow.getCell(3).numFmt = CURRENCY;
    totalRow.getCell(3).alignment = { horizontal: 'right' };
    totalRow.eachCell(c => { c.fill = TOTAL_FILL; });
    border(totalRow, 3);

    const selisihRow = ws.addRow(['SELISIH', totalMasuk - totalPengeluaran]);
    selisihRow.font = BOLD;
    selisihRow.getCell(1).alignment = { horizontal: 'center' };
    selisihRow.getCell(2).numFmt = CURRENCY;
    selisihRow.getCell(2).alignment = { horizontal: 'right' };
    selisihRow.eachCell(c => { c.fill = TOTAL_FILL; });
    border(selisihRow, 2);
    ws.views = [{ state: 'frozen', ySplit: 2 }];
  }

  return wb;
}
