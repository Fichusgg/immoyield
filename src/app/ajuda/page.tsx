import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/layout/TopNav';
import AjudaContent from '@/components/help/AjudaContent';

export const metadata = {
  title: 'Central de Ajuda · ImmoYield',
};

export default async function AjudaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4]">
      <TopNav userEmail={user?.email} />
      <main className="flex-1">
        <AjudaContent />
      </main>
    </div>
  );
}
