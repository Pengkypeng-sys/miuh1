import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST, findSiswaId, targetSppKelas } from '@/lib/db';
import { getSession, kelasDiizinkan } from '@/lib/auth';
import { tanggalJakarta } from '@/lib/log';
import { BULAN_LIST } from '@/lib/format';
import { DEMO_MODE } from '@/lib/demoData';

// Status SPP per bulan buat 1 siswa — dipake buat nentuin bulan mana yang udah Lunas (dikunci) di form Bayar.
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const kelas = params.get('kelas');
  const siswa = params.get('siswa');
  const tahun = Number(params.get('tahun')) || Number(tanggalJakarta().tanggal.split('/')[2]);
  if (!KELAS_LIST.includes(kelas) || !siswa) return NextResponse.json({ perBulan: {}, target: 0 });
  if (!kelasDiizinkan(session, kelas)) return NextResponse.json({ perBulan: {}, target: 0 });
  if (DEMO_MODE) return NextResponse.json({ perBulan: {}, target: 70000 });

  try {
    const siswaRow = throwIfError(await db().from('siswa').select('id, yatim').eq('kelas', kelas).eq('nama', siswa).maybeSingle());
    if (!siswaRow) return NextResponse.json({ perBulan: {}, target: 0 });

    const target = await targetSppKelas(kelas);
    // Siswa yatim gratis SPP — semua bulan dianggap lunas tanpa nunggu setoran beneran.
    if (siswaRow.yatim) {
      const perBulan = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, target]));
      return NextResponse.json({ perBulan, target, yatim: true });
    }

    const rows = await db().from('spp_bulanan').select('bulan, nominal').eq('siswa_id', siswaRow.id).eq('tahun', tahun).then(r => throwIfError(r));

    const perBulan = Object.fromEntries(rows.map(r => [r.bulan, Number(r.nominal) || 0]));
    return NextResponse.json({ perBulan, target });
  } catch (e) {
    console.error('GET /api/spp-bulanan gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil status SPP bulanan: ' + e.message }, { status: 500 });
  }
}

// Catat setoran SPP ke bulan-bulan yang dicentang, dibagi rata dari nominal totalnya.
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Session habis, silakan login ulang', sessionExpired: true });
  if (session.role === 'guru') return NextResponse.json({ sukses: false, pesan: 'Akun ini cuma bisa liat, gak bisa input pembayaran' });

  const { kelas, siswa, bulanList, nominal, tahun } = await req.json();
  if (DEMO_MODE) return NextResponse.json({ sukses: true });
  if (!KELAS_LIST.includes(kelas)) return NextResponse.json({ sukses: false, pesan: 'Kelas gak valid' });
  if (!kelasDiizinkan(session, kelas)) return NextResponse.json({ sukses: false, pesan: 'Gak bisa akses kelas ini' });
  if (!Array.isArray(bulanList) || bulanList.length === 0) return NextResponse.json({ sukses: false, pesan: 'Pilih minimal 1 bulan' });

  const totalNominal = Number(nominal);
  if (!Number.isFinite(totalNominal) || totalNominal <= 0) return NextResponse.json({ sukses: false, pesan: 'Nominal gak valid' });

  try {
    const siswaId = await findSiswaId(kelas, siswa);
    if (!siswaId) return NextResponse.json({ sukses: false, pesan: 'Nama siswa tidak ditemukan' });

    const tahunPakai = Number(tahun) || Number(tanggalJakarta().tanggal.split('/')[2]);
    const now = new Date().toISOString();
    const nominalPerBulan = Math.round(totalNominal / bulanList.length);

    for (const namaBulan of bulanList) {
      const bulanKe = BULAN_LIST.indexOf(namaBulan) + 1;
      if (bulanKe < 1) continue;
      await db().rpc('increment_spp_bulanan', { p_siswa_id: siswaId, p_tahun: tahunPakai, p_bulan: bulanKe, p_delta: nominalPerBulan, p_terakhir_diisi: now });
    }

    return NextResponse.json({ sukses: true });
  } catch (e) {
    console.error('POST /api/spp-bulanan gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal catat SPP bulanan: ' + e.message });
  }
}
