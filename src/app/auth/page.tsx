'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const redirectingRef = useRef(false);
  const nextPathRef = useRef('/meus-negocios');

  const startRedirect = useCallback(
    (to: string) => {
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      setLoginSuccess(true);
      window.setTimeout(() => {
        router.replace(to);
      }, 800);
    },
    [router]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextParam = params.get('next');
    const nextPath = nextParam?.startsWith('/') ? nextParam : '/meus-negocios';
    nextPathRef.current = nextPath;
    const redirectToUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    queueMicrotask(() => setRedirectTo(redirectToUrl));

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) startRedirect(nextPathRef.current);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') startRedirect(nextPathRef.current);
    });

    return () => subscription.unsubscribe();
  }, [startRedirect, supabase]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f3] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1a5c3a]">
            <span className="text-sm font-black text-white">I</span>
          </div>
          <span className="text-lg font-black tracking-tight text-[#1a1a1a]">ImmoYield</span>
          <span className="rounded-full bg-[#e8f5ee] px-2 py-0.5 text-xs font-semibold text-[#1a5c3a]">
            beta
          </span>
        </div>

        <div className="rounded-2xl border border-[#e5e5e3] bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-lg font-black text-[#1a1a1a]">Entrar na plataforma</h1>
          <p className="mb-6 text-sm text-[#737373]">
            Salve e gerencie suas análises de investimento.
          </p>

          {loginSuccess ? (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 rounded-xl border border-[#1a5c3a]/20 bg-[#e8f5ee] px-4 py-3 text-sm font-semibold text-[#1a5c3a]"
            >
              Login realizado com sucesso. Redirecionando…
            </div>
          ) : null}

          {redirectTo ? (
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
              redirectTo={redirectTo}
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
          ) : null}
        </div>
      </div>
    </main>
  );
}
