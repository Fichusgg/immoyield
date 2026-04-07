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
  const nextPathRef = useRef('/propriedades');

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
    const nextPath = nextParam?.startsWith('/') ? nextParam : '/propriedades';
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
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-[#22c55e]">
            <span className="font-mono text-sm font-black text-black">I</span>
          </div>
          <span className="text-lg font-black tracking-tight text-[#f4f4f5]">ImmoYield</span>
          <span className="border border-[#14532d] bg-[#052e16] px-2 py-0.5 font-mono text-xs font-semibold text-[#22c55e]">
            beta
          </span>
        </div>

        <div className="border border-[#27272a] bg-[#111111] p-8">
          <h1 className="mb-1 text-lg font-black text-[#f4f4f5]">Entrar na plataforma</h1>
          <p className="mb-6 text-sm text-[#52525b]">
            Salve e gerencie suas análises de investimento.
          </p>

          {loginSuccess ? (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 border border-[#14532d] bg-[#052e16] px-4 py-3 font-mono text-sm font-semibold text-[#22c55e]"
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
                      brand: '#22c55e',
                      brandAccent: '#16a34a',
                      brandButtonText: '#000000',
                      inputBackground: '#1a1a1a',
                      inputBorder: '#27272a',
                      inputBorderFocus: '#22c55e',
                      inputBorderHover: '#3f3f46',
                      inputText: '#f4f4f5',
                      inputPlaceholder: '#52525b',
                      inputLabelText: '#a1a1aa',
                      messageText: '#a1a1aa',
                      anchorTextColor: '#22c55e',
                      dividerBackground: '#27272a',
                    },
                    radii: {
                      borderRadiusButton: '0px',
                      inputBorderRadius: '0px',
                    },
                    fonts: {
                      bodyFontFamily: 'var(--font-dm-sans)',
                      inputFontFamily: 'var(--font-dm-sans)',
                      buttonFontFamily: 'var(--font-dm-sans)',
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
