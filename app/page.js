'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/lib/icons';
import { onlyDigits, BUKU_KELAS_MAP } from '@/lib/format';
import { LoadingScreen } from '@/components/LoadingScreen';
import { LisensiExpiredScreen, LoginScreen } from '@/components/LoginScreen';
import { Sidebar } from '@/components/Sidebar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BayarTab } from '@/components/tabs/BayarTab';
import { SiswaTab } from '@/components/tabs/SiswaTab';
import { KasTab } from '@/components/tabs/KasTab';
import { LogTab } from '@/components/tabs/LogTab';
import { RekapTab } from '@/components/tabs/RekapTab';

const fadeSlide = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.22, ease: 'easeOut' },
};

const TAB_META = {
  bayar: { title: 'Pembayaran', desc: 'Input & kelola pembayaran per siswa', icon: 'money' },
  siswa: { title: 'Kelola Siswa', desc: 'Tambah atau hapus data siswa', icon: 'students' },
  kas: { title: 'Keuangan Harian', desc: 'Catatan uang masuk & keluar per hari', icon: 'wallet' },
  log: { title: 'Log Aktivitas', desc: 'Riwayat semua perubahan data', icon: 'clock' },
  rekap: { title: 'Rekap & Statistik', desc: 'Ringkasan pembayaran seluruh kelas', icon: 'chart' },
};

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [nama, setNama] = useState('');
  const [role, setRole] = useState('staf');
  const [lisensiExpired, setLisensiExpired] = useState(false);
  const [lisensiPesan, setLisensiPesan] = useState('');
  const [lisensiPeringatan, setLisensiPeringatan] = useState(null);
  const [tab, setTab] = useState('bayar');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginMsg, setLoginMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [kelasList, setKelasList] = useState([]);
  const [kelas, setKelas] = useState('');
  const [siswaList, setSiswaList] = useState([]);
  const [siswa, setSiswa] = useState('');
  const [itemList, setItemList] = useState([]);
  const [kolom, setKolom] = useState('');
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [nominalPerItem, setNominalPerItem] = useState({});
  const [ppdbOn, setPpdbOn] = useState(false);
  const [ppdbGel, setPpdbGel] = useState('');
  const [ppdbGender, setPpdbGender] = useState('');
  const [ppdbNominal, setPpdbNominal] = useState('');
  const [bukuOn, setBukuOn] = useState(false);
  const [bukuKelasPilih, setBukuKelasPilih] = useState('');
  const [bukuNominal, setBukuNominal] = useState('');
  const [sppOn, setSppOn] = useState(false);
  const [sppBulan, setSppBulan] = useState([]);
  const [sppNominal, setSppNominal] = useState('');
  const [tabunganOn, setTabunganOn] = useState(false);
  const [tabunganNominal, setTabunganNominal] = useState('');
  const [metodeBayar, setMetodeBayar] = useState('Cash');
  const [statusBayar, setStatusBayar] = useState(null);
  const [loadingBtn, setLoadingBtn] = useState(false);
  const [itemValues, setItemValues] = useState({});
  const [loadingRingkasan, setLoadingRingkasan] = useState(false);

  function toggleCheckedItem(kolomItem) {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(kolomItem)) next.delete(kolomItem); else next.add(kolomItem);
      return next;
    });
  }

  const [kelasSiswa, setKelasSiswa] = useState('');
  const [namaBaru, setNamaBaru] = useState('');
  const [siswaHapusList, setSiswaHapusList] = useState([]);
  const [siswaHapus, setSiswaHapus] = useState('');
  const [statusSiswa, setStatusSiswa] = useState(null);
  const [cariSiswaKelola, setCariSiswaKelola] = useState('');
  const [namaItemBaru, setNamaItemBaru] = useState('');
  const [targetItemBaru, setTargetItemBaru] = useState('');
  const [kelasItemBaru, setKelasItemBaru] = useState([]);
  const [iconItemBaru, setIconItemBaru] = useState('receipt');
  const [kategoriItemBaru, setKategoriItemBaru] = useState('Wajib');
  const [loadingUrutan, setLoadingUrutan] = useState(false);
  const [statusItem, setStatusItem] = useState(null);
  const [loadingItem, setLoadingItem] = useState(false);
  const [editItemNama, setEditItemNama] = useState(null);
  const [editItemTargetVal, setEditItemTargetVal] = useState('');
  const [cariSiswaDetail, setCariSiswaDetail] = useState('');

  const [rekap, setRekap] = useState(null);
  const [rekapKelasFilter, setRekapKelasFilter] = useState('');
  const [varianFilter, setVarianFilter] = useState({});
  const [kelasDetailPilih, setKelasDetailPilih] = useState('');
  const [kelasDetail, setKelasDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [kas, setKas] = useState(null);
  const [loadingKas, setLoadingKas] = useState(false);
  const [ketPengeluaran, setKetPengeluaran] = useState('');
  const [nominalPengeluaran, setNominalPengeluaran] = useState('');
  const [statusKas, setStatusKas] = useState(null);
  const [tanggalKas, setTanggalKas] = useState(''); // '' = hari ini, 'semua' = semua tanggal, else dd/MM/yyyy
  const [confirmDialog, setConfirmDialog] = useState(null); // {title, message, onConfirm}

  const [logData, setLogData] = useState(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [tanggalLog, setTanggalLog] = useState('');
  const [modePerItem, setModePerItem] = useState({}); // {kolom: 'tambah'|'set'}
  const [showPindah, setShowPindah] = useState(false);
  const [pindahKeKolom, setPindahKeKolom] = useState('');
  const [pindahNominal, setPindahNominal] = useState('');
  const [loadingPindah, setLoadingPindah] = useState(false);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [loadingPengeluaran, setLoadingPengeluaran] = useState(false);
  const [loadingKenaikan, setLoadingKenaikan] = useState(false);
  const [statusKenaikan, setStatusKenaikan] = useState(null);

  function askConfirm(title, message, onConfirm) {
    setConfirmDialog({ title, message, onConfirm });
  }

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(res => {
      if (res.expired) { setLisensiExpired(true); setLisensiPesan(res.pesan); setChecking(false); return; }
      if (res.sukses) {
        setNama(res.nama); setRole(res.role); setLoggedIn(true);
        if (res.lisensi?.peringatan) setLisensiPeringatan(res.lisensi);
      }
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    fetch('/api/kelas').then(r => r.json()).then(list => {
      setKelasList(list);
      setKelas(list[0] || '');
      setKelasSiswa(list[0] || '');
      setKelasDetailPilih(list[0] || '');
    });
    loadRekap();
  }, [loggedIn]);

  useEffect(() => {
    if (!kelas) return;
    fetch(`/api/siswa?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(list => { const l = Array.isArray(list) ? list : []; setSiswaList(l); setSiswa(l[0] || ''); });
    fetch(`/api/item?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(list => { setItemList(list); setKolom(list[0]?.kolom || ''); });
  }, [kelas]);

  useEffect(() => {
    if (!kelasSiswa) return;
    fetch(`/api/siswa?kelas=${encodeURIComponent(kelasSiswa)}`).then(r => r.json()).then(list => { setSiswaHapusList(list); setSiswaHapus(list[0] || ''); });
  }, [kelasSiswa]);

  useEffect(() => {
    if (!kelas || !siswa) { setItemValues({}); return; }
    loadItemValues();
  }, [kelas, siswa]);

  useEffect(() => { setShowPindah(false); setPindahKeKolom(''); setPindahNominal(''); }, [kolom, siswa]);

  // 1 panggilan API buat ambil semua nilai item siswa sekaligus (bukan 1 per item) — hindari rate limit Sheets API
  async function loadItemValues() {
    setLoadingRingkasan(true);
    const row = await fetch(`/api/payment/row?kelas=${encodeURIComponent(kelas)}&siswa=${encodeURIComponent(siswa)}`).then(r => r.json());
    setItemValues(row);
    setLoadingRingkasan(false);
  }

  function cekSessionExpired(res) {
    if (res && res.sessionExpired) { alert('Session habis, silakan login ulang'); doLogout(); return true; }
    return false;
  }

  async function doLogin() {
    if (!username.trim() || !password.trim()) { alert('Isi username dan password'); return; }
    let res;
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      res = await r.json();
    } catch {
      setLoginMsg('Koneksi ke server gagal, coba lagi');
      return;
    }
    if (res.expired) { setLisensiExpired(true); setLisensiPesan(res.pesan); return; }
    if (res.sukses) {
      setNama(res.nama); setRole(res.role); setLoggedIn(true); setLoginMsg(null);
      if (res.lisensi?.peringatan) setLisensiPeringatan(res.lisensi);
    } else {
      setLoginMsg(res.pesan);
    }
  }

  async function doLogout() {
    await fetch('/api/logout', { method: 'POST' });
    setLoggedIn(false); setUsername(''); setPassword('');
  }

  async function loadRekap() {
    const url = rekapKelasFilter ? `/api/rekap?kelas=${encodeURIComponent(rekapKelasFilter)}` : '/api/rekap';
    const data = await fetch(url).then(r => r.json());
    setRekap(data);
  }

  useEffect(() => { if (tab === 'rekap') loadRekap(); }, [rekapKelasFilter]);

  // auto-refresh tab yang lagi aktif tiap 15 detik, biar data selalu up-to-date tanpa klik Refresh manual.
  // "Data Siswa per Kelas" gak ikut auto-refresh — bikin loading/reset pas lagi dibaca/dicari, ganggu.
  useEffect(() => {
    const interval = setInterval(() => {
      if (tab === 'rekap') loadRekap();
      else if (tab === 'kas') loadKas();
      else if (tab === 'log') loadLog();
    }, 15000);
    return () => clearInterval(interval);
  }, [tab, tanggalKas, tanggalLog, rekapKelasFilter]);

  useEffect(() => {
    if (tab !== 'rekap' || !kelasDetailPilih) return;
    loadKelasDetail();
  }, [tab, kelasDetailPilih]);

  async function loadKelasDetail() {
    setLoadingDetail(true);
    const data = await fetch(`/api/kelas-detail?kelas=${encodeURIComponent(kelasDetailPilih)}`).then(r => r.json());
    setKelasDetail(data);
    setLoadingDetail(false);
  }

  useEffect(() => {
    if (tab !== 'kas') return;
    loadKas();
  }, [tab, tanggalKas]);

  async function loadKas() {
    setLoadingKas(true);
    const q = tanggalKas ? `?tanggal=${encodeURIComponent(tanggalKas)}` : '';
    const data = await fetch(`/api/kas${q}`).then(r => r.json());
    setKas(data);
    setLoadingKas(false);
  }

  useEffect(() => {
    if (tab !== 'log') return;
    loadLog();
  }, [tab, tanggalLog]);

  async function loadLog() {
    setLoadingLog(true);
    const q = tanggalLog ? `?tanggal=${encodeURIComponent(tanggalLog)}` : '';
    const data = await fetch(`/api/log${q}`).then(r => r.json());
    setLogData(data);
    setLoadingLog(false);
  }

  async function tambahPengeluaran() {
    if (loadingPengeluaran) return; // cegah double-submit (klik dobel/cepat)
    if (!ketPengeluaran.trim() || !nominalPengeluaran) { alert('Isi keterangan dan nominal dulu'); return; }
    setLoadingPengeluaran(true);
    const res = await fetch('/api/kas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keterangan: ketPengeluaran, nominal: onlyDigits(nominalPengeluaran) }) }).then(r => r.json());
    setLoadingPengeluaran(false);
    if (cekSessionExpired(res)) return;
    setStatusKas(res);
    if (res.sukses) {
      setKetPengeluaran(''); setNominalPengeluaran('');
      loadKas();
    }
  }

  async function submitData() {
    const daftarBayar = Array.from(checkedItems)
      .filter(k => onlyDigits(nominalPerItem[k] || ''))
      .map(k => ({ kolom: k, nominal: onlyDigits(nominalPerItem[k]), mode: modePerItem[k] || 'tambah' }));

    if (ppdbOn && ppdbGel && ppdbGender && onlyDigits(ppdbNominal)) {
      const item = itemList.find(i => i.nama === 'PPDB');
      const keterangan = `GEL.${ppdbGel} ${ppdbGender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}`;
      if (item) daftarBayar.push({ kolom: item.kolom, nominal: onlyDigits(ppdbNominal), mode: 'tambah', keterangan });
    }
    if (bukuOn && bukuKelasPilih && onlyDigits(bukuNominal)) {
      const item = itemList.find(i => i.nama === 'BUKU');
      const keterangan = BUKU_KELAS_MAP[bukuKelasPilih];
      if (item) daftarBayar.push({ kolom: item.kolom, nominal: onlyDigits(bukuNominal), mode: 'tambah', keterangan });
    }
    if (sppOn && onlyDigits(sppNominal)) {
      const item = itemList.find(i => i.nama === 'SPP');
      const total = (Number(onlyDigits(sppNominal)) || 0) + (tabunganOn ? (Number(onlyDigits(tabunganNominal)) || 0) : 0);
      const keterangan = sppBulan.length ? `Bulan ${sppBulan.join(', ')}` : undefined;
      if (item && total) daftarBayar.push({ kolom: item.kolom, nominal: String(total), mode: 'tambah', keterangan });
    }

    if (daftarBayar.length === 0) { alert('Centang minimal 1 item dan isi nominalnya'); return; }

    setLoadingBtn(true);
    const hasil = [];
    for (const { kolom: k, nominal, mode, keterangan } of daftarBayar) {
      const res = await fetch('/api/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kelas, siswa, kolom: k, nominal, metode: metodeBayar, mode, keterangan }),
      }).then(r => r.json());
      if (cekSessionExpired(res)) { setLoadingBtn(false); return; }
      hasil.push(res);
      if (res.sukses) setItemValues(prev => ({ ...prev, [k]: res.total }));
    }
    setLoadingBtn(false);

    const sukses = hasil.filter(h => h.sukses);
    const gagal = hasil.filter(h => !h.sukses);
    setStatusBayar({
      sukses: gagal.length === 0,
      pesan: sukses.length
        ? `Berhasil ${sukses.length} item via ${metodeBayar}: ${sukses.map(h => h.item).join(', ')}` + (gagal.length ? `. Gagal: ${gagal.map(g => g.pesan).join('; ')}` : '')
        : gagal.map(g => g.pesan).join('; '),
    });
    setCheckedItems(new Set());
    setNominalPerItem({});
    setModePerItem({});
    setPpdbOn(false); setPpdbGel(''); setPpdbGender(''); setPpdbNominal('');
    setBukuOn(false); setBukuKelasPilih(''); setBukuNominal('');
    setSppOn(false); setSppBulan([]); setSppNominal(''); setTabunganOn(false); setTabunganNominal('');
  }

  function hapusData() {
    askConfirm('Hapus Data Pembayaran', `Hapus data pembayaran "${itemList.find(i => String(i.kolom) === String(kolom))?.nama}" milik ${siswa}?`, async () => {
      setConfirmDialog(null);
      setLoadingBtn(true);
      const res = await fetch('/api/payment', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kelas, siswa, kolom }) }).then(r => r.json());
      setLoadingBtn(false);
      if (cekSessionExpired(res)) return;
      setStatusBayar(res);
      if (res.sukses) setItemValues(prev => ({ ...prev, [kolom]: '' }));
    });
  }

  async function pindahPembayaran() {
    if (!pindahKeKolom) { alert('Pilih item tujuan dulu'); return; }
    setLoadingPindah(true);
    const res = await fetch('/api/payment/pindah', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kelas, siswa, dariKolom: kolom, keKolom: pindahKeKolom, nominal: onlyDigits(pindahNominal) }),
    }).then(r => r.json());
    setLoadingPindah(false);
    if (cekSessionExpired(res)) return;
    setStatusBayar(res);
    if (res.sukses) {
      setItemValues(prev => ({ ...prev, [res.dariKolom]: res.dariBaru, [res.keKolom]: res.keBaru }));
      setShowPindah(false); setPindahKeKolom(''); setPindahNominal('');
    }
  }

  async function tambahSiswa() {
    if (loadingSiswa) return; // cegah double-submit (klik dobel/cepat)
    if (!namaBaru.trim()) { alert('Isi nama siswa dulu'); return; }
    setLoadingSiswa(true);
    const res = await fetch('/api/siswa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kelas: kelasSiswa, nama: namaBaru }) }).then(r => r.json());
    setLoadingSiswa(false);
    if (cekSessionExpired(res)) return;
    setStatusSiswa(res);
    if (res.sukses) {
      setNamaBaru('');
      fetch(`/api/siswa?kelas=${encodeURIComponent(kelasSiswa)}`).then(r => r.json()).then(list => { setSiswaHapusList(list); setSiswaHapus(list[0] || ''); });
      if (kelasSiswa === kelas) fetch(`/api/siswa?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(setSiswaList);
    }
  }

  function hapusSiswa() {
    if (!siswaHapus) { alert('Pilih siswa dulu'); return; }
    askConfirm('Hapus Siswa', `Yakin hapus ${siswaHapus} dari ${kelasSiswa}? Semua data pembayarannya ikut terhapus.`, async () => {
      if (loadingSiswa) return;
      setConfirmDialog(null);
      setLoadingSiswa(true);
      const res = await fetch('/api/siswa', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kelas: kelasSiswa, nama: siswaHapus }) }).then(r => r.json());
      setLoadingSiswa(false);
      if (cekSessionExpired(res)) return;
      setStatusSiswa(res);
      fetch(`/api/siswa?kelas=${encodeURIComponent(kelasSiswa)}`).then(r => r.json()).then(list => { setSiswaHapusList(list); setSiswaHapus(list[0] || ''); });
      if (kelasSiswa === kelas) fetch(`/api/siswa?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(setSiswaList);
    });
  }

  async function tambahItem() {
    if (!namaItemBaru.trim() || !targetItemBaru) { alert('Isi nama item dan target harga dulu'); return; }
    setLoadingItem(true);
    const res = await fetch('/api/item', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: namaItemBaru, target: onlyDigits(targetItemBaru), kelas: kelasItemBaru, icon: iconItemBaru, kategori: kategoriItemBaru }),
    }).then(r => r.json());
    setLoadingItem(false);
    if (cekSessionExpired(res)) return;
    setStatusItem(res);
    if (res.sukses) {
      setNamaItemBaru(''); setTargetItemBaru(''); setKelasItemBaru([]); setIconItemBaru('receipt'); setKategoriItemBaru('Wajib');
      fetch(`/api/item?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(list => { setItemList(list); setKolom(list[0]?.kolom || ''); });
    }
  }

  async function simpanTargetItem(namaItem) {
    if (!editItemTargetVal) { alert('Isi target harga dulu'); return; }
    setLoadingItem(true);
    const res = await fetch('/api/item', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: namaItem, target: onlyDigits(editItemTargetVal) }) }).then(r => r.json());
    setLoadingItem(false);
    if (cekSessionExpired(res)) return;
    setStatusItem(res);
    if (res.sukses) {
      setEditItemNama(null);
      fetch(`/api/item?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(setItemList);
    }
  }

  async function ubahItemMeta(namaItem, patch) {
    const res = await fetch('/api/item', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: namaItem, ...patch }) }).then(r => r.json());
    if (cekSessionExpired(res)) return;
    if (res.sukses) fetch(`/api/item?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(setItemList);
    else setStatusItem(res);
  }

  async function pindahUrutanItem(namaItem, arah) {
    const idx = itemList.findIndex(i => i.nama === namaItem);
    const idxTujuan = idx + arah;
    if (idx === -1 || idxTujuan < 0 || idxTujuan >= itemList.length) return;
    const urutanBaru = [...itemList];
    [urutanBaru[idx], urutanBaru[idxTujuan]] = [urutanBaru[idxTujuan], urutanBaru[idx]];
    setItemList(urutanBaru); // optimistic, langsung keliatan gesernya
    setLoadingUrutan(true);
    const res = await fetch('/api/item', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urutan: urutanBaru.map(i => i.nama) }) }).then(r => r.json());
    setLoadingUrutan(false);
    if (cekSessionExpired(res)) return;
    if (!res.sukses) { setStatusItem(res); fetch(`/api/item?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(setItemList); }
  }

  function hapusItem(namaItem) {
    askConfirm('Hapus Jenis Pembayaran', `Yakin hapus jenis pembayaran "${namaItem}"? Semua data pembayaran item ini di SEMUA kelas ikut terhapus permanen.`, async () => {
      setConfirmDialog(null);
      setLoadingItem(true);
      const res = await fetch('/api/item', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: namaItem }) }).then(r => r.json());
      setLoadingItem(false);
      if (cekSessionExpired(res)) return;
      setStatusItem(res);
      if (res.sukses) {
        fetch(`/api/item?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(list => { setItemList(list); setKolom(list[0]?.kolom || ''); });
      }
    });
  }

  function kenaikanKelas() {
    askConfirm(
      'Kenaikan Kelas Tahunan',
      'Ini bakal mindahin SEMUA siswa: KELAS 1→2→3→4→5→6→ALUMNI, sekaligus. Data pembayaran (termasuk tunggakan) ikut pindah utuh, gak dihapus. KELAS 1 bakal kosong siap diisi siswa baru. Aksi ini gak bisa dibatalin gampang — yakin lanjut?',
      async () => {
        setConfirmDialog(null);
        setLoadingKenaikan(true);
        const res = await fetch('/api/kenaikan-kelas', { method: 'POST' }).then(r => r.json());
        setLoadingKenaikan(false);
        if (cekSessionExpired(res)) return;
        setStatusKenaikan(res);
        if (res.sukses) {
          fetch(`/api/siswa?kelas=${encodeURIComponent(kelasSiswa)}`).then(r => r.json()).then(list => { setSiswaHapusList(list); setSiswaHapus(list[0] || ''); });
        }
      }
    );
  }

  if (checking) return <LoadingScreen />;
  if (lisensiExpired) return <LisensiExpiredScreen pesan={lisensiPesan} />;
  if (!loggedIn) {
    return (
      <LoginScreen
        username={username} setUsername={setUsername}
        password={password} setPassword={setPassword}
        showPassword={showPassword} setShowPassword={setShowPassword}
        loginMsg={loginMsg} doLogin={doLogin}
      />
    );
  }

  const visibleTabs = role === 'admin' ? ['bayar', 'siswa', 'kas', 'log', 'rekap'] : ['bayar', 'kas', 'rekap'];
  const meta = TAB_META[tab];

  // Satu bungkusan prop buat semua tab — daripada nulis puluhan prop manual per komponen.
  const p = {
    kelas, setKelas, kelasList, siswa, setSiswa, siswaList,
    ppdbOn, setPpdbOn, ppdbGel, setPpdbGel, ppdbGender, setPpdbGender, ppdbNominal, setPpdbNominal,
    bukuOn, setBukuOn, bukuKelasPilih, setBukuKelasPilih, bukuNominal, setBukuNominal,
    sppOn, setSppOn, sppBulan, setSppBulan, sppNominal, setSppNominal, tabunganOn, setTabunganOn, tabunganNominal, setTabunganNominal,
    itemList, checkedItems, toggleCheckedItem, nominalPerItem, setNominalPerItem, modePerItem, setModePerItem,
    role, metodeBayar, setMetodeBayar, loadingBtn, submitData, statusBayar,
    itemValues, loadingRingkasan, kolom, setKolom,
    showPindah, setShowPindah, pindahKeKolom, setPindahKeKolom, pindahNominal, setPindahNominal, loadingPindah, pindahPembayaran, hapusData,

    kelasSiswa, setKelasSiswa, namaBaru, setNamaBaru, tambahSiswa, loadingSiswa,
    siswaHapus, setSiswaHapus, siswaHapusList, hapusSiswa, statusSiswa,
    cariSiswaKelola, setCariSiswaKelola,
    namaItemBaru, setNamaItemBaru, targetItemBaru, setTargetItemBaru,
    iconItemBaru, setIconItemBaru, kategoriItemBaru, setKategoriItemBaru,
    kelasItemBaru, setKelasItemBaru, tambahItem, loadingItem, statusItem,
    editItemNama, setEditItemNama, editItemTargetVal, setEditItemTargetVal, simpanTargetItem,
    ubahItemMeta, pindahUrutanItem, loadingUrutan, hapusItem,
    kenaikanKelas, loadingKenaikan, statusKenaikan,

    tanggalKas, setTanggalKas, kas, loadingKas, loadKas,
    ketPengeluaran, setKetPengeluaran, nominalPengeluaran, setNominalPengeluaran,
    loadingPengeluaran, tambahPengeluaran, statusKas,

    tanggalLog, setTanggalLog, logData, loadingLog, loadLog,

    rekap, loadRekap, rekapKelasFilter, setRekapKelasFilter,
    kelasDetailPilih, setKelasDetailPilih, cariSiswaDetail, setCariSiswaDetail,
    loadingDetail, kelasDetail, varianFilter, setVarianFilter,
  };

  return (
    <div className="app-shell">
      <Sidebar
        visibleTabs={visibleTabs} tab={tab} setTab={setTab} nama={nama} role={role} doLogout={doLogout}
        mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
      />

      <div className="main">
        <div className="main-topbar">
          <div>
            <div className="breadcrumb">Dashboard <span>/</span> <span className="current">{meta.title}</span></div>
            <h1><span className="ic-badge"><Icon name={meta.icon} size={16} /></span> {meta.title}</h1>
            <div className="desc">{meta.desc}</div>
          </div>
        </div>

        {lisensiPeringatan && (
          <div className="license-warning no-print">
            ⚠️ Masa aktif dashboard tinggal <b>{lisensiPeringatan.hariTersisa} hari</b> (sampai {lisensiPeringatan.tanggalExpiry}) — hubungi admin buat perpanjang.
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div className="main-content" key={tab} {...fadeSlide}>
            {tab === 'bayar' && <BayarTab p={p} />}
            {tab === 'siswa' && role === 'admin' && <SiswaTab p={p} />}
            {tab === 'kas' && <KasTab p={p} />}
            {tab === 'log' && role === 'admin' && <LogTab p={p} />}
            {tab === 'rekap' && <RekapTab p={p} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <ConfirmDialog confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog} />
    </div>
  );
}
