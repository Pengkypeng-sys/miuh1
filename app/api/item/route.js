import { NextResponse } from 'next/server';
import { getValues, getItemMetaMap, addPaymentItem, deletePaymentItem, updatePaymentItemTarget, updateItemMeta, reorderItems, isKelasValid } from '@/lib/sheets';
import { getSession } from '@/lib/auth';
import { DEMO_MODE, DEMO_ITEMS } from '@/lib/demoData';

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  if (DEMO_MODE) return NextResponse.json(DEMO_ITEMS);

  const kelas = new URL(req.url).searchParams.get('kelas');
  if (!(await isKelasValid(kelas))) return NextResponse.json([]);

  const header = (await getValues(`${kelas}!1:1`))[0] || [];
  const metaMap = await getItemMetaMap();
  const items = header
    .map((nama, i) => ({
      nama, kolom: i + 1,
      target: metaMap[nama]?.target || 0,
      icon: metaMap[nama]?.icon || 'receipt',
      kategori: metaMap[nama]?.kategori || 'Lainnya',
      urutan: metaMap[nama]?.urutan ?? i,
    }))
    .filter(h => h.kolom >= 2 && h.nama && h.nama !== 'Terakhir Diisi' && h.nama !== 'Angkatan')
    .sort((a, b) => a.urutan - b.urutan);
  return NextResponse.json(items);
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa menambah jenis pembayaran' });

  const { nama, target, kelas, icon, kategori } = await req.json();
  if (!nama || !nama.trim()) return NextResponse.json({ sukses: false, pesan: 'Nama item tidak boleh kosong' });
  const namaFinal = nama.trim().toUpperCase();
  const kelasTerpilih = Array.isArray(kelas) && kelas.length ? kelas : null;

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `Jenis pembayaran "${namaFinal}" ditambahkan (demo, gak tersimpan)` });

  try {
    await addPaymentItem(namaFinal, target, kelasTerpilih, { icon, kategori });
  } catch (e) {
    return NextResponse.json({ sukses: false, pesan: e.message });
  }

  return NextResponse.json({ sukses: true, pesan: `Jenis pembayaran "${namaFinal}" berhasil ditambahkan ke semua kelas` });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa mengubah jenis pembayaran' });

  const { nama, target, icon, kategori } = await req.json();
  if (!nama) return NextResponse.json({ sukses: false, pesan: 'Nama item tidak boleh kosong' });

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `"${nama}" diubah (demo, gak tersimpan)` });

  try {
    if (target !== undefined) await updatePaymentItemTarget(nama, Number(target) || 0);
    if (icon || kategori) await updateItemMeta(nama, { icon, kategori });
  } catch (e) {
    return NextResponse.json({ sukses: false, pesan: e.message });
  }

  return NextResponse.json({ sukses: true, pesan: `"${nama}" berhasil diubah` });
}

// Simpan urutan tampil baru — body: { urutan: [nama1, nama2, ...] }
export async function PATCH(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa ubah urutan' });

  const { urutan } = await req.json();
  if (!Array.isArray(urutan) || !urutan.length) return NextResponse.json({ sukses: false, pesan: 'Urutan gak valid' });

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: 'Urutan diubah (demo, gak tersimpan)' });

  try {
    await reorderItems(urutan);
  } catch (e) {
    return NextResponse.json({ sukses: false, pesan: e.message });
  }

  return NextResponse.json({ sukses: true, pesan: 'Urutan berhasil disimpan' });
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
