'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/lib/icons';
import { TAB_META, NAV_GROUPS, initials } from '@/lib/format';

function NavRow({ t, tab, setTab, onClick }) {
  return (
    <div className={`nav-item ${tab === t ? 'active' : ''}`} onClick={onClick || (() => setTab(t))} style={{ position: 'relative' }}>
      {tab === t && <motion.div layoutId="navPill" className="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
      <span className="ic" style={{ position: 'relative' }}><Icon name={TAB_META[t].icon} size={17} /></span>
      <span style={{ position: 'relative' }}>{TAB_META[t].title}</span>
    </div>
  );
}

function NavList({ visibleTabs, tab, setTab, onNavigate }) {
  const groupedTabs = new Set(NAV_GROUPS.flatMap(g => g.tabs));
  const [openGroup, setOpenGroup] = useState(() => {
    const active = NAV_GROUPS.find(g => g.tabs.includes(tab));
    return active ? active.key : null;
  });

  return (
    <nav>
      {visibleTabs.filter(t => !groupedTabs.has(t)).map(t => (
        <NavRow key={t} t={t} tab={tab} setTab={setTab} onClick={() => { setTab(t); onNavigate?.(); }} />
      ))}

      {NAV_GROUPS.map(g => {
        const tabsInGroup = g.tabs.filter(t => visibleTabs.includes(t));
        if (!tabsInGroup.length) return null;
        const isOpen = openGroup === g.key;
        return (
          <div key={g.key} style={{ marginBottom: 2 }}>
            <div className="nav-item nav-group-header" onClick={() => setOpenGroup(isOpen ? null : g.key)}>
              <span className="ic"><Icon name={g.icon} size={17} /></span>
              <span style={{ flex: 1 }}>{g.label}</span>
              <span style={{ display: 'flex', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                <Icon name="chevronDown" size={14} />
              </span>
            </div>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="nav-subgroup">
                    {tabsInGroup.map(t => (
                      <NavRow key={t} t={t} tab={tab} setTab={setTab} onClick={() => { setTab(t); onNavigate?.(); }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ visibleTabs, tab, setTab, nama, role, doLogout, mobileMenuOpen, setMobileMenuOpen }) {
  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo-mi.png" alt="Logo MI Unwanul Huda 1" className="logo-img" />
          <div>Dashboard Pembayaran<br /><small>MI Unwanul Huda 1</small></div>
        </div>

        <div className="nav-section-label">Menu</div>
        <NavList visibleTabs={visibleTabs} tab={tab} setTab={setTab} />

        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menu"><Icon name="menu" size={18} /></button>
      </aside>

      {mobileMenuOpen && (
        <>
          <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-menu-dropdown">
            <NavList visibleTabs={visibleTabs} tab={tab} setTab={setTab} onNavigate={() => setMobileMenuOpen(false)} />
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
