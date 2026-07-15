import { NextResponse } from 'next/server';
import { getValues, getTargetMap, addPaymentItem, deletePaymentItem, updatePaymentItemTarget } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { DEMO_MODE, DEMO_ITEMS } from '@/lib/demoData';

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  if (DEMO_MODE) return NextResponse.json(DEMO_ITEMS);

  const kelas = new URL(req.url).searchParams.get('kelas');
  const header = (await getValues(`${kelas}!1:1`))[0] || [];
  const targetMap = await getTargetMap();
  const items = header
    .map((nama, i) => ({ nama, kolom: i + 1, target: targetMap[nama] || 0 }))
    .filter(h => h.kolom >= 2 && h.nama && h.nama !== 'Terakhir Diisi' && h.nama !== 'Angkatan');
  return NextResponse.json(items);
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa menambah jenis pembayaran' });

  const { nama, target, kelas } = await req.json();
  if (!nama || !nama.trim()) return NextResponse.json({ sukses: false, pesan: 'Nama item tidak boleh kosong' });
  const namaFinal = nama.trim().toUpperCase();
  const kelasTerpilih = Array.isArray(kelas) && kelas.length ? kelas : null;

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `Jenis pembayaran "${namaFinal}" ditambahkan (demo, gak tersimpan)` });

  try {
    await addPaymentItem(namaFinal, target, kelasTerpilih);
  } catch (e) {
    return NextResponse.json({ sukses: false, pesan: e.message });
  }

  return NextResponse.json({ sukses: true, pesan: `Jenis pembayaran "${namaFinal}" berhasil ditambahkan ke semua kelas` });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa mengubah target harga' });

  const { nama, target } = await req.json();
  if (!nama) return NextResponse.json({ sukses: false, pesan: 'Nama item tidak boleh kosong' });

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `Target "${nama}" diubah (demo, gak tersimpan)` });

  try {
    await updatePaymentItemTarget(nama, Number(target) || 0);
  } catch (e) {
    return NextResponse.json({ sukses: false, pesan: e.message });
  }

  return NextResponse.json({ sukses: true, pesan: `Target harga "${nama}" berhasil diubah` });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa menghapus jenis pembayaran' });

  const { nama } = await req.json();
  if (!nama) return NextResponse.json({ sukses: false, pesan: 'Nama item tidak boleh kosong' });

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `Jenis pembayaran "${nama}" dihapus (demo, gak tersimpan)` });

  try {
    await deletePaymentItem(nama);
  } catch (e) {
    return NextResponse.json({ sukses: false, pesan: e.message });
  }

  return NextResponse.json({ sukses: true, pesan: `Jenis pembayaran "${nama}" dan semua data pembayarannya dihapus dari semua kelas` });
}
