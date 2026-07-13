'use client';
import { useEffect, useState } from 'react';
import { hitungStatus } from '@/lib/target';
import { Icon } from '@/lib/icons';

const STATUS_LABEL = { lunas: 'Lunas', cicil: 'Nyicil', belum: 'Belum bayar' };

const rp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
const rpSigned = (n) => (n < 0 ? '-Rp ' + Math.abs(n).toLocaleString('id-ID') : 'Rp ' + n.toLocaleString('id-ID'));
const initials = (name) => (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const onlyDigits = (s) => s.replace(/\D/g, '');
const formatRibuan = (s) => onlyDigits(s).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// Nominal singkat buat chip sempit: 150000 -> "150rb", 1200000 -> "1,2jt"
const rpSingkat = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1).replace('.', ',') + 'jt';
  if (n >= 1000) return Math.round(n / 1000) + 'rb';
  return String(n);
};
const ddmmyyyyToIso = (s) => { const [d, m, y] = s.split('/'); return `${y}-${m}-${d}`; };
const isoToDdmmyyyy = (s) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };

const TAB_META = {
  bayar: { title: 'Pembayaran', desc: 'Input & kelola pembayaran per siswa', icon: 'money' },
  siswa: { title: 'Kelola Siswa', desc: 'Tambah atau hapus data siswa', icon: 'students' },
  kas: { title: 'Keuangan Harian', desc: 'Catatan uang masuk & keluar per hari', icon: 'wallet' },
  log: { title: 'Log Aktivitas', desc: 'Riwayat semua perubahan data', icon: 'clock' },
  rekap: { title: 'Rekap & Statistik', desc: 'Ringkasan pembayaran seluruh kelas', icon: 'chart' },
};

