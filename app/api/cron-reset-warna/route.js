import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { EXCLUDED_SHEETS } from '@/lib/sheets';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Dipanggil Vercel Cron tiap jam 00:00 WIB — hapus highlight kuning "baru dibayar" biar reset tiap hari.
export async function GET(req) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ sukses: false }, { status: 401 });

  const client = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, null,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth: client });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const kelasSheets = meta.data.sheets.filter(s => !EXCLUDED_SHEETS.includes(s.properties.title));

  const requests = kelasSheets.map(s => ({
    repeatCell: {
      range: { sheetId: s.properties.sheetId, startRowIndex: 1, endRowIndex: s.properties.gridProperties.rowCount, startColumnIndex: 1, endColumnIndex: s.properties.gridProperties.columnCount },
      cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } },
      fields: 'userEnteredFormat.backgroundColor',
    },
  }));
  if (requests.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests } });

  return NextResponse.json({ sukses: true, kelas: kelasSheets.length });
}
