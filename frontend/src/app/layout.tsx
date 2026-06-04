import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PharmaFlow ERP - Smart Pharmacy Inventory & POS Billing System',
  description: 'Enterprise resource planning software for modern pharmacies. Manage catalog, drug batches, expiration cycles, purchases, credit balances, and generate invoice bills instantly.',
  keywords: 'pharmacy, inventory management, ERP, POS billing, drug batches, pharmaceutical, stock control, expiration tracker',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark`}
      suppressHydrationWarning
    >
      <body 
        className="h-full bg-slate-950 text-slate-100 antialiased font-sans flex flex-col"
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0f172a',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '12px',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
