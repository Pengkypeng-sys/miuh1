# Dashboard Pembayaran Siswa — MI Unwanul Huda 1

Dashboard web buat kelola pembayaran siswa (SPP, PPDB, BUKU, dll) langsung terhubung ke Google Sheets — gak perlu buka spreadsheet manual, gak perlu database terpisah. Google Sheet yang udah ada tetep jadi sumber data satu-satunya.

**Live:** https://miuh1.vercel.app

---

## Fitur

- **Login berbasis role** — admin (akses penuh) vs staf (input pembayaran doang), password ter-hash SHA-256
- **Input pembayaran multi-item** — centang beberapa item sekaligus (SPP + BUKU dalam satu transaksi), plus metode bayar (Cash/Transfer/QRIS)
- **Sistem cicilan** — tiap item punya target harga, submit berikutnya nambah ke total (bukan menimpa), status otomatis: belum bayar / nyicil / lunas
- **Koreksi & pindah pembayaran** — admin bisa timpa nilai langsung (buat salah input) atau pindahkan nominal ke item lain (buat salah pilih item)
- **Kelola siswa** — tambah/hapus siswa per kelas, cari nama, urut A-Z otomatis
- **Kelola jenis pembayaran** — admin bisa tambah/hapus jenis pembayaran baru, otomatis nambah kolom di semua sheet kelas
- **Rekap & statistik** — persentase lunas per kelas, tabel matriks siswa × item, rekap per jenis pembayaran, laporan bisa dicetak/disimpan PDF
- **Keuangan harian** — uang masuk (dari pembayaran) vs uang keluar (dicatat manual), saldo harian, bisa lihat tanggal tertentu atau semua tanggal
- **Log aktivitas** — riwayat semua perubahan data (siapa, kapan, aksi apa), bisa difilter per tanggal
- **Mobile-friendly** — sidebar jadi menu hamburger di layar kecil

## Tech Stack

- **Next.js 14** (App Router) — frontend + API routes jadi satu
- **Google Sheets API** (`googleapis`) — baca/tulis langsung ke spreadsheet, gak ada database lain
- **JWT** (`jsonwebtoken`) — session login, disimpan di cookie httpOnly
- Gak ada UI framework — CSS custom polos (`app/globals.css`)

## Struktur Google Sheet

| Sheet | Isi |
|---|---|
| `KELAS 1` – `KELAS 6` | Kolom A = nama siswa, kolom B dst = nominal per item pembayaran (angka kumulatif), kolom terakhir = "Terakhir Diisi" |
| `Users` | username, password (hash SHA-256), nama tampilan, role (`admin`/`staf`) |
| `TargetHarga` | nama item, target nominal — dibuat otomatis |
| `Log` | riwayat semua aksi (waktu, user, aksi, kelas, siswa, item, nilai lama, nilai baru, metode) — dibuat otomatis |
| `Pengeluaran` | tanggal, keterangan, nominal, dicatat oleh — dibuat otomatis |

Sheet `TargetHarga`, `Log`, dan `Pengeluaran` otomatis kebuat pas pertama kali dibutuhkan — gak perlu bikin manual.

## Setup Lokal

### 1. Install dependency

```bash
npm install
```

### 2. Bikin Service Account Google Cloud

