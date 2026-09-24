import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-inter' });

export const metadata = {
  title: 'Dashboard Pembayaran Siswa — MI Unwanul Huda 1',
  icons: { icon: '/logo-mi.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
