// Helper format & konstanta yang dipakai bareng di banyak tab — biar gak disalin ulang tiap file.

export const STATUS_LABEL = { lunas: 'Lunas', cicil: 'Nyicil', belum: 'Belum bayar' };

export const rp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
export const rpSigned = (n) => (n < 0 ? '-Rp ' + Math.abs(n).toLocaleString('id-ID') : 'Rp ' + n.toLocaleString('id-ID'));
export const initials = (name) => (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
export const onlyDigits = (s) => s.replace(/\D/g, '');
export const formatRibuan = (s) => onlyDigits(s).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// Nominal singkat buat chip sempit: 150000 -> "150rb", 1200000 -> "1,2jt"
export const rpSingkat = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1).replace('.', ',') + 'jt';
  if (n >= 1000) return Math.round(n / 1000) + 'rb';
  return String(n);
};
export function sapaanWaktu(date = new Date()) {
  const jam = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(date));
  if (jam < 11) return 'Selamat pagi';
  if (jam < 15) return 'Selamat siang';
  if (jam < 19) return 'Selamat sore';
  return 'Selamat malam';
}
export const ddmmyyyyToIso = (s) => { const [d, m, y] = s.split('/'); return `${y}-${m}-${d}`; };
export const isoToDdmmyyyy = (s) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };

export const TAB_META = {
  bayar: { title: 'Pembayaran', desc: 'Input & kelola pembayaran per siswa', icon: 'money' },
  siswa: { title: 'Kelola Siswa', desc: 'Tambah atau hapus data siswa', icon: 'userPlus', group: 'admin' },
  item: { title: 'Jenis Pembayaran', desc: 'Kelola daftar item, harga, icon & kategori', icon: 'tag', group: 'admin' },
  kenaikan: { title: 'Kenaikan Kelas', desc: 'Naikkan seluruh siswa ke kelas berikutnya', icon: 'trendingUp', group: 'admin' },
  kas: { title: 'Keuangan Harian', desc: 'Catatan uang masuk & keluar per hari', icon: 'wallet' },
  log: { title: 'Log Aktivitas', desc: 'Riwayat semua perubahan data', icon: 'clock' },
  rekap: { title: 'Rekap & Statistik', desc: 'Ringkasan pembayaran seluruh kelas', icon: 'chart' },
};

// Menu di sidebar yang dikelompokkan jadi 1 dropdown (biar sidebar gak numpuk panjang ke bawah)
export const NAV_GROUPS = [{ key: 'admin', label: 'Administrasi', icon: 'settings', tabs: ['siswa', 'item', 'kenaikan'] }];

export const AKSI_LABEL = {
  'submit-pembayaran': { label: 'Setor Pembayaran', color: 'lunas' },
  'edit-langsung': { label: 'Koreksi Nilai', color: 'cicil' },
  'edit-manual': { label: 'Edit Langsung di Sheet', color: 'cicil' },
  'hapus-pembayaran': { label: 'Hapus Pembayaran', color: 'belum' },
  'pindah-pembayaran': { label: 'Pindah Item', color: 'cicil' },
  'tambah-siswa': { label: 'Tambah Siswa', color: 'lunas' },
  'hapus-siswa': { label: 'Hapus Siswa', color: 'belum' },
};

export const BULAN_LIST = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const BUKU_KELAS_MAP = { 'KELAS 1': 'BUKU 1', 'KELAS 2': 'BUKU 1', 'KELAS 3': 'BUKU 2', 'KELAS 4': 'BUKU 2', 'KELAS 5': 'BUKU 3', 'KELAS 6': 'BUKU 3' };
export const PPDB_HARGA_ACUAN = { '1-L': 940000, '2-L': 1550000, '3-L': 1175000, '1-P': 1035000, '2-P': 1165000, '3-P': 1295000 };
export const BUKU_HARGA_ACUAN = { 'KELAS 1': 400000, 'KELAS 2': 400000, 'KELAS 3': 480000, 'KELAS 4': 480000, 'KELAS 5': 475000, 'KELAS 6': 475000 };
export const BUKU_LABEL_HARGA = { 'BUKU 1': 400000, 'BUKU 2': 480000, 'BUKU 3': 475000 };
export const ITEM_ICONS = ['receipt', 'money', 'wallet', 'book', 'layers', 'case', 'students', 'chart'];
export const ITEM_KATEGORI = ['Wajib', 'Opsional', 'Ekstrakurikuler', 'Lainnya'];

// Target harga PPDB/BUKU beda-beda per varian (Gel/Kelas), tapi TargetHarga sheet cuma nyimpen 1 acuan.
// Baca varian asli dari keterangan yang kesimpen di format cell (mis. "GEL.3 LAKI-LAKI"), baru cari harga aslinya.
export function targetSebenarnya(namaItem, ket, fallback) {
  if (!ket) return fallback;
  if (namaItem === 'PPDB') {
    const m = ket.match(/GEL\.?(\d)\s+(LAKI-LAKI|PEREMPUAN)/i);
    if (m) return PPDB_HARGA_ACUAN[`${m[1]}-${m[2].toUpperCase().startsWith('L') ? 'L' : 'P'}`] || fallback;
  }
  if (namaItem === 'BUKU') {
    const m = ket.match(/BUKU\s*(\d)/i);
    if (m) return BUKU_LABEL_HARGA[`BUKU ${m[1]}`] || fallback;
  }
  return fallback;
}
