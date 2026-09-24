<div align="center">

# 💳 Dashboard Pembayaran Siswa
### MI Unwanul Huda 1

Kelola SPP, PPDB, BUKU, dan pembayaran lainnya dari satu tempat — tanpa spreadsheet manual, tanpa catatan kertas.

[![Live](https://img.shields.io/badge/live-miuh1.vercel.app-1a7a4c?style=for-the-badge)](https://miuh1.vercel.app)
![Next.js](https://img.shields.io/badge/Next.js%2014-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-black?style=flat-square&logo=vercel)

</div>

---

## ✨ Kenapa dashboard ini

Sekolah butuh catatan pembayaran yang **akurat, cepat, dan bisa dipantau siapa saja yang punya akses** — admin tata usaha sampai wali kelas — tanpa saling tunggu giliran buka satu file Excel yang sama.

- 🔒 **2 level akses** — admin (kontrol penuh) dan guru/wali kelas (read-only, lihat status per kelas gabungan, gak bisa ubah data)
- 💰 **Pembayaran fleksibel** — dari item sekali bayar (PPDB, BUKU) sampai SPP bulanan dengan target beda per kelas dan pengecualian siswa yatim
- 📊 **Rekap real-time** — status lunas/nyicil/belum langsung kelihatan, per kelas maupun per siswa, bisa diekspor ke Excel
- 🧾 **Kwitansi & laporan siap cetak** — laporan bulanan format sekolah, kwitansi per transaksi, cetak per siswa
- 📱 **Jalan di HP** — dari layar admin gede sampai HP jadul, tetep enak dipakai

---

## 🧩 Fitur

| Kategori | Yang bisa dilakukan |
|---|---|
| **Pembayaran** | Input multi-item sekaligus, metode Cash/Transfer/QRIS, sistem cicilan otomatis (belum bayar → nyicil → lunas), koreksi & pindah nominal antar item |
| **SPP Bulanan** | Target beda per kelas, kunci checkbox bulan yang udah lunas, siswa yatim otomatis gratis, backfill data lama |
| **Kelola Data** | Tambah/hapus siswa, tambah jenis pembayaran baru (otomatis kepake semua kelas atau kelas tertentu), kenaikan kelas tahunan 1 klik |
| **Rekap & Laporan** | Dashboard ringkasan seluruh kelas, tabel matriks siswa × item, drill-down per item & bulan, laporan bulanan format sekolah (Excel), export Excel siap cetak |
| **Keuangan Harian** | Uang masuk otomatis dari pembayaran, uang keluar dicatat manual, saldo harian, trend 7 hari |
| **Wali Kelas** | Akun read-only, lihat siswa sekelas atau gabungan beberapa kelas sekaligus + status bayar + daftar item belum lunas, tanpa resiko kesalahan input |
| **Keamanan** | Password ter-hash, session JWT, role dicek di server, lockout setelah percobaan login gagal berulang |
| **Audit** | Log aktivitas lengkap — siapa, kapan, ubah apa dari nilai berapa ke berapa |

---

## 🛠️ Tech Stack

| | |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org) (App Router) — frontend & API jadi satu |
| **Database** | [Supabase](https://supabase.com) (Postgres), diakses lewat service role key — gak ada akses langsung dari browser |
| **Auth** | JWT ([`jsonwebtoken`](https://npmjs.com/package/jsonwebtoken)) di cookie httpOnly |
| **Excel** | [`exceljs`](https://npmjs.com/package/exceljs) — laporan & export beneran `.xlsx`, bukan CSV nyamar |
| **Animasi** | [`motion`](https://motion.dev) |
| **Styling** | Tailwind CSS, custom di `app/globals.css` |
| **Deploy** | [Vercel](https://vercel.com), cron job mingguan buat backup otomatis |

---

## 🗄️ Struktur Database

```
users              → akun login (admin / guru), password ter-hash
siswa              → data siswa per kelas, flag "yatim" buat SPP gratis
item_pembayaran    → daftar jenis pembayaran (SPP, PPDB, BUKU, dst), target harga, kelas_scope
pembayaran         → nominal per siswa per item (kumulatif, bukan riwayat transaksi)
spp_bulanan        → tracking SPP per bulan per siswa (terpisah dari pembayaran biasa)
spp_target         → target SPP per kelas, bisa beda tiap tahun ajaran
log_aktivitas      → audit trail semua perubahan data
pengeluaran        → catatan uang keluar
riwayat_siswa      → snapshot jumlah siswa per tahun ajaran (buat grafik trend)
```

Skema lengkap ada di `supabase-schema.sql` + migrasi tambahan (`supabase-*.sql`) — dijalankan berurutan sekali di Supabase SQL Editor.

---

## 🚀 Setup Lokal

**1. Install dependency**

```bash
npm install
```

**2. Bikin project Supabase**

Buat project baru di [supabase.com](https://supabase.com), lalu jalankan seluruh isi `supabase-schema.sql` (dan file `supabase-*.sql` lainnya berurutan) di **SQL Editor**.

**3. Isi environment variables**

```bash
cp .env.local.example .env.local
```

```env
SUPABASE_URL=<Project URL dari Supabase Settings → API>
SUPABASE_SERVICE_ROLE_KEY=<service_role key — RAHASIA, jangan expose ke client>
JWT_SECRET=<random string, generate: openssl rand -hex 32>
```

**4. Bikin akun admin pertama**

```sql
insert into users (username, password_hash, nama, role)
values ('admin', encode(digest('password-kamu', 'sha256'), 'hex'), 'Admin', 'admin');
```

**5. Jalankan**

```bash
npm run dev
```

Buka [localhost:3000](http://localhost:3000). 🎉

---

## 🎮 Mode Demo

Coba tampilan tanpa data asli — set `DEMO_MODE=1` di `.env.local`. Gak ada tulisan yang nyangkut ke database.

```
username: admin   password: 1234   → role admin
username: guru     password: 1234   → role guru
```

---

## ☁️ Deploy ke Vercel

1. Push repo ke GitHub
2. Import di [vercel.com/new](https://vercel.com/new)
3. Isi environment variables yang sama (**jangan** set `DEMO_MODE`)
4. Deploy — cron backup mingguan otomatis jalan lewat `vercel.json`

---

## 📁 Struktur Project

```
app/
  api/
    payment/          → submit, koreksi, pindah pembayaran
    spp-bulanan/       → status & backfill SPP per bulan
    spp-target/        → target SPP per kelas (editable admin)
    kelas-detail/      → tabel matriks siswa × item per kelas
    rekap/              → statistik agregat buat dashboard
    rekap-item-bulan/  → drill-down 1 item di 1 bulan
    laporan-bulanan/    → generate Excel laporan bulanan
    bayar-excel/        → export Excel transaksi harian
    kas/                → keuangan harian
    kenaikan-kelas/     → naikkan seluruh siswa 1 tingkat
    log/                → riwayat aktivitas
    login/logout/session/ → autentikasi
    account/            → ganti password akun sendiri
    cron-backup/        → dipanggil Vercel Cron, backup mingguan otomatis
  page.js               → shell utama (state, routing tab)
components/
  tabs/                 → 1 file per tab (Bayar, Rekap, Siswa, Item, Kas, Log, Kenaikan, Akun)
lib/
  db.js                 → koneksi Supabase, helper pagination, kenaikan kelas
  auth.js               → hash password, JWT, cookie session, kontrol akses kelas
  target.js             → logic status lunas/nyicil/belum
  format.js              → helper format angka/tanggal, konstanta target
  laporanBulanan.js       → generator Excel laporan bulanan
  backup.js               → backup mingguan ke Supabase Storage
```

---

## 🔐 Keamanan

- Password di-hash SHA-256, gak ada plaintext tersimpan
- Session JWT httpOnly cookie, expired 6 jam
- Role dicek di **server**, bukan cuma disembunyikan di UI
- Lockout otomatis setelah 5x percobaan login gagal dalam 10 menit
- Wali kelas: role read-only, semua endpoint tulis nolak eksplisit di server (bukan cuma disembunyiin tombolnya)

---

## 💡 Kenapa Supabase, Bukan Google Sheets?

Versi awal dashboard ini pakai Google Sheets sebagai database, tapi kena limit rate API dan makin lambat seiring data nambah. Supabase (Postgres) kasih query yang jauh lebih cepat dan bisa nampung ribuan baris tanpa lag — cocok buat sekolah yang datanya terus tumbuh tiap tahun ajaran.

<div align="center">

---

Dibuat untuk **MI Unwanul Huda 1**

</div>
