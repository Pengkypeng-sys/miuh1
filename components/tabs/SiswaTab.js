'use client';
import { Icon } from '@/lib/icons';
import { initials } from '@/lib/format';

export function SiswaTab({ p }) {
  const {
    kelasSiswa, setKelasSiswa, kelasList, namaBaru, setNamaBaru, tambahSiswa, loadingSiswa,
    siswaHapus, setSiswaHapus, siswaHapusList, hapusSiswa, statusSiswa,
    cariSiswaKelola, setCariSiswaKelola,
  } = p;

  return (
    <div className="bayar-grid">
      <div className="panel">
        <div className="panel-title"><span className="ic-badge"><Icon name="userPlus" size={14} /></span> Kelola Siswa</div>
        <div className="panel-desc">Tambah atau hapus siswa dari kelas tertentu</div>

        <label>Pilih Kelas</label>
        <select value={kelasSiswa} onChange={e => setKelasSiswa(e.target.value)}>
          {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <label>Tambah Nama Siswa Baru</label>
        <input value={namaBaru} onChange={e => setNamaBaru(e.target.value)} placeholder="Nama siswa baru" onKeyDown={e => e.key === 'Enter' && tambahSiswa()} />
        <button disabled={loadingSiswa} onClick={tambahSiswa} className="btn-icon">
          {loadingSiswa ? <span className="spinner" /> : <Icon name="plus" size={15} />} Tambah Siswa
        </button>

        <hr className="field-divider" />

        <label>Siswa Dipilih untuk Dihapus</label>
        <select value={siswaHapus} onChange={e => setSiswaHapus(e.target.value)}>
          {siswaHapusList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button disabled={loadingSiswa} className="ghost-danger btn-icon" style={{ width: '100%' }} onClick={hapusSiswa}>
          {loadingSiswa ? <span className="spinner" /> : <Icon name="trash" size={14} />} Hapus Siswa Ini
        </button>

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
    </div>
  );
}
