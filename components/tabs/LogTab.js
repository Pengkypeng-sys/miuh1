'use client';
import { useState } from 'react';
import { Icon } from '@/lib/icons';
import { rp, ddmmyyyyToIso, isoToDdmmyyyy, AKSI_LABEL } from '@/lib/format';

export function LogTab({ p }) {
  const { tanggalLog, setTanggalLog, logData, loadingLog, loadLog } = p;
  const [cariLog, setCariLog] = useState('');

  const entriesFiltered = logData
    ? logData.entries.filter(e => !cariLog || [e.user, e.kelas, e.siswa, e.item].some(v => (v || '').toLowerCase().includes(cariLog.toLowerCase())))
    : [];

  return (
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

      <div className="search-box" style={{ marginBottom: 12, maxWidth: 320 }}>
        <span className="search-ic"><Icon name="search" size={15} /></span>
        <input value={cariLog} onChange={e => setCariLog(e.target.value)} placeholder="cari user/kelas/siswa/item..." />
      </div>

      {loadingLog && <div className="empty-state"><span className="spinner" />Memuat...</div>}
      {!loadingLog && logData && (
        <>
          {logData.dipotong && <div className="status gagal" style={{ marginBottom: 14 }}>Cuma nampilin 200 kejadian terbaru dari {logData.total} total — persempit tanggal buat lihat lebih detail.</div>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Jam</th><th>Aksi</th><th>User</th><th>Kelas</th><th>Siswa</th><th>Item</th><th className="num">Lama → Baru</th><th>Metode</th></tr></thead>
              <tbody>
                {entriesFiltered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)' }}>{cariLog ? 'Tidak ada yang cocok' : 'Belum ada aktivitas'}</td></tr>}
                {entriesFiltered.map((e, i) => {
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
  );
}
