'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { animate as animeAnimate } from 'animejs';
import { Icon } from '@/lib/icons';

function LoginLogo() {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    animeAnimate(ref.current, {
      scale: [0.6, 1],
      rotate: [-8, 0],
      opacity: [0, 1],
      duration: 700,
      ease: 'outElastic(1, .6)',
    });
  }, []);
  return <img ref={ref} src="/logo-mi.png" alt="Logo MI Unwanul Huda 1" className="login-logo-img" />;
}

export function LisensiExpiredScreen({ pesan }) {
  return (
    <div className="login-shell">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="license-lock-icon">🔒</div>
        <h2>Masa Aktif Habis</h2>
        <div className="subtitle" style={{ marginBottom: 0 }}>{pesan}</div>
      </div>
    </div>
  );
}

export function LoginScreen({ username, setUsername, password, setPassword, showPassword, setShowPassword, loginMsg, doLogin }) {
  return (
    <div className="login-shell">
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <LoginLogo />
        <h2>Dashboard Pembayaran Siswa</h2>
        <div className="subtitle">MI Unwanul Huda 1 — Masuk untuk mengelola data pembayaran</div>
        <label>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
        <label>Password</label>
        <div className="password-field">
          <input
            type={showPassword ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)} placeholder="password"
            onKeyDown={e => e.key === 'Enter' && doLogin()}
          />
          <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
            <Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} />
          </button>
        </div>
        <button onClick={doLogin}>Masuk</button>
        {loginMsg && <div className="status gagal">{loginMsg}</div>}
      </motion.div>
    </div>
  );
}
