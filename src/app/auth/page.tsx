'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    <main className="flex min-h-screen bg-[#F8F7F4]">
      {/* ── Left column — form ──────────────────────────────────────────────────── */}
      <div className="flex w-full flex-col px-6 py-10 md:w-1/2 md:px-12 md:py-16">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center bg-[#4A7C59] font-mono text-xs font-black text-white">
              I
            </div>
            <span className="text-base font-bold tracking-tight text-[#1C2B20]">ImóYield</span>
          </Link>
          <span className="border border-[#A8C5B2] bg-[#EBF3EE] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#4A7C59]">
            beta
          </span>
        </div>

        <div className="flex max-w-sm flex-1 flex-col justify-center">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-[#1C2B20]">
            Entrar na plataforma
          </h1>
          <p className="mb-8 text-sm text-[#9CA3AF]">
            Bem-vindo de volta. Suas análises estão onde você deixou.
          </p>

          {loginSuccess ? (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 border border-[#A8C5B2] bg-[#EBF3EE] px-4 py-3 font-mono text-sm font-semibold text-[#4A7C59]"
            >
              Login realizado com sucesso. Redirecionando…
            </div>
          ) : null}

          <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-6">
            {redirectTo ? (
              <Auth
                supabaseClient={supabase}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: '#4A7C59',
                        brandAccent: '#3D6B4F',
                        brandButtonText: '#FFFFFF',
                        inputBackground: '#F0EFEB',
                        inputBorder: '#E2E0DA',
                        inputBorderFocus: '#4A7C59',
                        inputBorderHover: '#D0CEC8',
                        inputText: '#1C2B20',
                        inputPlaceholder: '#9CA3AF',
                        inputLabelText: '#6B7280',
                        messageText: '#6B7280',
                        anchorTextColor: '#4A7C59',
                        dividerBackground: '#E2E0DA',
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
                      confirmation_text:
                        'Se esse email existir, você receberá instruções em alguns minutos.',
                    },
                  },
                }}
              />
            ) : null}
          </div>

          <p className="mt-4 text-center font-mono text-[10px] text-[#9CA3AF]">
            Seus dados ficam privados. Nenhum spam. Cancele quando quiser.
          </p>
        </div>

        <Link
          href="/"
          className="mt-8 self-start font-mono text-xs text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
        >
          ← Voltar para o site
        </Link>
      </div>

      {/* ── Right column — trust panel (desktop only) ───────────────────────────── */}
      <div className="hidden border-l border-[#E2E0DA] bg-[#FAFAF8] md:flex md:w-1/2 md:flex-col md:justify-center md:px-12 md:py-16">
        {/* Quote */}
        <blockquote className="mb-10 border-l-2 border-[#4A7C59] pl-5">
          <p className="font-serif text-base italic leading-relaxed text-[#1C2B20]">
            &ldquo;Economizei a planilha que eu fazia a cada imóvel. Agora eu rejeito em dois minutos
            o que antes tomava uma noite inteira.&rdquo;
          </p>
          <cite className="mt-3 block font-mono text-xs text-[#9CA3AF] not-italic">
            — Investidor individual · São Paulo
          </cite>
        </blockquote>

        {/* Mini-âncoras */}
        <div className="mb-10 space-y-2">
          {[
            'CDI atualizado semanalmente via BACEN SGS',
            'Cálculos auditáveis e metodologia pública',
            'ITBI configurável por município',
            'Sem conflito de interesse — só calculamos',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 font-mono text-xs text-[#6B7280]">
              <span className="text-[#4A7C59]">·</span>
              {item}
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="font-mono text-[10px] leading-relaxed text-[#9CA3AF]">
          Cálculos para fins informativos — ImóYield não compra, vende nem recomenda imóveis e não
          presta consultoria de investimento.
        </p>
      </div>
    </main>
  );
}
