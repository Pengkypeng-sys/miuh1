'use client';

// Set ikon garis (line icon) minimal, inline SVG — no dependency, currentColor biar ngikutin warna teks/badge.
const PATHS = {
  money: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  students: 'M22 10 12 5 2 10l10 5 10-5Z M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5',
  wallet: 'M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2Z M17 14.5h.01',
  chart: 'M4 19V5M4 19h16M8 19v-6M13 19V9M18 19v-4',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  receipt: 'M6 2h12v20l-3-2-3 2-3-2-3 2Z M9 8h6M9 12h6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35',
  refresh: 'M21 12a9 9 0 1 1-2.64-6.36M21 4v6h-6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6h14Z',
  check: 'M20 6 9 17l-5-5',
  down: 'M12 5v14M19 12l-7 7-7-7',
  up: 'M12 19V5M5 12l7-7 7 7',
  case: 'M3 7h18v13H3ZM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M3 6h18M3 12h18M3 18h18',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM17 21v-8H7v8M7 3v5h8',
};

export function Icon({ name, size = 18, strokeWidth = 2, className = '' }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  );
}
