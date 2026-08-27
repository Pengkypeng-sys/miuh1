'use client';
import { useState } from 'react';
import { Icon } from '@/lib/icons';

export function KenaikanTab({ p }) {
  const { kenaikanKelas, loadingKenaikan, statusKenaikan, rekap } = p;
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [statusBackup, setStatusBackup] = useState(null);

  async function backupSekarang() {
    setLoadingBackup(true);
    const res = await fetch('/api/cron-backup', { method: 'POST' }).then(r => r.json());
    setStatusBackup(res);
    setLoadingBackup(false);
  }

  const alur = ['KELAS 1', 'KELAS 2', 'KELAS 3', 'KELAS 4', 'KELAS 5', 'KELAS 6', 'ALUMNI'];
  const jumlahPerKelas = Object.fromEntries((rekap?.perKelas || []).map(k => [k.kelas, k.totalSiswa]));
  const totalSiswaAktif = (rekap?.perKelas || []).reduce((s, k) => s + k.totalSiswa, 0);

  return (
    <div className="panel">
      <div className="panel-title"><span className="ic-badge"><Icon name="trendingUp" size={14} /></span> Kenaikan Kelas Tahunan</div>
      <div className="panel-desc">Jalankan sekali tiap tahun ajaran baru — pindahin seluruh siswa naik 1 tingkat sekaligus</div>

      <div className="hint-text" style={{ fontSize: 12.5, margin: '14px 0 4px' }}>
        Total {totalSiswaAktif} siswa aktif bakal ikut naik kelas:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, margin: '10px 0 22px' }}>
        {alur.map((k, i) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="status-chip" style={{ background: 'var(--primary-light)', color: 'var(--primary)', minWidth: 'auto', padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              {k}
              {jumlahPerKelas[k] != null && (
                <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999, fontSize: 10.5, fontWeight: 700, padding: '1px 6px' }}>
                  {jumlahPerKelas[k]}
                </span>
              )}
            </span>
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

      <hr className="field-divider" />

      <div className="panel-title" style={{ marginBottom: 4 }}><span className="ic-badge"><Icon name="wallet" size={14} /></span> Backup Data</div>
      <div className="hint-text" style={{ fontSize: 12.5, marginBottom: 14 }}>
        Otomatis jalan tiap minggu (Minggu dini hari) — simpen data siswa, pembayaran, & pengeluaran ke Supabase Storage.
        8 backup terakhir disimpen. Bisa juga dijalanin manual kapan aja.
      </div>
      <button className="secondary action-btn btn-icon" style={{ maxWidth: 260 }} disabled={loadingBackup} onClick={backupSekarang}>
        {loadingBackup ? <span className="spinner" /> : <Icon name="save" size={14} />} Backup Sekarang
      </button>
      {statusBackup && <div className={`status ${statusBackup.sukses ? 'sukses' : 'gagal'}`}>{statusBackup.pesan}</div>}
    </div>
  );
}
