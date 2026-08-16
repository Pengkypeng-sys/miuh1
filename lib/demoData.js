export const DEMO_MODE = process.env.DEMO_MODE === '1';

export const DEMO_USERS = {
  admin: { password: '1234', nama: 'Bu Siti', role: 'admin' },
  staf: { password: '1234', nama: 'Pak Budi', role: 'staf' },
};

export const DEMO_KELAS = ['KELAS 1', 'KELAS 2', 'KELAS 3', 'KELAS 4', 'KELAS 5', 'KELAS 6'];

export const DEMO_SISWA = {
  'KELAS 1': ['Ahmad Fauzi', 'Siti Aminah', 'Budi Santoso'],
  'KELAS 2': ['Nadia Putri', 'Rizki Ramadhan', 'Dewi Lestari'],
};

export const DEMO_ITEMS = [
  { nama: 'PPDB', kolom: 2, target: 300000, icon: 'layers', kategori: 'Wajib', urutan: 0 },
  { nama: 'BUKU', kolom: 3, target: 150000, icon: 'book', kategori: 'Wajib', urutan: 1 },
  { nama: 'SPP', kolom: 4, target: 700000, icon: 'wallet', kategori: 'Wajib', urutan: 2 },
  { nama: 'PTS 1', kolom: 5, target: 50000, icon: 'receipt', kategori: 'Wajib', urutan: 3 },
  { nama: 'PAS', kolom: 6, target: 100000, icon: 'receipt', kategori: 'Wajib', urutan: 4 },
  { nama: 'LKS', kolom: 7, target: 100000, icon: 'receipt', kategori: 'Wajib', urutan: 5 },
  { nama: 'PTS 2', kolom: 8, target: 50000, icon: 'receipt', kategori: 'Wajib', urutan: 6 },
  { nama: 'PAT', kolom: 9, target: 100000, icon: 'receipt', kategori: 'Wajib', urutan: 7 },
  { nama: 'PENSI', kolom: 10, target: 75000, icon: 'case', kategori: 'Opsional', urutan: 8 },
  { nama: 'STUDY TOUR', kolom: 11, target: 250000, icon: 'case', kategori: 'Opsional', urutan: 9 },
];

export const DEMO_REKAP = {
  perItem: DEMO_ITEMS.map((it, i) => ({ kolom: it.kolom, nama: it.nama, terisi: 60 + i * 3, nominal: (60 + i * 3) * (50000 + i * 10000) })),
  perKelas: DEMO_KELAS.map((k, i) => ({ kelas: k, totalSiswa: 25 + i, lunasCount: 15 + i, persenLunas: Math.round(((15 + i) / (25 + i)) * 100) })),
  bayarHariIni: [
    { kelas: 'KELAS 1', siswa: 'Ahmad Fauzi', item: 'SPP', nominal: 70000 },
    { kelas: 'KELAS 2', siswa: 'Nadia Putri', item: 'PTS 1', nominal: 50000 },
    { kelas: 'KELAS 5', siswa: 'Rizki Ramadhan', item: 'BUKU', nominal: 120000 },
  ],
  piutang: [
    { kelas: 'KELAS 3', siswa: 'Dewi Lestari', kurang: 420000, items: [{ nama: 'SPP', kurang: 210000 }, { nama: 'BUKU', kurang: 210000 }], lewat30: true },
    { kelas: 'KELAS 1', siswa: 'Rian Saputra', kurang: 300000, items: [{ nama: 'PPDB', kurang: 300000 }], lewat30: true },
    { kelas: 'KELAS 5', siswa: 'Putri Ayu', kurang: 150000, items: [{ nama: 'SPP', kurang: 150000 }], lewat30: false },
  ],
  trendBulanan: [
    { bulan: 'Mar 2026', total: 4200000 }, { bulan: 'Apr 2026', total: 5100000 }, { bulan: 'Mei 2026', total: 3800000 },
    { bulan: 'Jun 2026', total: 4600000 }, { bulan: 'Jul 2026', total: 5300000 }, { bulan: 'Agu 2026', total: 850000 },
  ],
};
