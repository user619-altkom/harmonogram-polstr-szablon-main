import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Harmonogram na POLSTR',
  description: 'Kalkulator harmonogramu spłat kredytu hipotecznego na POLSTR 1M lub WIBOR 3M',
};

export default function Uklad({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
