import { createClient } from '@/lib/supabase/client';
import { DealInput } from '@/lib/validations/deal';
import { AnalysisResult } from '@/components/deals/ResultsScreen';

export interface SavedDeal {
  id: string;
  name: string;
  property_type: string;
  inputs: DealInput;
  results_cache: AnalysisResult;
  updated_at: string;
}

export async function saveDeal(inputs: DealInput, results: AnalysisResult): Promise<SavedDeal> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data, error } = await supabase
    .from('deals')
    .insert({
      user_id: user.id,
      name: inputs.name,
      property_type: 'aluguel',
      inputs,
      results_cache: results,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SavedDeal;
}

export async function getDeals(): Promise<SavedDeal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SavedDeal[];
}

export async function deleteDeal(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('deals').delete().eq('id', id);
  if (error) throw error;
}
