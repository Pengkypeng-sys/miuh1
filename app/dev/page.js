'use client';
import { useState } from 'react';

// Halaman developer-only, gak dilink dari mana pun di dashboard.
// Akses: tau URL /dev + passcode (env var DEV_PASSCODE) — sepenuhnya di luar sistem role admin/staf.
export default function DevPage() {
  const [passcode, setPasscode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [tanggalExpiry, setTanggalExpiry] = useState('');
  const [tanggalBaru, setTanggalBaru] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function buka() {
    setLoading(true);
    const res = await fetch('/api/dev/license', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    }).then(r => r.json());
    setLoading(false);
    if (!res.sukses) { setStatus({ ok: false, pesan: res.pesan }); return; }
    setUnlocked(true);
    setTanggalExpiry(res.tanggalExpiry);
    setTanggalBaru(res.tanggalExpiry);
  }

  async function simpan() {
    setLoading(true);
    const res = await fetch('/api/dev/license', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, tanggalExpiry: tanggalBaru }),
    }).then(r => r.json());
    setLoading(false);
    setStatus({ ok: res.sukses, pesan: res.pesan });
    if (res.sukses) setTanggalExpiry(tanggalBaru);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', fontFamily: 'system-ui, sans-serif', padding: 20,
    }}>
      <div style={{ background: '#1e293b', borderRadius: 14, padding: 32, maxWidth: 360, width: '100%', color: '#e2e8f0' }}>
        <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Developer Only</div>
        <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Pengaturan Lisensi</h2>

        {!unlocked ? (
          <>
            <input
              type="password" placeholder="Passcode developer" value={passcode}
              onChange={e => setPasscode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buka()}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: 'white', marginBottom: 12 }}
            />
            <button onClick={buka} disabled={loading} style={{ width: '100%', padding: 11, borderRadius: 8, border: 'none', background: '#4f46e5', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Cek...' : 'Buka'}
            </button>
          </>
        ) : (
          <>
            <label style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Tanggal expiry saat ini: <b>{tanggalExpiry}</b></label>
            <input
              type="date" value={tanggalBaru} onChange={e => setTanggalBaru(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: 'white', marginBottom: 12 }}
            />
            <button onClick={simpan} disabled={loading} style={{ width: '100%', padding: 11, borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Menyimpan...' : 'Simpan Tanggal Baru'}
            </button>
          </>
        )}

        {status && (
          <div style={{ marginTop: 14, padding: 10, borderRadius: 8, fontSize: 13, background: status.ok ? '#166534' : '#991b1b' }}>
            {status.pesan}
          </div>
        )}
      </div>
    </div>
  );
}
