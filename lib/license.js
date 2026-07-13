import { getValues, setValues, getSheetTitles, SYSTEM_SPREADSHEET_ID } from './sheets';

// Fallback kalau sheet "Lisensi" belum ada / kosong — dipakai sekali doang pas pertama kali.
const DEFAULT_EXPIRY = '2026-08-13';
const PERINGATAN_H_MINUS = 7;

export async function getLicenseExpiry() {
  const sheets = await getSheetTitles(SYSTEM_SPREADSHEET_ID);
  if (!sheets.includes('Lisensi')) {
    await createLisensiSheet(DEFAULT_EXPIRY);
    return DEFAULT_EXPIRY;
  }
  const rows = await getValues('Lisensi!A2:B', SYSTEM_SPREADSHEET_ID);
  const row = rows.find(r => r[0] === 'LICENSE_EXPIRY');
  return row?.[1] || DEFAULT_EXPIRY;
}

async function createLisensiSheet(expiry) {
  const { google } = await import('googleapis');
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, null,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SYSTEM_SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: 'Lisensi' } } }] },
  });
  await setValues('Lisensi!A1:B2', [['Key', 'Value'], ['LICENSE_EXPIRY', expiry]], true, SYSTEM_SPREADSHEET_ID);
}

export async function setLicenseExpiry(newExpiry) {
  const sheets = await getSheetTitles(SYSTEM_SPREADSHEET_ID);
  if (!sheets.includes('Lisensi')) { await createLisensiSheet(newExpiry); return; }
  const rows = await getValues('Lisensi!A2:B', SYSTEM_SPREADSHEET_ID);
  const idx = rows.findIndex(r => r[0] === 'LICENSE_EXPIRY');
  const rowNum = idx === -1 ? rows.length + 2 : idx + 2;
  await setValues(`Lisensi!A${rowNum}:B${rowNum}`, [["LICENSE_EXPIRY", newExpiry]], true, SYSTEM_SPREADSHEET_ID);
}

export async function statusLisensi() {
  const tanggalExpiry = await getLicenseExpiry();
  const now = new Date();
  const expiry = new Date(`${tanggalExpiry}T23:59:59+07:00`);
  const msTersisa = expiry - now;
  const hariTersisa = Math.ceil(msTersisa / (1000 * 60 * 60 * 24));

  return {
    expired: msTersisa < 0,
    peringatan: hariTersisa <= PERINGATAN_H_MINUS && hariTersisa >= 0,
    hariTersisa: Math.max(hariTersisa, 0),
    tanggalExpiry,
  };
}
