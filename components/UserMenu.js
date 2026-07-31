'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/lib/icons';
import { initials, sapaanWaktu } from '@/lib/format';

export function UserMenu({ nama, role, doLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="user-menu no-print" ref={ref}>
      <div className="topbar-greeting">
        <div className="g-txt">{sapaanWaktu()}, <b>{nama.split(' ')[0]}</b> 👋</div>
        <div className="g-role">{role === 'admin' ? 'Administrator' : 'Staf Pengajar'}</div>
      </div>
      <button type="button" className="user-menu-trigger" onClick={() => setOpen(v => !v)}>
        <div className="avatar">{initials(nama)}</div>
        <span style={{ display: 'flex', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <Icon name="chevronDown" size={14} />
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="user-menu-dropdown"
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="user-menu-info">
              <div className="n">{nama}</div>
              <div className="r">{role === 'admin' ? 'Administrator' : 'Staf Pengajar'}</div>
            </div>
            <button type="button" className="user-menu-logout" onClick={doLogout}>
              <Icon name="logout" size={15} /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
