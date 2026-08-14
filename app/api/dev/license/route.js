import { NextResponse } from 'next/server';
import { getLicenseExpiry, setLicenseExpiry } from '@/lib/license';

// Endpoint khusus developer — gerbangnya DEV_PASSCODE (env var), sama sekali gak terkait
// role admin/staf di sheet Users. Sekolah gak akan nemu ini kecuali dikasih tau URL + passcode-nya.
function cekPasscode(passcode) {
  return process.env.DEV_PASSCODE && passcode === process.env.DEV_PASSCODE;
}

// ponytail: lockout in-memory per instance, sama pola kayak /api/account/password —
// cukup nahan brute force kasar, bukan proteksi penuh (reset kalau serverless cold-start).
const MAX_PERCOBAAN = 5;
const WINDOW_MS = 10 * 60 * 1000;
const percobaanGagal = new Map(); // ip -> { count, mulai }

function terkunci(ip) {
  const gagal = percobaanGagal.get(ip);
  return gagal && gagal.count >= MAX_PERCOBAAN && Date.now() - gagal.mulai < WINDOW_MS;
}
function catatGagal(ip) {
  const now = Date.now();
  const prev = percobaanGagal.get(ip);
  percobaanGagal.set(ip, prev && now - prev.mulai < WINDOW_MS ? { count: prev.count + 1, mulai: prev.mulai } : { count: 1, mulai: now });
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (terkunci(ip)) return NextResponse.json({ sukses: false, pesan: 'Terlalu banyak percobaan salah, coba lagi 10 menit lagi' }, { status: 429 });

  const { passcode } = await req.json();
  if (!cekPasscode(passcode)) {
    catatGagal(ip);
    return NextResponse.json({ sukses: false, pesan: 'Passcode salah' }, { status: 401 });
  }
  percobaanGagal.delete(ip);
  try {
    const tanggalExpiry = await getLicenseExpiry();
    return NextResponse.json({ sukses: true, tanggalExpiry });
  } catch (e) {
    console.error('POST /api/dev/license gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil data lisensi: ' + e.message });
  }
}

export async function PUT(req) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (terkunci(ip)) return NextResponse.json({ sukses: false, pesan: 'Terlalu banyak percobaan salah, coba lagi 10 menit lagi' }, { status: 429 });

  const { passcode, tanggalExpiry } = await req.json();
  if (!cekPasscode(passcode)) {
    catatGagal(ip);
    return NextResponse.json({ sukses: false, pesan: 'Passcode salah' }, { status: 401 });
  }
  percobaanGagal.delete(ip);
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
