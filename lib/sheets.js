import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

function getClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

export async function getValues(range) {
  const sheets = getClient();
  // UNFORMATTED_VALUE wajib — default Sheets API balikin string berformat (contoh "50.000" pake titik ribuan),
  // yang bikin Number("50.000") kebaca 50 (titik dianggap desimal). Baca angka mentahnya, bukan tampilannya.
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range, valueRenderOption: 'UNFORMATTED_VALUE' });
  return res.data.values || [];
}

export async function setValues(range, values) {
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

// raw=true pake valueInputOption RAW — teks disimpan literal, gak di-autodeteksi/dikonversi Sheets
// (misal string tanggal "13/07/2026 12:05:32" jangan sampai auto-jadi serial date number)
export async function appendRow(sheetName, row, raw = false) {
  const sheets = getClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: raw ? 'RAW' : 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

export async function deleteRow(sheetName, rowIndex1Based) {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} tidak ditemukan`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex1Based - 1,
            endIndex: rowIndex1Based,
          },
        },
      }],
    },
  });
}

async function getSheetId(sheetsClient, sheetName) {
  const meta = await sheetsClient.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} tidak ditemukan`);
  return sheet.properties.sheetId;
}

// Set warna kuning "diisi hari ini" + format angka pada 1 sel (row/col 1-based)
export async function highlightCell(sheetName, row, col, { yellow = true, numberFormat = false } = {}) {
  const sheets = getClient();
  const sheetId = await getSheetId(sheets, sheetName);
  const cellFormat = {};
  const fields = [];
  if (yellow !== null) {
    cellFormat.backgroundColor = yellow
      ? { red: 1, green: 0.949, blue: 0.659 } // #FFF2A8
      : { red: 1, green: 1, blue: 1 };
    fields.push('userEnteredFormat.backgroundColor');
  }
  if (numberFormat) {
    cellFormat.numberFormat = { type: 'NUMBER', pattern: '#,##0' };
    fields.push('userEnteredFormat.numberFormat');
  }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        repeatCell: {
          range: { sheetId, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: col - 1, endColumnIndex: col },
          cell: { userEnteredFormat: cellFormat },
          fields: fields.join(','),
        },
      }],
    },
  });
}

export function colToLetter(col) {
  let letter = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

// Cari kolom "Terakhir Diisi"; kalau belum ada, buat di kolom setelah lastCol
export async function getOrCreateTimestampColumn(sheetName) {
  const header = (await getValues(`${sheetName}!1:1`))[0] || [];
  const idx = header.indexOf('Terakhir Diisi');
  if (idx !== -1) return idx + 1;
  const newCol = header.length + 1;
  await setValues(`${sheetName}!${colToLetter(newCol)}1`, [['Terakhir Diisi']]);
  return newCol;
}

export async function getSheetTitles() {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return meta.data.sheets.map(s => s.properties.title);
}

export async function ensureLogSheet() {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === 'Log');
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: 'Log' } } }] },
  });
  await setValues('Log!A1:I1', [['Waktu', 'User', 'Aksi', 'Kelas', 'Siswa', 'Item', 'Nilai Lama', 'Nilai Baru', 'Metode']]);
}

export async function ensurePengeluaranSheet() {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === 'Pengeluaran');
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: 'Pengeluaran' } } }] },
  });
  await setValues('Pengeluaran!A1:D1', [['Tanggal', 'Keterangan', 'Nominal', 'Dicatat Oleh']]);
}

export const EXCLUDED_SHEETS = ['Users', 'Log', 'TargetHarga', 'Pengeluaran'];

const DEFAULT_TARGETS = {
  PPDB: 300000, BUKU: 150000, SPP: 700000, 'PTS 1': 50000, PAS: 100000,
  LKS: 100000, 'PTS 2': 50000, PAT: 100000, PENSI: 75000, 'STUDY TOUR': 250000,
};

// Sheet "TargetHarga": A=nama item, B=target nominal (dipakai buat deteksi lunas/cicil/belum)
export async function ensureTargetSheet() {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  if (meta.data.sheets.some(s => s.properties.title === 'TargetHarga')) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: 'TargetHarga' } } }] },
  });
  const rows = [['Item', 'Target'], ...Object.entries(DEFAULT_TARGETS)];
  await setValues(`TargetHarga!A1:B${rows.length}`, rows);
}

export async function getTargetMap() {
  await ensureTargetSheet();
  const rows = await getValues('TargetHarga!A2:B');
  const map = {};
  rows.forEach(([nama, target]) => { if (nama) map[nama] = Number(target) || 0; });
  return map;
}

// Tambah jenis pembayaran baru: sisipkan 1 kolom baru (sebelum "Terakhir Diisi") di semua sheet kelas,
// plus daftarin target harganya di TargetHarga.
export async function addPaymentItem(namaItem, target) {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const kelasSheets = meta.data.sheets.filter(s => !EXCLUDED_SHEETS.includes(s.properties.title));

  const posisi = [];
  for (const s of kelasSheets) {
    const header = (await getValues(`${s.properties.title}!1:1`))[0] || [];
    if (header.includes(namaItem)) throw new Error(`Item "${namaItem}" sudah ada di ${s.properties.title}`);
    const insertAt = header.indexOf('Terakhir Diisi') !== -1 ? header.indexOf('Terakhir Diisi') : header.length;
    posisi.push({ sheetId: s.properties.sheetId, title: s.properties.title, insertAt });
  }

  const requests = posisi.map(p => ({
    insertDimension: {
      range: { sheetId: p.sheetId, dimension: 'COLUMNS', startIndex: p.insertAt, endIndex: p.insertAt + 1 },
      inheritFromBefore: true,
    },
  }));
  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests } });
  }

  for (const p of posisi) {
    await setValues(`${p.title}!${colToLetter(p.insertAt + 1)}1`, [[namaItem]]);
  }

  await ensureTargetSheet();
  await appendRow('TargetHarga', [namaItem, Number(target) || 0]);
}

// Hapus jenis pembayaran: buang kolomnya dari semua sheet kelas + hapus dari TargetHarga.
// Menghapus kolom juga menghapus semua data pembayaran item itu (gak bisa dibalikin).
export async function deletePaymentItem(namaItem) {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const kelasSheets = meta.data.sheets.filter(s => !EXCLUDED_SHEETS.includes(s.properties.title));

  const requests = [];
  for (const s of kelasSheets) {
    const header = (await getValues(`${s.properties.title}!1:1`))[0] || [];
    const idx = header.indexOf(namaItem);
    if (idx === -1) continue;
    requests.push({
      deleteDimension: {
        range: { sheetId: s.properties.sheetId, dimension: 'COLUMNS', startIndex: idx, endIndex: idx + 1 },
      },
    });
  }
  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests } });
  }

  await ensureTargetSheet();
  const targetRows = await getValues('TargetHarga!A2:B');
  const rowIdx = targetRows.findIndex(r => r[0] === namaItem);
  if (rowIdx !== -1) await deleteRow('TargetHarga', rowIdx + 2);
}
