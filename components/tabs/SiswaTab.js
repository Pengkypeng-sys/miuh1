'use client';
import { Icon } from '@/lib/icons';
import { initials } from '@/lib/format';

export function SiswaTab({ p }) {
  const {
    kelasSiswa, setKelasSiswa, kelasList, namaBaru, setNamaBaru, tambahSiswa, loadingSiswa,
    siswaHapus, setSiswaHapus, siswaHapusList, hapusSiswa, statusSiswa,
    cariSiswaKelola, setCariSiswaKelola,
    siswaDetailList, toggleYatim,
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

        <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table className="matrix-table" style={{ tableLayout: 'auto' }}>
            <thead><tr><th style={{ textAlign: 'left' }}>Nama Siswa</th><th>Yatim (SPP Gratis)</th></tr></thead>
            <tbody>
              {siswaHapusList.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--muted)' }}>Belum ada siswa di kelas ini</td></tr>}
              {siswaHapusList.filter(s => s.toLowerCase().includes(cariSiswaKelola.toLowerCase())).map(s => {
                const yatim = siswaDetailList.find(d => d.nama === s)?.yatim || false;
                return (
                  <tr key={s} className={s === siswaHapus ? 'selected' : ''} onClick={() => setSiswaHapus(s)} style={{ cursor: 'pointer' }}>
                    <td style={{ textAlign: 'left' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="avatar-sm">{initials(s)}</span> {s}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={yatim} onChange={e => toggleYatim(s, e.target.checked)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
