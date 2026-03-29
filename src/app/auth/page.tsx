'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const supabase = createClient();
  const router = useRouter();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard');
    });
  }, [router, supabase.auth]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
            <span className="text-white text-sm font-black">I</span>
          </div>
          <span className="font-black text-slate-900 tracking-tight text-lg">ImmoYield</span>
          <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">beta</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <h1 className="text-lg font-black text-slate-900 mb-1">Entrar na plataforma</h1>
          <p className="text-sm text-slate-400 mb-6">Salve e gerencie suas análises de investimento.</p>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#059669',
                    brandAccent: '#047857',
                  },
                  radii: {
                    borderRadiusButton: '12px',
                    inputBorderRadius: '12px',
                  },
                },
              },
            }}
            providers={[]}
            redirectTo={`${origin}/auth/callback`}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email',
                  password_label: 'Senha',
                  button_label: 'Entrar',
                  link_text: 'Já tem conta? Entre',
                  email_input_placeholder: 'seu@email.com',
                  password_input_placeholder: 'Sua senha',
                },
                sign_up: {
                  email_label: 'Email',
                  password_label: 'Senha',
                  button_label: 'Criar conta',
                  link_text: 'Não tem conta? Cadastre-se',
                  email_input_placeholder: 'seu@email.com',
                  password_input_placeholder: 'Mínimo 6 caracteres',
                  confirmation_text: 'Verifique seu email para confirmar o cadastro.',
                },
                forgotten_password: {
                  link_text: 'Esqueceu a senha?',
                  button_label: 'Enviar instruções',
                  email_label: 'Email',
                  email_input_placeholder: 'seu@email.com',
                  confirmation_text: 'Verifique seu email.',
                },
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
