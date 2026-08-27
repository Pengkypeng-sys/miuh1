'use client';
import { useState } from 'react';
import { Icon } from '@/lib/icons';
import { parseUaSingkat } from '@/lib/format';

export function AkunTab({ p }) {
  const { nama, role, loginInfo } = p;
  const [passwordLama, setPasswordLama] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [passwordKonfirmasi, setPasswordKonfirmasi] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  async function gantiPassword() {
    if (passwordBaru !== passwordKonfirmasi) { setStatus({ sukses: false, pesan: 'Konfirmasi password baru gak cocok' }); return; }
    setLoading(true);
    const res = await fetch('/api/account/password', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordLama, passwordBaru }),
    }).then(r => r.json());
    setLoading(false);
    setStatus(res);
    if (res.sukses) { setPasswordLama(''); setPasswordBaru(''); setPasswordKonfirmasi(''); }
  }

  return (
    <div className="two-col-panels" style={{ gridTemplateColumns: '2fr 1fr' }}>
      <div className="panel">
        <div className="panel-title"><span className="ic-badge"><Icon name="lock" size={14} /></span> Ganti Password</div>
        <div className="panel-desc">Login sebagai <b>{nama}</b> ({role})</div>

        <label>Password Lama</label>
        <input type="password" value={passwordLama} onChange={e => setPasswordLama(e.target.value)} />

        <label>Password Baru</label>
        <input type="password" value={passwordBaru} onChange={e => setPasswordBaru(e.target.value)} placeholder="minimal 6 karakter" />

        <label>Konfirmasi Password Baru</label>
        <input type="password" value={passwordKonfirmasi} onChange={e => setPasswordKonfirmasi(e.target.value)} />

        <button disabled={loading || !passwordLama || !passwordBaru} onClick={gantiPassword} className="btn-icon" style={{ marginTop: 10, maxWidth: 220 }}>
          {loading ? <span className="spinner" /> : <Icon name="check" size={15} />} Simpan Password
        </button>
        {status && <div className={`status ${status.sukses ? 'sukses' : 'gagal'}`}>{status.pesan}</div>}
      </div>

      <div className="panel">
        <div className="panel-title"><span className="ic-badge"><Icon name="clock" size={14} /></span> Login Saat Ini</div>
        {loginInfo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 10, background: 'var(--bg-soft, #f8faf9)', border: '1px solid var(--border, #e2e8e5)' }}>
              <Icon name="clock" size={18} style={{ marginTop: 2, color: 'var(--muted)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13.5 }}>{new Date(loginInfo.waktu).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Sesi Aktif</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 10, background: 'var(--bg-soft, #f8faf9)', border: '1px solid var(--border, #e2e8e5)' }}>
              <Icon name="devices" size={18} style={{ marginTop: 2, color: 'var(--muted)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13.5 }}>{parseUaSingkat(loginInfo.ua)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Perangkat Utama</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel-desc">Belum ada info sesi</div>
        )}
      </div>
    </div>
  );
}