const AKSI_LABEL = {
  'submit-pembayaran': { label: 'Setor Pembayaran', color: 'lunas' },
  'edit-langsung': { label: 'Koreksi Nilai', color: 'cicil' },
  'edit-manual': { label: 'Edit Langsung di Sheet', color: 'cicil' },
  'hapus-pembayaran': { label: 'Hapus Pembayaran', color: 'belum' },
  'pindah-pembayaran': { label: 'Pindah Item', color: 'cicil' },
  'tambah-siswa': { label: 'Tambah Siswa', color: 'lunas' },
  'hapus-siswa': { label: 'Hapus Siswa', color: 'belum' },
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

  const [kelasList, setKelasList] = useState([]);
  const [kelas, setKelas] = useState('');
  const [siswaList, setSiswaList] = useState([]);
  const [siswa, setSiswa] = useState('');
  const [itemList, setItemList] = useState([]);
  const [kolom, setKolom] = useState('');
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [nominalPerItem, setNominalPerItem] = useState({});
  const [metodeBayar, setMetodeBayar] = useState('Cash');
  const [statusBayar, setStatusBayar] = useState(null);
  const [loadingBtn, setLoadingBtn] = useState(false);
  const [itemValues, setItemValues] = useState({});
  const [cariSiswaBayar, setCariSiswaBayar] = useState('');

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
  const [statusItem, setStatusItem] = useState(null);
  const [loadingItem, setLoadingItem] = useState(false);
  const [cariSiswaDetail, setCariSiswaDetail] = useState('');

  const [rekap, setRekap] = useState(null);
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
    fetch(`/api/siswa?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(list => { setSiswaList(list); setSiswa(list[0] || ''); });
    fetch(`/api/item?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(list => { setItemList(list); setKolom(list[0]?.kolom || ''); });
  }, [kelas]);

  // Kalau hasil pencarian bikin siswa yg lagi dipilih ilang dari daftar opsi, ikutin ke opsi pertama yang cocok
  // (browser <select> ganti tampilan otomatis kalau opsi lama hilang, tapi gak trigger onChange — state React bisa nyangkut beda dari yang keliatan)
  useEffect(() => {
    const filtered = siswaList.filter(s => s.toLowerCase().includes(cariSiswaBayar.toLowerCase()));
    if (filtered.length > 0 && !filtered.includes(siswa)) setSiswa(filtered[0]);
  }, [cariSiswaBayar, siswaList]);

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
    const row = await fetch(`/api/payment/row?kelas=${encodeURIComponent(kelas)}&siswa=${encodeURIComponent(siswa)}`).then(r => r.json());
    setItemValues(row);
  }

  function cekSessionExpired(res) {
    if (res && res.sessionExpired) { alert('Session habis, silakan login ulang'); doLogout(); return true; }
    return false;
  }

  async function doLogin() {
    if (!username.trim() || !password.trim()) { alert('Isi username dan password'); return; }
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }).then(r => r.json());
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
    const data = await fetch('/api/rekap').then(r => r.json());
    setRekap(data);
  }

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
    if (!ketPengeluaran.trim() || !nominalPengeluaran) { alert('Isi keterangan dan nominal dulu'); return; }
    const res = await fetch('/api/kas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keterangan: ketPengeluaran, nominal: onlyDigits(nominalPengeluaran) }) }).then(r => r.json());
    if (cekSessionExpired(res)) return;
    setStatusKas(res);
    if (res.sukses) {
      setKetPengeluaran(''); setNominalPengeluaran('');
      loadKas();
    }
  }

  async function submitData() {
    const daftarBayar = Array.from(checkedItems).filter(k => onlyDigits(nominalPerItem[k] || ''));
    if (daftarBayar.length === 0) { alert('Centang minimal 1 item dan isi nominalnya'); return; }

    setLoadingBtn(true);
    const hasil = [];
    for (const k of daftarBayar) {
      const res = await fetch('/api/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kelas, siswa, kolom: k, nominal: onlyDigits(nominalPerItem[k]), metode: metodeBayar, mode: modePerItem[k] || 'tambah' }),
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
    if (!namaBaru.trim()) { alert('Isi nama siswa dulu'); return; }
    const res = await fetch('/api/siswa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kelas: kelasSiswa, nama: namaBaru }) }).then(r => r.json());
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
      setConfirmDialog(null);
      const res = await fetch('/api/siswa', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kelas: kelasSiswa, nama: siswaHapus }) }).then(r => r.json());
      if (cekSessionExpired(res)) return;
      setStatusSiswa(res);
      fetch(`/api/siswa?kelas=${encodeURIComponent(kelasSiswa)}`).then(r => r.json()).then(list => { setSiswaHapusList(list); setSiswaHapus(list[0] || ''); });
      if (kelasSiswa === kelas) fetch(`/api/siswa?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(setSiswaList);
    });
  }

  async function tambahItem() {
    if (!namaItemBaru.trim() || !targetItemBaru) { alert('Isi nama item dan target harga dulu'); return; }
    setLoadingItem(true);
    const res = await fetch('/api/item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: namaItemBaru, target: onlyDigits(targetItemBaru) }) }).then(r => r.json());
    setLoadingItem(false);
    if (cekSessionExpired(res)) return;
    setStatusItem(res);
    if (res.sukses) {
      setNamaItemBaru(''); setTargetItemBaru('');
      fetch(`/api/item?kelas=${encodeURIComponent(kelas)}`).then(r => r.json()).then(list => { setItemList(list); setKolom(list[0]?.kolom || ''); });
    }
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

  if (checking) return null;

  if (lisensiExpired) {
    return (
      <div className="login-shell">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="license-lock-icon">🔒</div>
          <h2>Masa Aktif Habis</h2>
          <div className="subtitle" style={{ marginBottom: 0 }}>{lisensiPesan}</div>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="login-shell">
        <div className="card">
          <img src="/logo-mi.png" alt="Logo MI Unwanul Huda 1" className="login-logo-img" />
          <h2>Dashboard Pembayaran Siswa</h2>
          <div className="subtitle">MI Unwanul Huda 1 — Masuk untuk mengelola data pembayaran</div>
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" onKeyDown={e => e.key === 'Enter' && doLogin()} />
          <button onClick={doLogin}>Masuk</button>
          {loginMsg && <div className="status gagal">{loginMsg}</div>}
        </div>
      </div>
    );
  }

  const totalTerkumpul = rekap ? rekap.perItem.reduce((s, i) => s + i.nominal, 0) : 0;
  const totalSiswaSemua = rekap ? rekap.perKelas.reduce((s, k) => s + k.totalSiswa, 0) : 0;
  const rataPersenLunas = rekap && rekap.perKelas.length
    ? Math.round(rekap.perKelas.reduce((s, k) => s + k.persenLunas, 0) / rekap.perKelas.length)
    : 0;

  const visibleTabs = role === 'admin' ? ['bayar', 'siswa', 'kas', 'log', 'rekap'] : ['bayar', 'kas', 'rekap'];
  const meta = TAB_META[tab];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo-mi.png" alt="Logo MI Unwanul Huda 1" className="logo-img" />
          <div>Dashboard Pembayaran<br /><small>MI Unwanul Huda 1</small></div>
        </div>

        <div className="nav-section-label">Menu</div>
        <nav>
          {visibleTabs.map(t => (
            <div key={t} className={`nav-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              <span className="ic"><Icon name={TAB_META[t].icon} size={17} /></span> {TAB_META[t].title}
            </div>
          ))}
        </nav>

        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menu"><Icon name="menu" size={18} /></button>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{initials(nama)}</div>
            <div className="who">
              <div className="n">{nama}</div>
              <div className="r">{role}</div>
            </div>
          </div>
          <a className="logout-link" onClick={doLogout}><Icon name="logout" size={15} /> <span className="lbl">Logout</span></a>
        </div>
      </aside>

      {mobileMenuOpen && (
        <>
          <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-menu-dropdown">
            {visibleTabs.map(t => (
              <div key={t} className={`nav-item ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setMobileMenuOpen(false); }}>
                <span className="ic"><Icon name={TAB_META[t].icon} size={17} /></span> {TAB_META[t].title}
              </div>
            ))}
            <div className="mobile-menu-user">
              <div className="avatar">{initials(nama)}</div>
              <div className="who"><div className="n">{nama}</div><div className="r">{role}</div></div>
            </div>
            <div className="nav-item" onClick={doLogout}><span className="ic"><Icon name="logout" size={17} /></span> Logout</div>
          </div>
        </>
      )}

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

        <div className="main-content" key={tab}>
          {tab === 'rekap' && (
            <div className="stat-grid">
              <div className="stat-tile">
                <div className="icon-badge blue"><Icon name="case" size={20} /></div>
                <div><div className="label">Total Kelas</div><div className="value">{rekap?.perKelas.length ?? '—'}</div></div>
              </div>
              <div className="stat-tile">
                <div className="icon-badge amber"><Icon name="students" size={20} /></div>
                <div><div className="label">Total Siswa</div><div className="value">{totalSiswaSemua || '—'}</div></div>
              </div>
              <div className="stat-tile">
                <div className="icon-badge green"><Icon name="money" size={20} /></div>
                <div><div className="label">Total Terkumpul</div><div className="value value-money">{rp(totalTerkumpul)}</div></div>
              </div>
              <div className="stat-tile">
                <div className="icon-badge rose"><Icon name="check" size={20} /></div>
                <div><div className="label">Rata² % Lunas</div><div className="value">{rataPersenLunas}%</div></div>
              </div>
            </div>
          )}

          {tab === 'bayar' && (
            <div className="bayar-grid">
              <div className="panel">
                <div className="panel-title"><span className="ic-badge"><Icon name="edit" size={14} /></span> Input Pembayaran</div>
                <div className="panel-desc">Centang item yang dibayar (bisa lebih dari 1), isi nominalnya, pilih metode</div>

                <label>Pilih Kelas</label>
                <select value={kelas} onChange={e => setKelas(e.target.value)}>
                  {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                </select>

                <label>Cari Nama Siswa</label>
                <div className="search-box">
                  <span className="search-ic"><Icon name="search" size={15} /></span>
                  <input value={cariSiswaBayar} onChange={e => setCariSiswaBayar(e.target.value)} placeholder="ketik nama siswa..." />
                </div>

                <label style={{ marginTop: 10 }}>Pilih Nama Siswa</label>
                <select value={siswa} onChange={e => setSiswa(e.target.value)}>
                  {siswaList.filter(s => s.toLowerCase().includes(cariSiswaBayar.toLowerCase())).map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <hr className="field-divider" />

                <label>Item yang Dibayar <span style={{ fontWeight: 'normal', color: 'var(--muted)' }}>(nominal &lt;1000 otomatis dikali 1000)</span></label>
                <div className="checkout-list">
                  {itemList.map(i => {
                    const checked = checkedItems.has(i.kolom);
                    const val = Number(itemValues[i.kolom]) || 0;
                    const status = hitungStatus(val, i.target);
                    return (
                      <div key={i.kolom} className={`checkout-row ${checked ? 'checked' : ''}`}>
                        <label className="checkout-check">
                          <input type="checkbox" checked={checked} onChange={() => toggleCheckedItem(i.kolom)} />
                          <span className="nm">{i.nama}</span>
                          <span className={`status-chip ${status}`} style={{ fontSize: 10 }}>{status === 'lunas' ? '✓' : status === 'cicil' ? 'nyicil' : 'belum'}</span>
                        </label>
                        {checked && (
                          <>
                            <input
                              type="text" inputMode="numeric" className="checkout-nominal"
                              placeholder={modePerItem[i.kolom] === 'set' ? 'nilai total yang benar' : 'nominal setoran'}
                              value={nominalPerItem[i.kolom] || ''}
                              onChange={e => setNominalPerItem(prev => ({ ...prev, [i.kolom]: formatRibuan(e.target.value) }))}
                            />
                            {role === 'admin' && (
                              <label className="mode-toggle">
                                <input
                                  type="checkbox"
                                  checked={modePerItem[i.kolom] === 'set'}
                                  onChange={e => setModePerItem(prev => ({ ...prev, [i.kolom]: e.target.checked ? 'set' : 'tambah' }))}
                                />
                                Timpa nilai langsung (koreksi salah input, bukan nambah)
                              </label>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <label>Metode Pembayaran</label>
                <select value={metodeBayar} onChange={e => setMetodeBayar(e.target.value)}>
                  <option value="Cash">💵 Cash</option>
                  <option value="Transfer">🏦 Transfer</option>
                  <option value="QRIS">📱 QRIS</option>
                </select>

                <button disabled={loadingBtn} onClick={submitData} className="btn-icon">
                  {loadingBtn ? <span className="spinner" /> : <Icon name="save" size={16} />} Simpan {checkedItems.size > 0 ? `(${checkedItems.size} item)` : ''}
                </button>
                {statusBayar && <div className={`status ${statusBayar.sukses ? 'sukses' : 'gagal'}`}>{statusBayar.pesan}</div>}
              </div>

              <div className="panel">
                <div className="panel-title"><span className="ic-badge"><Icon name="list" size={14} /></span> Ringkasan Pembayaran Siswa</div>
                <div className="panel-desc">Status semua item untuk siswa yang dipilih</div>

                {siswa && (
                  <div className="siswa-card">
                    <div className="avatar">{initials(siswa)}</div>
                    <div>
                      <div className="nm">{siswa}</div>
                      <div className="kl">{kelas}</div>
                    </div>
                  </div>
                )}

                <div className="item-status-list">
                  {itemList.map(i => {
                    const val = Number(itemValues[i.kolom]) || 0;
                    const status = hitungStatus(val, i.target);
                    const pct = i.target ? Math.min(100, Math.round((val / i.target) * 100)) : (val ? 100 : 0);
                    const sisa = i.target ? val - i.target : null;
                    return (
                      <div key={i.kolom} className={`item-status-row ${String(i.kolom) === String(kolom) ? 'selected' : ''}`} onClick={() => setKolom(i.kolom)}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="nm" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span><span className={`badge-dot ${status === 'lunas' ? 'paid' : 'unpaid'}`} />{i.nama}</span>
                            <span className={`val ${status === 'lunas' ? 'paid' : 'unpaid'}`}>
                              {val ? rp(val) : 'Belum bayar'}{i.target ? ` / ${rp(i.target)}` : ''}
                            </span>
                          </div>
                          {status === 'cicil' && (
                            <>
                              <div className="bar-track" style={{ marginTop: 6, height: 6 }}>
                                <div className="bar-fill" style={{ width: `${pct}%`, background: 'var(--gold)' }} />
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginTop: 4, textAlign: 'right' }}>
                                Sisa {rpSigned(sisa)}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {role === 'admin' && siswa && kolom && Number(itemValues[kolom]) > 0 && (
                  <div className="fix-actions">
                    <button className="secondary btn-icon" style={{ width: 'auto' }} onClick={() => setShowPindah(v => !v)}>
                      <Icon name="refresh" size={13} /> Salah pilih item? Pindahkan
                    </button>

                    {showPindah && (
                      <div className="pindah-box">
                        <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
                          Pindahkan dari "<b>{itemList.find(i => String(i.kolom) === String(kolom))?.nama}</b>" ke item lain
                        </div>
                        <select value={pindahKeKolom} onChange={e => setPindahKeKolom(e.target.value)}>
                          <option value="">Pilih item tujuan...</option>
                          {itemList.filter(i => String(i.kolom) !== String(kolom)).map(i => (
                            <option key={i.kolom} value={i.kolom}>{i.nama}</option>
                          ))}
                        </select>
                        <input
                          type="text" inputMode="numeric"
                          placeholder={`nominal (kosongin = pindah semua Rp ${rp(itemValues[kolom])})`}
                          value={pindahNominal}
                          onChange={e => setPindahNominal(formatRibuan(e.target.value))}
                        />
                        <button disabled={loadingPindah} onClick={pindahPembayaran} className="btn-icon">
                          {loadingPindah ? <span className="spinner" /> : <Icon name="refresh" size={14} />} Pindahkan Sekarang
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {role === 'admin' && siswa && kolom && (
                  <button
                    className="ghost-danger btn-icon"
                    style={{ marginTop: 10 }}
                    disabled={loadingBtn}
                    onClick={hapusData}
                  >
                    <Icon name="trash" size={13} /> Hapus data "{itemList.find(i => String(i.kolom) === String(kolom))?.nama}" milik {siswa}
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === 'siswa' && role === 'admin' && (
            <div className="bayar-grid">
              <div className="panel">
                <div className="panel-title"><span className="ic-badge"><Icon name="students" size={14} /></span> Kelola Siswa</div>
                <div className="panel-desc">Tambah atau hapus siswa dari kelas tertentu</div>

                <label>Pilih Kelas</label>
                <select value={kelasSiswa} onChange={e => setKelasSiswa(e.target.value)}>
                  {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                </select>

                <label>Tambah Nama Siswa Baru</label>
                <input value={namaBaru} onChange={e => setNamaBaru(e.target.value)} placeholder="Nama siswa baru" onKeyDown={e => e.key === 'Enter' && tambahSiswa()} />
                <button onClick={tambahSiswa} className="btn-icon"><Icon name="plus" size={15} /> Tambah Siswa</button>

                <hr className="field-divider" />

                <label>Siswa Dipilih untuk Dihapus</label>
                <select value={siswaHapus} onChange={e => setSiswaHapus(e.target.value)}>
                  {siswaHapusList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="ghost-danger btn-icon" style={{ width: '100%' }} onClick={hapusSiswa}><Icon name="trash" size={14} /> Hapus Siswa Ini</button>

                {statusSiswa && <div className={`status ${statusSiswa.sukses ? 'sukses' : 'gagal'}`}>{statusSiswa.pesan}</div>}
              </div>

              <div className="panel">
                <div className="panel-title"><span className="ic-badge"><Icon name="list" size={14} /></span> Daftar Siswa — {kelasSiswa}</div>
                <div className="panel-desc">{siswaHapusList.length} siswa terdaftar — klik untuk pilih target hapus</div>

                <div className="search-box" style={{ marginBottom: 12 }}>
                  <span className="search-ic"><Icon name="search" size={15} /></span>
                  <input value={cariSiswaKelola} onChange={e => setCariSiswaKelola(e.target.value)} placeholder="cari nama siswa..." />
                </div>

                <div className="siswa-list">
                  {siswaHapusList.length === 0 && <div className="empty-state">Belum ada siswa di kelas ini</div>}
                  {siswaHapusList.filter(s => s.toLowerCase().includes(cariSiswaKelola.toLowerCase())).map(s => (
                    <div key={s} className={`siswa-list-row ${s === siswaHapus ? 'selected' : ''}`} onClick={() => setSiswaHapus(s)}>
                      <div className="avatar-sm">{initials(s)}</div>
                      <div className="nm">{s}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel" style={{ gridColumn: '1 / -1' }}>
                <div className="panel-title"><span className="ic-badge"><Icon name="plus" size={14} /></span> Tambah Jenis Pembayaran Baru</div>
                <div className="panel-desc">Otomatis nambah kolom baru di semua sheet kelas — misal "SERAGAM" atau "STUDY TOUR 2"</div>

                <div className="form-grid">
                  <div>
                    <label>Nama Item</label>
                    <input value={namaItemBaru} onChange={e => setNamaItemBaru(e.target.value)} placeholder="contoh: SERAGAM" />
                  </div>
                  <div>
                    <label>Target Harga</label>
                    <input type="text" inputMode="numeric" value={targetItemBaru} onChange={e => setTargetItemBaru(formatRibuan(e.target.value))} placeholder="contoh: 200.000" />
                  </div>
                </div>
                <button disabled={loadingItem} onClick={tambahItem} className="btn-icon" style={{ maxWidth: 260 }}>
                  {loadingItem ? <span className="spinner" /> : <Icon name="plus" size={15} />} Tambah Jenis Pembayaran
                </button>
                {statusItem && <div className={`status ${statusItem.sukses ? 'sukses' : 'gagal'}`}>{statusItem.pesan}</div>}

                <div className="subsection-title">Jenis Pembayaran Aktif ({itemList.length})</div>
                <div className="item-manage-list">
                  {itemList.map(i => (
                    <div key={i.kolom} className="item-manage-row">
                      <span className="nm">{i.nama}</span>
                      <span className="target">{i.target ? rp(i.target) : 'tanpa target'}</span>
                      <button className="ghost-danger btn-icon" style={{ width: 'auto', padding: '5px 10px' }} disabled={loadingItem} onClick={() => hapusItem(i.nama)}>
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'kas' && (
            <div className="bayar-grid">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title"><span className="ic-badge"><Icon name="wallet" size={14} /></span> {tanggalKas === 'semua' ? 'Kas Semua Tanggal' : 'Kas Hari Ini'}</div>
                    <div className="panel-desc">{kas ? kas.tanggal : '—'}</div>
                  </div>
                  <div className="toolbar">
                    <input
                      type="date"
                      value={tanggalKas && tanggalKas !== 'semua' ? ddmmyyyyToIso(tanggalKas) : ''}
                      onChange={e => setTanggalKas(e.target.value ? isoToDdmmyyyy(e.target.value) : '')}
                    />
                    <button className={`secondary action-btn btn-icon ${tanggalKas === 'semua' ? 'active-toggle' : ''}`} onClick={() => setTanggalKas(tanggalKas === 'semua' ? '' : 'semua')}>
                      <Icon name="list" size={14} /> {tanggalKas === 'semua' ? 'Kembali ke Hari Ini' : 'Lihat Semua'}
                    </button>
                    <button className="secondary action-btn btn-icon" onClick={loadKas}><Icon name="refresh" size={14} /> Refresh</button>
                  </div>
                </div>

                {loadingKas && <div className="empty-state"><span className="spinner" />Memuat...</div>}
                {!loadingKas && kas && (
                  <>
                    <div className="stat-grid" style={{ marginBottom: 20 }}>
                      <div className="stat-tile">
                        <div className="icon-badge green"><Icon name="down" size={20} /></div>
                        <div><div className="label">Uang Masuk</div><div className="value value-money">{rp(kas.masuk)}</div></div>
                      </div>
                      <div className="stat-tile">
                        <div className="icon-badge rose"><Icon name="up" size={20} /></div>
                        <div><div className="label">Uang Keluar</div><div className="value value-money">{rp(kas.keluar)}</div></div>
                      </div>
                      <div className="stat-tile">
                        <div className="icon-badge blue"><Icon name="case" size={20} /></div>
                        <div><div className="label">Saldo Hari Ini</div><div className="value value-money">{rpSigned(kas.saldo)}</div></div>
                      </div>
                    </div>

                    <div className="subsection-title">Rekap Setoran per Item</div>
                    <div className="table-wrap" style={{ marginBottom: 20 }}>
                      <table>
                        <thead><tr><th>Item</th><th className="num">Jumlah Orang</th><th className="num">Total Rp</th></tr></thead>
                        <tbody>
                          {kas.rekapPerItem.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)' }}>Belum ada setoran hari ini</td></tr>}
                          {kas.rekapPerItem.map((r, i) => (
                            <tr key={i}><td>{r.item}</td><td className="num">{r.orang}</td><td className="num">{rp(r.total)}</td></tr>
                          ))}
                        </tbody>
                        {kas.rekapPerItem.length > 0 && (
                          <tfoot>
                            <tr>
                              <td style={{ fontWeight: 700 }}>Total</td>
                              <td className="num" style={{ fontWeight: 700 }}>{kas.rekapPerItem.reduce((s, r) => s + r.orang, 0)}</td>
                              <td className="num" style={{ fontWeight: 700 }}>{rp(kas.masuk)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    <details className="collapsible" style={{ marginBottom: 12 }}>
                      <summary>Detail Transaksi Masuk ({kas.transaksiMasuk.length})</summary>
                      <div className="table-wrap">
                        <table>
                          <thead><tr>{kas.semua && <th>Tanggal</th>}<th>Jam</th><th>Siswa</th><th>Item</th><th className="num">Rp</th></tr></thead>
                          <tbody>
                            {kas.transaksiMasuk.length === 0 && <tr><td colSpan={kas.semua ? 5 : 4} style={{ textAlign: 'center', color: 'var(--muted)' }}>Belum ada setoran</td></tr>}
                            {kas.transaksiMasuk.map((t, i) => (
                              <tr key={i}>{kas.semua && <td>{t.tanggal}</td>}<td>{t.jam}</td><td>{t.siswa} <span style={{ color: 'var(--muted)' }}>({t.kelas})</span></td><td>{t.item}</td><td className="num">{rp(t.nominal)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>

                    <details className="collapsible">
                      <summary>Detail Pengeluaran ({kas.transaksiKeluar.length})</summary>
                      <div className="table-wrap">
                        <table>
                          <thead><tr>{kas.semua && <th>Tanggal</th>}<th>Keterangan</th><th>Dicatat</th><th className="num">Rp</th></tr></thead>
                          <tbody>
                            {kas.transaksiKeluar.length === 0 && <tr><td colSpan={kas.semua ? 4 : 3} style={{ textAlign: 'center', color: 'var(--muted)' }}>Belum ada pengeluaran</td></tr>}
                            {kas.transaksiKeluar.map((t, i) => (
                              <tr key={i}>{kas.semua && <td>{t.tanggal}</td>}<td>{t.keterangan}</td><td>{t.user}</td><td className="num">{rp(t.nominal)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </>
                )}
              </div>

              {role === 'admin' && (
                <div className="panel">
                  <div className="panel-title"><span className="ic-badge"><Icon name="minus" size={14} /></span> Catat Pengeluaran</div>
                  <div className="panel-desc">Tercatat otomatis tanggal hari ini</div>

                  <label>Keterangan</label>
                  <input value={ketPengeluaran} onChange={e => setKetPengeluaran(e.target.value)} placeholder="contoh: Beli ATK kantor" />

                  <label>Nominal</label>
                  <input type="text" inputMode="numeric" value={nominalPengeluaran} onChange={e => setNominalPengeluaran(formatRibuan(e.target.value))} placeholder="contoh: 150.000" />

                  <button className="danger btn-icon" onClick={tambahPengeluaran}><Icon name="minus" size={15} /> Catat Pengeluaran</button>
                  {statusKas && <div className={`status ${statusKas.sukses ? 'sukses' : 'gagal'}`}>{statusKas.pesan}</div>}
                </div>
              )}
            </div>
          )}

          {tab === 'log' && role === 'admin' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title"><span className="ic-badge"><Icon name="clock" size={14} /></span> Log Aktivitas</div>
                  <div className="panel-desc">{logData ? logData.tanggal : '—'}{logData?.total ? ` — ${logData.total} kejadian` : ''}</div>
                </div>
                <div className="toolbar">
                  <input
                    type="date"
                    value={tanggalLog && tanggalLog !== 'semua' ? ddmmyyyyToIso(tanggalLog) : ''}
                    onChange={e => setTanggalLog(e.target.value ? isoToDdmmyyyy(e.target.value) : '')}
                  />
                  <button className={`secondary action-btn btn-icon ${tanggalLog === 'semua' ? 'active-toggle' : ''}`} onClick={() => setTanggalLog(tanggalLog === 'semua' ? '' : 'semua')}>
                    <Icon name="list" size={14} /> {tanggalLog === 'semua' ? 'Kembali ke Hari Ini' : 'Lihat Semua'}
                  </button>
                  <button className="secondary action-btn btn-icon" onClick={loadLog}><Icon name="refresh" size={14} /> Refresh</button>
                </div>
              </div>

              {loadingLog && <div className="empty-state"><span className="spinner" />Memuat...</div>}
              {!loadingLog && logData && (
                <>
                  {logData.dipotong && <div className="status gagal" style={{ marginBottom: 14 }}>Cuma nampilin 200 kejadian terbaru dari {logData.total} total — persempit tanggal buat lihat lebih detail.</div>}
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Jam</th><th>Aksi</th><th>User</th><th>Kelas</th><th>Siswa</th><th>Item</th><th className="num">Lama → Baru</th><th>Metode</th></tr></thead>
                      <tbody>
                        {logData.entries.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)' }}>Belum ada aktivitas</td></tr>}
                        {logData.entries.map((e, i) => {
                          const meta = AKSI_LABEL[e.aksi] || { label: e.aksi, color: 'belum' };
                          const [tgl, jam] = e.waktu.split(' ');
                          return (
                            <tr key={i}>
                              <td>{jam}{logData.semua && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{tgl}</div>}</td>
                              <td><span className={`status-chip ${meta.color}`} style={{ fontSize: 10.5 }}>{meta.label}</span></td>
                              <td>{e.user}</td>
                              <td>{e.kelas}</td>
                              <td>{e.siswa}</td>
                              <td>{e.item}</td>
                              <td className="num">{e.lama || e.baru ? `${e.lama ? rp(e.lama) : '-'} → ${e.baru ? rp(e.baru) : '-'}` : '-'}</td>
                              <td>{e.metode || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'rekap' && (
            <>
              <div id="print-header">
                <img src="/logo-mi.png" alt="" />
                <div>
                  <h2>MI Unwanul Huda 1</h2>
                  <div>Laporan Rekap Pembayaran Siswa — dicetak {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>

              <div className="report-toolbar no-print">
                <div>
                  <button className="secondary btn-icon" onClick={() => window.print()}><Icon name="receipt" size={15} /> Cetak / Simpan PDF</button>
                  <div className="hint-text">Di jendela print, pilih tujuan "Save as PDF" buat download filenya</div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title"><span className="ic-badge"><Icon name="chart" size={14} /></span> % Lunas per Kelas</div>
                    <div className="panel-desc">Persentase siswa yang sudah membayar semua item</div>
                  </div>
                  <button className="secondary action-btn btn-icon no-print" onClick={loadRekap}><Icon name="refresh" size={14} /> Refresh</button>
                </div>
                {rekap?.perKelas.map(k => (
                  <div className="bar-row" key={k.kelas}>
                    <div className="name" title={k.kelas}>{k.kelas}</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${k.persenLunas}%` }} /></div>
                    <div className="pct">{k.persenLunas}%</div>
                  </div>
                ))}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title"><span className="ic-badge"><Icon name="list" size={14} /></span> Data Siswa per Kelas</div>
                    <div className="panel-desc">Status pembayaran tiap siswa, per item</div>
                  </div>
                  <select className="no-print" style={{ width: 'auto', margin: 0 }} value={kelasDetailPilih} onChange={e => setKelasDetailPilih(e.target.value)}>
                    {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                <div className="search-box no-print" style={{ marginBottom: 12, maxWidth: 320 }}>
                  <span className="search-ic"><Icon name="search" size={15} /></span>
                  <input value={cariSiswaDetail} onChange={e => setCariSiswaDetail(e.target.value)} placeholder="cari nama siswa..." />
                </div>

                {loadingDetail && <div className="empty-state"><span className="spinner" />Memuat...</div>}
                {!loadingDetail && kelasDetail && (
                  <div className="table-wrap">
                    <table className="matrix-table">
                      <thead>
                        <tr>
                          <th>Nama Siswa</th>
                          {kelasDetail.items.map(it => <th key={it.kolom}>{it.nama}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {kelasDetail.siswa.filter(s => s.nama.toLowerCase().includes(cariSiswaDetail.toLowerCase())).length === 0 && (
                          <tr><td colSpan={kelasDetail.items.length + 1} style={{ textAlign: 'center', color: 'var(--muted)' }}>Tidak ada siswa yang cocok</td></tr>
                        )}
                        {kelasDetail.siswa.filter(s => s.nama.toLowerCase().includes(cariSiswaDetail.toLowerCase())).map(s => (
                          <tr key={s.nama}>
                            <td>{s.nama}</td>
                            {kelasDetail.items.map(it => {
                              const val = Number(s.values[it.kolom]) || 0;
                              const status = hitungStatus(val, it.target);
                              const sisa = it.target ? it.target - val : null;
                              const tooltip = status === 'lunas'
                                ? `Lunas — ${rp(val)}`
                                : status === 'cicil'
                                ? `Sudah masuk ${rp(val)}${it.target ? `, sisa ${rp(sisa)}` : ''}`
                                : it.target ? `Belum bayar — target ${rp(it.target)}` : 'Belum bayar';
                              return (
                                <td key={it.kolom} title={tooltip}>
                                  <span className={`status-chip ${status}`}>
                                    {status === 'lunas' ? '✓' : status === 'cicil' ? rpSingkat(val) : '—'}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="two-col-panels">
                <div className="panel">
                  <div className="panel-title"><span className="ic-badge"><Icon name="receipt" size={14} /></span> Rekap per Item</div>
                  <div className="panel-desc">Jumlah siswa terisi & total nominal per jenis pembayaran</div>
                  <div className="table-wrap">
                    <table><thead><tr><th>Item</th><th className="num">Terisi</th><th className="num">Total Rp</th></tr></thead>
                      <tbody>{rekap?.perItem.map(i => <tr key={i.kolom}><td>{i.nama}</td><td className="num">{i.terisi}</td><td className="num">{rp(i.nominal)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-title"><span className="ic-badge"><Icon name="clock" size={14} /></span> Bayar Hari Ini</div>
                  <div className="panel-desc">Transaksi yang masuk hari ini</div>
                  <div className="table-wrap">
                    <table><thead><tr><th>Kelas</th><th>Siswa</th><th>Item</th><th className="num">Rp</th></tr></thead>
                      <tbody>
                        {rekap && rekap.bayarHariIni.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>Belum ada transaksi hari ini</td></tr>}
                        {rekap?.bayarHariIni.map((b, i) => <tr key={i}><td>{b.kelas}</td><td>{b.siswa}</td><td>{b.item}</td><td className="num">{rp(b.nominal)}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmDialog && (
        <div className="confirm-backdrop" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon"><Icon name="trash" size={22} /></div>
            <h3>{confirmDialog.title}</h3>
            <p>{confirmDialog.message}</p>
            <div className="confirm-actions">
              <button className="secondary" onClick={() => setConfirmDialog(null)}>Batal</button>
              <button className="danger" onClick={confirmDialog.onConfirm}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
