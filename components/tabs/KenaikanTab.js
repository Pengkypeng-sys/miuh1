'use client';
import { Icon } from '@/lib/icons';

export function KenaikanTab({ p }) {
  const { kenaikanKelas, loadingKenaikan, statusKenaikan } = p;

  const alur = ['KELAS 1', 'KELAS 2', 'KELAS 3', 'KELAS 4', 'KELAS 5', 'KELAS 6', 'ALUMNI'];

  return (
    <div className="panel">
      <div className="panel-title"><span className="ic-badge"><Icon name="trendingUp" size={14} /></span> Kenaikan Kelas Tahunan</div>
      <div className="panel-desc">Jalankan sekali tiap tahun ajaran baru — pindahin seluruh siswa naik 1 tingkat sekaligus</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, margin: '18px 0 22px' }}>
        {alur.map((k, i) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="status-chip" style={{ background: 'var(--primary-light)', color: 'var(--primary)', minWidth: 'auto', padding: '4px 10px', fontSize: 12 }}>{k}</span>
            {i < alur.length - 1 && <Icon name="down" size={13} className="hint-text" style={{ transform: 'rotate(-90deg)', color: 'var(--muted)' }} />}
          </span>
        ))}
      </div>

      <div className="hint-text" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
        Data pembayaran (termasuk tunggakan) ikut pindah utuh, gak ada yang dihapus. KELAS 1 bakal
        kosong setelah ini, siap diisi siswa baru tahun ajaran berikutnya. Aksi ini gak bisa
        dibatalin gampang — pastikan udah yakin sebelum jalanin.
      </div>

      <button className="ghost-danger btn-icon" style={{ maxWidth: 300 }} disabled={loadingKenaikan} onClick={kenaikanKelas}>
        {loadingKenaikan ? <span className="spinner" /> : <Icon name="trendingUp" size={15} />} Jalankan Kenaikan Kelas
      </button>
      {statusKenaikan && (
        <div className={`status ${statusKenaikan.sukses ? 'sukses' : 'gagal'}`}>
          {statusKenaikan.pesan}
          {statusKenaikan.ringkasan?.map((r, i) => <div key={i} style={{ fontSize: 12, marginTop: 4 }}>{r}</div>)}
        </div>
      )}
    </div>
  );
}
