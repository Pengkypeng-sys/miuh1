import { NextResponse } from 'next/server';
import { getValues, appendRow, deleteRow, withLock, isKelasValid } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/log';
import { DEMO_MODE, DEMO_SISWA } from '@/lib/demoData';

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const kelas = new URL(req.url).searchParams.get('kelas');
  if (DEMO_MODE) return NextResponse.json((DEMO_SISWA[kelas] || ['Contoh Siswa 1', 'Contoh Siswa 2']).sort((a, b) => a.localeCompare(b, 'id')));
  if (!(await isKelasValid(kelas))) return NextResponse.json([]);

  try {
    const data = await getValues(`${kelas}!A2:A`);
    return NextResponse.json(data.map(r => r[0]).filter(Boolean).sort((a, b) => a.localeCompare(b, 'id')));
  } catch (e) {
    console.error('GET /api/siswa gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil data siswa: ' + e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa mengelola siswa' });

  const { kelas, nama } = await req.json();
  if (!nama || !nama.trim()) return NextResponse.json({ sukses: false, pesan: 'Nama tidak boleh kosong' });
  const namaFinal = nama.trim().toUpperCase();

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `${namaFinal} berhasil ditambahkan ke ${kelas} (demo, gak tersimpan)` });
  if (!(await isKelasValid(kelas))) return NextResponse.json({ sukses: false, pesan: 'Kelas gak valid' });

  try {
    // Lock per kelas — cegah 2 request tambah-siswa bareng (klik dobel/refresh cepat) lolos
    // validasi nama-udah-ada bersamaan terus sama-sama nambah baris duplikat.
    const result = await withLock(`siswa-${kelas}`, async () => {
      const existing = (await getValues(`${kelas}!A2:A`)).map(r => r[0]);
      if (existing.includes(namaFinal)) return { sukses: false, pesan: 'Nama siswa sudah ada di kelas ini' };

      const header = (await getValues(`${kelas}!1:1`))[0] || [];
      const row = header[1] === 'Angkatan' ? [namaFinal, new Date().getFullYear()] : [namaFinal];
      await appendRow(kelas, row);
      return { sukses: true, pesan: `${namaFinal} berhasil ditambahkan ke ${kelas}` };
    });

    if (result.sukses) await logAction(session.username, 'tambah-siswa', kelas, namaFinal, '', '', '');
    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/siswa gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal tambah siswa: ' + e.message });
  }
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa mengelola siswa' });

  const { kelas, nama } = await req.json();
  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `${nama} berhasil dihapus (demo, gak tersimpan)` });
  if (!(await isKelasValid(kelas))) return NextResponse.json({ sukses: false, pesan: 'Kelas gak valid' });

  try {
    const names = (await getValues(`${kelas}!A2:A`)).map(r => r[0]);
    const idx = names.indexOf(nama);
    if (idx === -1) return NextResponse.json({ sukses: false, pesan: 'Siswa tidak ditemukan' });

    await deleteRow(kelas, idx + 2);
    await logAction(session.username, 'hapus-siswa', kelas, nama, '', '', '');
    return NextResponse.json({ sukses: true, pesan: `${nama} berhasil dihapus` });
  } catch (e) {
    console.error('DELETE /api/siswa gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal hapus siswa: ' + e.message });
  }
}
