'use client';
import { motion } from 'motion/react';

export function LoadingScreen() {
  return (
    <div className="login-shell">
      <motion.div className="loading-box" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        <img src="/logo-mi.png" alt="Logo MI Unwanul Huda 1" className="login-logo-img" />
        <span className="spinner" style={{ width: 22, height: 22, marginTop: 14 }} />
        <div className="loading-txt">Memuat dashboard...</div>
      </motion.div>
    </div>
  );
}
