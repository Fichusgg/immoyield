import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F8F7F4] text-[#1C2B20]">
      <Navbar />
      <div className="pt-[72px]">{children}</div>
      <Footer />
    </main>
  );
}
