'use client';
import { motion } from 'motion/react';

export function BarFill({ pct, color }) {
  return (
    <div className="bar-track">
      <motion.div
        className="bar-fill"
        style={color ? { background: color } : undefined}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}
