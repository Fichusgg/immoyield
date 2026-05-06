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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://immoyield.com.br';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ImmoYield — Calculadora de Investimento Imobiliário',
    // Per-route titles render as "Page · ImmoYield". Pages set a short
    // `title: 'Page'` and inherit the brand suffix from this template.
    template: '%s · ImmoYield',
  },
  description:
    'Análise completa de investimento imobiliário para o mercado brasileiro: cap rate, fluxo de caixa, TIR, financiamento (SAC/PRICE) e projeções de longo prazo.',
  applicationName: 'ImmoYield',
  keywords: [
    'investimento imobiliário',
    'cap rate',
    'aluguel',
    'financiamento imobiliário',
    'SAC',
    'PRICE',
    'fluxo de caixa',
    'análise de imóveis',
  ],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'ImmoYield',
    title: 'ImmoYield — Calculadora de Investimento Imobiliário',
    description:
      'Cap rate, fluxo de caixa, TIR e projeções para qualquer imóvel — em segundos, no padrão brasileiro.',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'ImmoYield' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ImmoYield — Análise de investimento imobiliário',
    description: 'Cap rate, fluxo de caixa e TIR no padrão brasileiro.',
    images: ['/logo.png'],
  },
  robots: { index: true, follow: true },
};

import { Toaster } from '@/components/ui/sonner';
import { NumberInputGuard } from '@/components/NumberInputGuard';
import FloatingFeedbackButton from '@/components/feedback/FloatingFeedbackButton';

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
        <FloatingFeedbackButton />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
