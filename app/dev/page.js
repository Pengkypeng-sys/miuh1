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
    if (!passcode) return;
    setLoading(true);
    setStatus(null);
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
    setStatus(null);
    const res = await fetch('/api/dev/license', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode, tanggalExpiry: tanggalBaru }),
    }).then(r => r.json());
    setLoading(false);
    setStatus({ ok: res.sukses, pesan: res.pesan });
    if (res.sukses) setTanggalExpiry(tanggalBaru);
  }

  const hariTersisa = tanggalExpiry ? Math.ceil((new Date(`${tanggalExpiry}T23:59:59+07:00`) - new Date()) / 86400000) : null;

  return (
    <div className="dev-shell">
      <style jsx>{`
        .dev-shell {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: radial-gradient(circle at 30% 20%, #0f2e1c 0%, #060f0a 55%, #030805 100%);
          font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px;
        }
        .dev-card {
          background: rgba(15,23,20,0.75); border: 1px solid rgba(52,211,153,0.15);
          border-radius: 18px; padding: 36px; max-width: 380px; width: 100%;
          box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset;
          backdrop-filter: blur(12px);
          animation: devFadeIn .35s cubic-bezier(.22,1,.36,1);
        }
        @keyframes devFadeIn { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .dev-lock {
          width: 52px; height: 52px; border-radius: 14px; margin: 0 auto 18px;
          background: linear-gradient(135deg, #15803d, #0b5c2d);
          display: flex; align-items: center; justify-content: center; font-size: 22px;
          box-shadow: 0 8px 20px rgba(21,128,61,0.4);
        }
        .dev-eyebrow {
          text-align: center; font-size: 10.5px; font-weight: 700; letter-spacing: .12em;
          color: #4ade80; text-transform: uppercase; margin-bottom: 6px;
        }
        .dev-title { text-align: center; font-size: 19px; font-weight: 700; color: #f0fdf4; margin: 0 0 26px; }
        .dev-label { font-size: 12px; color: #86efac; margin-bottom: 8px; display: block; font-weight: 600; }
        .dev-input {
          width: 100%; padding: 12px 14px; border-radius: 10px;
          border: 1.5px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.3);
          color: #f0fdf4; font-size: 14px; margin-bottom: 16px; transition: border-color .15s, background .15s;
        }
        .dev-input:focus { outline: none; border-color: #22c55e; background: rgba(0,0,0,0.45); }
        .dev-input::placeholder { color: #4b5f52; }
        .dev-btn {
          width: 100%; padding: 13px; border-radius: 10px; border: none; cursor: pointer;
          font-size: 14px; font-weight: 700; transition: transform .1s, box-shadow .15s;
        }
        .dev-btn:active { transform: scale(.98); }
        .dev-btn-primary { background: linear-gradient(135deg, #16a34a, #15803d); color: white; box-shadow: 0 8px 20px rgba(21,128,61,0.35); }
        .dev-btn-primary:hover { box-shadow: 0 10px 26px rgba(21,128,61,0.5); }
        .dev-btn:disabled { opacity: .6; cursor: not-allowed; }
        .dev-info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06); margin-bottom: 18px;
        }
        .dev-info-row .k { font-size: 11.5px; color: #86efac; }
        .dev-info-row .v { font-size: 13px; font-weight: 700; color: #f0fdf4; }
        .dev-badge { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
        .dev-badge.ok { background: rgba(34,197,94,0.15); color: #4ade80; }
        .dev-badge.warn { background: rgba(234,179,8,0.15); color: #facc15; }
        .dev-badge.bad { background: rgba(239,68,68,0.15); color: #f87171; }
        .dev-status { margin-top: 14px; padding: 11px 14px; border-radius: 10px; font-size: 13px; animation: devFadeIn .2s ease; }
        .dev-status.ok { background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.25); }
        .dev-status.bad { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.25); }
        .dev-spin {
          display: inline-block; width: 13px; height: 13px; border: 2px solid currentColor;
          border-right-color: transparent; border-radius: 999px; animation: devSpin .6s linear infinite;
          margin-right: 6px; vertical-align: -2px;
        }
        @keyframes devSpin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="dev-card">
        <div className="dev-lock">🔐</div>
        <div className="dev-eyebrow">Developer Only</div>
        <h2 className="dev-title">Pengaturan Lisensi</h2>

        {!unlocked ? (
          <>
            <label className="dev-label">Passcode</label>
            <input
              className="dev-input" type="password" placeholder="••••••••" value={passcode}
              onChange={e => setPasscode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buka()}
              autoFocus
            />
            <button className="dev-btn dev-btn-primary" onClick={buka} disabled={loading}>
              {loading ? <><span className="dev-spin" />Memeriksa...</> : 'Buka'}
            </button>
          </>
        ) : (
          <>
            <div className="dev-info-row">
              <span className="k">Status saat ini</span>
              <span className={`dev-badge ${hariTersisa < 0 ? 'bad' : hariTersisa <= 7 ? 'warn' : 'ok'}`}>
                {hariTersisa < 0 ? 'Expired' : `${hariTersisa} hari lagi`}
              </span>
            </div>

            <label className="dev-label">Tanggal Expiry Baru</label>
            <input
              className="dev-input" type="date" value={tanggalBaru}
              onChange={e => setTanggalBaru(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
            <button className="dev-btn dev-btn-primary" onClick={simpan} disabled={loading}>
              {loading ? <><span className="dev-spin" />Menyimpan...</> : 'Simpan Tanggal Baru'}
            </button>
          </>
        )}

        {status && <div className={`dev-status ${status.ok ? 'ok' : 'bad'}`}>{status.pesan}</div>}
      </div>
    </div>
  );
}