1. Buka [console.cloud.google.com](https://console.cloud.google.com) → bikin project baru
2. Aktifkan **Google Sheets API** (search di search bar → Enable)
3. **IAM & Admin → Service Accounts → Create Service Account**
4. Klik service account yang baru → tab **Keys → Add Key → Create new key → JSON** → download
5. Buka spreadsheet target → **Share** → tempel email service account (`xxx@xxx.iam.gserviceaccount.com`) dari file JSON → kasih akses **Editor**

### 3. Isi environment variables

```bash
cp .env.local.example .env.local
```

Isi `.env.local`:

```
SPREADSHEET_ID=<id dari URL spreadsheet>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email dari file JSON>
GOOGLE_PRIVATE_KEY="<private_key dari file JSON, apa adanya termasuk \n>"
JWT_SECRET=<random string, generate: openssl rand -hex 32>
```

### 4. Bikin akun pertama

Spreadsheet perlu sheet `Users` dengan minimal 1 baris admin. Kolom: `username | password (hash SHA-256) | nama | role`. Hash password bisa digenerate lewat Node:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('password-kamu').digest('hex'))"
```

### 5. Jalankan

```bash
npm run dev
```

Buka [localhost:3000](http://localhost:3000).

## Masa Aktif / Lisensi

Dashboard ini berjalan sebagai layanan berbayar dengan masa aktif terbatas, diatur di `lib/license.js`:

```js
export const LICENSE_START = '2026-07-13';
export const LICENSE_EXPIRY = '2026-08-13';
```

**Cara kerjanya:**
- **H-7 sebelum expired** — banner peringatan kuning muncul di dashboard: "Masa aktif tinggal N hari"
- **Setelah tanggal expiry lewat** — dashboard terkunci total buat semua user (termasuk admin). Login baru ditolak, dan session yang lagi aktif otomatis logout paksa saat halaman di-refresh
- Data di Google Sheet **tidak terpengaruh** — cuma akses lewat dashboard yang dikunci, staf sekolah tetap bisa buka spreadsheet-nya langsung kalau darurat

**Perpanjang masa aktif:**
1. Edit `LICENSE_EXPIRY` di `lib/license.js` ke tanggal baru (format `YYYY-MM-DD`)
2. Commit & push — Vercel otomatis redeploy dan dashboard langsung kebuka lagi

## Mode Demo

Set `DEMO_MODE=1` di `.env.local` buat coba tampilan pakai data dummy — gak nulis apa pun ke spreadsheet asli. Login: `admin`/`1234` (role admin) atau `staf`/`1234` (role staf).

## Deploy ke Vercel

1. Push repo ini ke GitHub
2. Import project di [vercel.com/new](https://vercel.com/new)
3. Isi 4 environment variables yang sama kayak di atas (**jangan** set `DEMO_MODE`)
4. Deploy

## Struktur Project

```
app/
  api/            → semua backend logic (route.js per endpoint)
    kelas/        → daftar kelas
    siswa/        → CRUD siswa
    item/         → CRUD jenis pembayaran
    payment/      → submit/hapus pembayaran, + payment/pindah, payment/row
    kas/          → keuangan harian (masuk/keluar)
    log/          → riwayat aktivitas
    rekap/        → statistik agregat
    kelas-detail/ → tabel matriks siswa × item
    login/logout/session/ → autentikasi
  page.js         → seluruh UI (single-page, client component)
  globals.css     → semua styling
lib/
  sheets.js       → wrapper Google Sheets API (baca/tulis/format sel)
  auth.js         → hash password, JWT, cookie session
  log.js          → pencatat audit log
  target.js       → logic status lunas/nyicil/belum
  icons.js        → ikon SVG inline
  demoData.js     → data dummy buat DEMO_MODE
```

## Keamanan

- Password di-hash SHA-256 (satu arah, gak ada plaintext di sheet)
- Session pakai JWT httpOnly cookie, expired 6 jam
- Role admin/staf dicek di server (bukan cuma disembunyikan di UI)
- **Belum ada:** rate limiting request, 2FA. Buat skala 1 sekolah dianggap cukup — kalau mau expand, pertimbangkan restrict akses Vercel/Google Workspace kalau sekolah punya domain organisasi

## Kenapa Google Sheets, Bukan Database?

Staf sekolah udah familiar sama spreadsheet — kalau app ini down atau ada kebutuhan darurat, data tetap bisa diakses & diedit langsung dari Google Sheets tanpa perlu bergantung ke aplikasi ini. Trade-off: lebih lambat dibanding database asli, dan kena limit rate Google Sheets API (60 read/menit per user) — makanya beberapa endpoint dioptimasi buat baca sekali per aksi, bukan per baris.
