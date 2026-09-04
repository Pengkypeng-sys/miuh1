import { NextResponse } from 'next/server';
import { db, throwIfError } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { BULAN_LIST } from '@/lib/format';
import { DEMO_MODE } from '@/lib/demoData';

// One-off: baca semua riwayat SPP dari Log Aktivitas, parse keterangan "Bulan X, Y" yang udah kesimpen
// di transaksi lama, isi ulang tabel spp_bulanan. SET (bukan tambah) — aman dijalanin ulang berkali-kali,
// hasilnya gak dobel walau dipencet 2x.
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin' }, { status: 403 });
  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: 'Backfill dijalankan (demo, gak tersimpan)' });

  try {
    const [logRows, siswaRows] = await Promise.all([
      db().from('log_aktivitas').select('waktu, kelas, siswa, item, lama, baru').then(r => throwIfError(r)),
      db().from('siswa').select('id, nama, kelas').then(r => throwIfError(r)),
    ]);

    const siswaIdMap = {}; // "kelas|nama" -> id
    siswaRows.forEach(s => { siswaIdMap[`${s.kelas}|${s.nama}`] = s.id; });

    const akumulasi = {}; // "siswaId-tahun-bulan" -> total
    let dilewati = 0;
    logRows.forEach(r => {
      if (!r.waktu || !r.kelas || !r.siswa || !r.item) return;
      const m = r.item.match(/^SPP \(Bulan (.+)\)$/);
      if (!m) return;
      const delta = (Number(r.baru) || 0) - (Number(r.lama) || 0);
      if (delta <= 0) return;
      const siswaId = siswaIdMap[`${r.kelas}|${r.siswa}`];
      if (!siswaId) { dilewati++; return; }

      const bulanValid = m[1].split(',').map(s => s.trim()).filter(b => BULAN_LIST.includes(b));
      if (bulanValid.length === 0) return;
      const nominalPerBulan = delta / bulanValid.length;
      const { tanggal } = tanggalJakarta(new Date(r.waktu));
      const tahun = Number(tanggal.split('/')[2]);

      bulanValid.forEach(b => {
        const bulanKe = BULAN_LIST.indexOf(b) + 1;
        const key = `${siswaId}-${tahun}-${bulanKe}`;
        akumulasi[key] = (akumulasi[key] || 0) + nominalPerBulan;
      });
    });

    const rows = Object.entries(akumulasi).map(([key, nominal]) => {
      const [siswaId, tahun, bulan] = key.split('-').map(Number);
      return { siswa_id: siswaId, tahun, bulan, nominal: Math.round(nominal), terakhir_diisi: new Date().toISOString() };
    });

    if (rows.length > 0) {
      throwIfError(await db().from('spp_bulanan').upsert(rows, { onConflict: 'siswa_id,tahun,bulan' }));
    }

    return NextResponse.json({ sukses: true, pesan: `Backfill selesai: ${rows.length} baris SPP bulanan diisi/diupdate` + (dilewati ? `, ${dilewati} transaksi dilewatin (siswa gak ketemu)` : '') });
  } catch (e) {
    console.error('POST /api/spp-bulanan/backfill gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal backfill: ' + e.message }, { status: 500 });
  }
}
