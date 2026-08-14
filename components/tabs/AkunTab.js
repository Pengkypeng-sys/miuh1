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
    <div className="bayar-grid">
      <div className="panel" style={{ gridColumn: '1 / -1', maxWidth: 420 }}>
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

      {loginInfo && (
        <div className="panel" style={{ gridColumn: '1 / -1', maxWidth: 420 }}>
          <div className="panel-title"><span className="ic-badge"><Icon name="clock" size={14} /></span> Login Saat Ini</div>
          <div className="panel-desc">
            {new Date(loginInfo.waktu).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
            <br />{parseUaSingkat(loginInfo.ua)}
          </div>
        </div>
      )}
    </div>
  );
}
