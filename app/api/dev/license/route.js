import { NextResponse } from 'next/server';
import { getLicenseExpiry, setLicenseExpiry } from '@/lib/license';

// Endpoint khusus developer — gerbangnya DEV_PASSCODE (env var), sama sekali gak terkait
// role admin/staf di sheet Users. Sekolah gak akan nemu ini kecuali dikasih tau URL + passcode-nya.
function cekPasscode(passcode) {
  return process.env.DEV_PASSCODE && passcode === process.env.DEV_PASSCODE;
}

export async function POST(req) {
  const { passcode } = await req.json();
  if (!cekPasscode(passcode)) {
    return NextResponse.json({ sukses: false, pesan: 'Passcode salah' }, { status: 401 });
  }
  try {
    const tanggalExpiry = await getLicenseExpiry();
    return NextResponse.json({ sukses: true, tanggalExpiry });
  } catch (e) {
    console.error('POST /api/dev/license gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil data lisensi: ' + e.message });
  }
}

export async function PUT(req) {
  const { passcode, tanggalExpiry } = await req.json();
  if (!cekPasscode(passcode)) {
    return NextResponse.json({ sukses: false, pesan: 'Passcode salah' }, { status: 401 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalExpiry)) {
    return NextResponse.json({ sukses: false, pesan: 'Format tanggal harus YYYY-MM-DD' });
  }
  try {
    await setLicenseExpiry(tanggalExpiry);
    return NextResponse.json({ sukses: true, pesan: `Masa aktif diupdate jadi ${tanggalExpiry}` });
  } catch (e) {
    console.error('PUT /api/dev/license gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal update lisensi: ' + e.message });
  }
}
