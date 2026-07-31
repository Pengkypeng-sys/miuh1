'use client';
import { motion } from 'motion/react';
import { Icon } from '@/lib/icons';
import { TAB_META } from '@/lib/format';
import { initials } from '@/lib/format';

export function Sidebar({ visibleTabs, tab, setTab, nama, role, doLogout, mobileMenuOpen, setMobileMenuOpen }) {
  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo-mi.png" alt="Logo MI Unwanul Huda 1" className="logo-img" />
          <div>Dashboard Pembayaran<br /><small>MI Unwanul Huda 1</small></div>
        </div>

        <div className="nav-section-label">Menu</div>
        <nav>
          {visibleTabs.map(t => (
            <div key={t} className={`nav-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ position: 'relative' }}>
              {tab === t && <motion.div layoutId="navPill" className="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <span className="ic" style={{ position: 'relative' }}><Icon name={TAB_META[t].icon} size={17} /></span>
              <span style={{ position: 'relative' }}>{TAB_META[t].title}</span>
            </div>
          ))}
        </nav>

        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menu"><Icon name="menu" size={18} /></button>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{initials(nama)}</div>
            <div className="who">
              <div className="n">{nama}</div>
              <div className="r">{role}</div>
            </div>
          </div>
          <a className="logout-link" onClick={doLogout}><Icon name="logout" size={15} /> <span className="lbl">Logout</span></a>
        </div>
      </aside>

      {mobileMenuOpen && (
        <>
          <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-menu-dropdown">
            {visibleTabs.map(t => (
              <div key={t} className={`nav-item ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setMobileMenuOpen(false); }} style={{ position: 'relative' }}>
                {tab === t && <div className="nav-pill" />}
                <span className="ic" style={{ position: 'relative' }}><Icon name={TAB_META[t].icon} size={17} /></span>
                <span style={{ position: 'relative' }}>{TAB_META[t].title}</span>
              </div>
            ))}
            <div className="mobile-menu-user">
              <div className="avatar">{initials(nama)}</div>
              <div className="who"><div className="n">{nama}</div><div className="r">{role}</div></div>
            </div>
            <div className="nav-item" onClick={doLogout}><span className="ic"><Icon name="logout" size={17} /></span> Logout</div>
          </div>
        </>
      )}
    </>
  );
}
