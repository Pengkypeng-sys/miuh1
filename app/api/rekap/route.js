import { NextResponse } from 'next/server';
import { getValues, getSheetTitles, EXCLUDED_SHEETS, getTargetMap, getColumnLabels, colToLetter } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { DEMO_MODE, DEMO_REKAP } from '@/lib/demoData';
import { hitungStatus } from '@/lib/target';

const VARIAN_ITEMS = ['PPDB', 'BUKU']; // item yang dipecah per Gel./Kelas Buku waktu ditampilin

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  if (DEMO_MODE) return NextResponse.json(DEMO_REKAP);

  const kelasFilter = new URL(req.url).searchParams.get('kelas'); // null = semua kelas
  const today = tanggalJakarta().tanggal;
  const titles = (await getSheetTitles()).filter(t => !EXCLUDED_SHEETS.includes(t) && (!kelasFilter || t === kelasFilter));
  const targetMap = await getTargetMap();

  const itemMap = {}; // kolom -> {kolom, nama, terisi, nominal}
  const perKelas = [];
  const bayarHariIni = [];

  for (const kelas of titles) {
    const rows = await getValues(`${kelas}!A1:Z`);
    if (rows.length < 1) { perKelas.push({ kelas, totalSiswa: 0, lunasCount: 0, persenLunas: 0 }); continue; }

    const header = rows[0];
    const tsColIdx = header.indexOf('Terakhir Diisi'); // 0-based, -1 kalau belum ada
    const angkatanIdx = header.indexOf('Angkatan');
    const itemColStartIdx = angkatanIdx !== -1 ? angkatanIdx + 1 : 1; // lewatin kolom Angkatan kalau ada
    const itemColEndIdx = tsColIdx !== -1 ? tsColIdx : header.length; // exclusive, 0-based

    header.forEach((nama, i) => {
      if (i < itemColStartIdx || i >= itemColEndIdx) return;
      const kolom = i + 1;
      if (!itemMap[kolom]) itemMap[kolom] = { kolom, nama, terisi: 0, nominal: 0 };
    });

    const dataRows = rows.slice(1);
    const itemCols = Object.keys(itemMap).map(Number).filter(k => k - 1 >= itemColStartIdx && k - 1 < itemColEndIdx);
    let lunasCount = 0, totalSiswa = 0;

    // Kolom PPDB/BUKU di kelas ini — ambil label varian (Gel./Buku) 1 kali per kolom buat seluruh kelas.
    const varianCols = itemCols.filter(kolom => VARIAN_ITEMS.includes(header[kolom - 1]));
    const labelsByCol = {};
    for (const kolom of varianCols) {
      labelsByCol[kolom] = await getColumnLabels(kelas, colToLetter(kolom), dataRows.length);
      if (!itemMap[kolom].varian) itemMap[kolom].varian = {};
    }

    dataRows.forEach((r, ri) => {
      const nama = r[0];
      if (!nama) return;
      totalSiswa++;
      let semuaLunas = true;
      itemCols.forEach(kolom => {
        const val = r[kolom - 1];
        const nama2 = header[kolom - 1];
        const status = hitungStatus(val, targetMap[nama2]);
        if (val !== '' && val !== undefined && val !== null) {
          itemMap[kolom].terisi++;
          itemMap[kolom].nominal += Number(val) || 0;

          if (varianCols.includes(kolom)) {
            const label = labelsByCol[kolom][ri] || 'Tanpa keterangan';
            if (!itemMap[kolom].varian[label]) itemMap[kolom].varian[label] = { label, terisi: 0, nominal: 0 };
            itemMap[kolom].varian[label].terisi++;
            itemMap[kolom].varian[label].nominal += Number(val) || 0;
          }
        }
        if (status !== 'lunas') semuaLunas = false;
      });
      if (semuaLunas && itemCols.length > 0) lunasCount++;

      if (tsColIdx !== -1 && r[tsColIdx] === today) {
        itemCols.forEach(kolom => {
          const val = r[kolom - 1];
          if (val !== '' && val !== undefined && val !== null) {
            const label = varianCols.includes(kolom) ? labelsByCol[kolom][ri] : '';
            const item = label ? `${header[kolom - 1]} (${label})` : header[kolom - 1];
            bayarHariIni.push({ kelas, siswa: nama, item, nominal: Number(val) || 0 });
          }
        });
      }
    });

    perKelas.push({ kelas, totalSiswa, lunasCount, persenLunas: totalSiswa > 0 ? Math.round((lunasCount / totalSiswa) * 100) : 0 });
  }

  const perItem = Object.values(itemMap).map(it => ({
    ...it,
    varian: it.varian ? Object.values(it.varian).sort((a, b) => b.nominal - a.nominal) : undefined,
  })).sort((a, b) => a.kolom - b.kolom);

  return NextResponse.json({ perItem, perKelas, bayarHariIni, kelasFilter: kelasFilter || null });
}
