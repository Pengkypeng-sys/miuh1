import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Dashboard Pembayaran Siswa — MI Unwanul Huda 1',
  icons: { icon: '/logo-mi.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
