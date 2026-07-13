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
  const tanggalExpiry = await getLicenseExpiry();
  return NextResponse.json({ sukses: true, tanggalExpiry });
}

export async function PUT(req) {
  const { passcode, tanggalExpiry } = await req.json();
  if (!cekPasscode(passcode)) {
    return NextResponse.json({ sukses: false, pesan: 'Passcode salah' }, { status: 401 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalExpiry)) {
    return NextResponse.json({ sukses: false, pesan: 'Format tanggal harus YYYY-MM-DD' });
  }
  await setLicenseExpiry(tanggalExpiry);
  return NextResponse.json({ sukses: true, pesan: `Masa aktif diupdate jadi ${tanggalExpiry}` });
}
