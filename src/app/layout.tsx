import type { Metadata, Viewport } from 'next';
import { DM_Sans, DM_Serif_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow zoom — never disable. Pinching to inspect numbers on small
  // screens is critical for this app, and disabling zoom is a documented
  // a11y violation (WCAG 1.4.4).
  maximumScale: 5,
  themeColor: '#F8F7F4',
};

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

const dmSerif = DM_Serif_Display({
  variable: '--font-dm-serif',
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'ImmoYield — Calculadora de Investimento Imobiliário',
  description: 'Análise de investimento imobiliário para o mercado brasileiro.',
};

import { Toaster } from '@/components/ui/sonner';
import { NumberInputGuard } from '@/components/NumberInputGuard';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${dmSans.variable} ${dmSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#F8F7F4] text-[#1C2B20]">
        <NumberInputGuard />
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
