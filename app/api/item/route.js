import { NextResponse } from 'next/server';
import { db, throwIfError, KELAS_LIST } from '@/lib/db';
import { getSession, kelasDiizinkan } from '@/lib/auth';
import { DEMO_MODE, DEMO_ITEMS } from '@/lib/demoData';

// Catatan kompatibilitas: field `kolom` di response dulu artinya nomor kolom sheet,
// sekarang cuma id baris item_pembayaran — frontend pakai ini sebagai id unik doang
// (key React, kunci itemValues/checkedItems), gak perlu tau isinya angka kolom asli lagi.

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });

  if (DEMO_MODE) return NextResponse.json(DEMO_ITEMS);

  const kelas = new URL(req.url).searchParams.get('kelas');
  if (!KELAS_LIST.includes(kelas) || !kelasDiizinkan(session, kelas)) return NextResponse.json([]);

  try {
    const rows = throwIfError(await db().from('item_pembayaran').select('*').order('urutan'));
    const items = rows
      .filter(it => !it.kelas_scope || it.kelas_scope.includes(kelas))
      .map(it => ({ nama: it.nama, kolom: it.id, target: it.target, icon: it.icon, kategori: it.kategori, urutan: it.urutan }));
    return NextResponse.json(items);
  } catch (e) {
    console.error('GET /api/item gagal:', e);
    return NextResponse.json({ sukses: false, pesan: 'Gagal ambil item: ' + e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa menambah jenis pembayaran' });

  const { nama, target, kelas, icon, kategori } = await req.json();
  if (!nama || !nama.trim()) return NextResponse.json({ sukses: false, pesan: 'Nama item tidak boleh kosong' });
  const namaFinal = nama.trim().toUpperCase();
  const kelasScope = Array.isArray(kelas) && kelas.length ? kelas : null;

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `Jenis pembayaran "${namaFinal}" ditambahkan (demo, gak tersimpan)` });

  try {
    const existing = throwIfError(await db().from('item_pembayaran').select('urutan').order('urutan', { ascending: false }).limit(1));
    const urutan = existing.length ? existing[0].urutan + 1 : 0;

    const { error } = await db().from('item_pembayaran').insert({
      nama: namaFinal, target: Number(target) || 0, icon: icon || 'receipt', kategori: kategori || 'Lainnya',
      urutan, kelas_scope: kelasScope,
    });
    if (error) {
      if (error.code === '23505') return NextResponse.json({ sukses: false, pesan: `Item "${namaFinal}" sudah ada` });
      throw new Error(error.message);
    }

    return NextResponse.json({ sukses: true, pesan: `Jenis pembayaran "${namaFinal}" berhasil ditambahkan ke semua kelas` });
  } catch (e) {
    console.error('POST /api/item gagal:', e);
    return NextResponse.json({ sukses: false, pesan: e.message });
  }
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa mengubah jenis pembayaran' });

  const { nama, target, icon, kategori } = await req.json();
  if (!nama) return NextResponse.json({ sukses: false, pesan: 'Nama item tidak boleh kosong' });

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `"${nama}" diubah (demo, gak tersimpan)` });

  try {
    const patch = {};
    if (target !== undefined) patch.target = Number(target) || 0;
    if (icon) patch.icon = icon;
    if (kategori) patch.kategori = kategori;
    if (Object.keys(patch).length) throwIfError(await db().from('item_pembayaran').update(patch).eq('nama', nama));

    return NextResponse.json({ sukses: true, pesan: `"${nama}" berhasil diubah` });
  } catch (e) {
    console.error('PUT /api/item gagal:', e);
    return NextResponse.json({ sukses: false, pesan: e.message });
  }
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
    await Promise.all(urutan.map((nama, i) => db().from('item_pembayaran').update({ urutan: i }).eq('nama', nama)));
    return NextResponse.json({ sukses: true, pesan: 'Urutan berhasil disimpan' });
  } catch (e) {
    console.error('PATCH /api/item gagal:', e);
    return NextResponse.json({ sukses: false, pesan: e.message });
  }
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ sukses: false, pesan: 'Belum login' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ sukses: false, pesan: 'Hanya admin yang bisa menghapus jenis pembayaran' });

  const { nama } = await req.json();
  if (!nama) return NextResponse.json({ sukses: false, pesan: 'Nama item tidak boleh kosong' });

  if (DEMO_MODE) return NextResponse.json({ sukses: true, pesan: `Jenis pembayaran "${nama}" dihapus (demo, gak tersimpan)` });

  try {
    // on delete cascade di tabel pembayaran — hapus item otomatis ikut hapus semua data pembayaran item itu
    throwIfError(await db().from('item_pembayaran').delete().eq('nama', nama));
    return NextResponse.json({ sukses: true, pesan: `Jenis pembayaran "${nama}" dan semua data pembayarannya dihapus dari semua kelas` });
  } catch (e) {
    console.error('DELETE /api/item gagal:', e);
    return NextResponse.json({ sukses: false, pesan: e.message });
  }
}
