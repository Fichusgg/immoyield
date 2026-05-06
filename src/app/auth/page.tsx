'use client';

import { createClient } from '@/lib/supabase/client';
import { safeNextPath } from '@/lib/auth/safe-redirect';
import {
  validateSignupEmail,
  validatePassword,
  type PasswordStrength,
} from '@/lib/auth/email-validation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

type Mode = 'signin' | 'signup' | 'forgot';

export default function AuthPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [loginSuccess, setLoginSuccess] = useState(false);
  const redirectingRef = useRef(false);
  const nextPathRef = useRef('/propriedades');

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const startRedirect = useCallback(
    (to: string) => {
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      setLoginSuccess(true);
      router.replace(to);
    },
    [router]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPath = safeNextPath(params.get('next'), '/propriedades');
    nextPathRef.current = nextPath;

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

  const switchMode = (next: Mode) => {
    setMode(next);
    setEmailError(null);
    setEmailSuggestion(null);
    setPasswordError(null);
    setSubmitError(null);
    setSignupSent(false);
    setResetSent(false);
  };

  const passwordStrength: PasswordStrength | null = useMemo(() => {
    if (mode !== 'signup' || !password) return null;
    return validatePassword(password).strength;
  }, [mode, password]);

  const acceptSuggestion = () => {
    if (!emailSuggestion) return;
    setEmail(emailSuggestion);
    setEmailError(null);
    setEmailSuggestion(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setEmailError(null);
    setEmailSuggestion(null);
    setPasswordError(null);

    const trimmedEmail = email.trim();

    if (mode === 'signup') {
      const local = validateSignupEmail(trimmedEmail);
      if (!local.ok) {
        setEmailError(messageForReason(local.reason));
        if (local.reason === 'typo' && local.suggestion) {
          setEmailSuggestion(local.suggestion);
        }
        return;
      }
      const pwCheck = validatePassword(password);
      if (!pwCheck.ok) {
        setPasswordError(pwCheck.message ?? 'Senha inválida.');
        return;
      }
    } else if (mode === 'signin') {
      if (!trimmedEmail) {
        setEmailError('Informe seu email.');
        return;
      }
      if (!password) {
        setPasswordError('Informe sua senha.');
        return;
      }
    } else if (mode === 'forgot') {
      if (!trimmedEmail) {
        setEmailError('Informe seu email.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPathRef.current)}`;

      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) {
          setSubmitError(translateAuthError(error.message));
          return;
        }
        // SIGNED_IN listener will redirect.
      } else if (mode === 'signup') {
        // Server-side gate: confirms MX record + re-runs disposable check.
        const res = await fetch('/api/auth/validate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            reason?: string;
            suggestion?: string;
          } | null;
          if (data?.reason === 'typo' && data.suggestion) {
            setEmailSuggestion(data.suggestion);
          }
          setEmailError(messageForReason(data?.reason ?? 'invalid-format'));
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) {
          setSubmitError(translateAuthError(error.message));
          return;
        }
        // If email confirmation is required Supabase returns a user with no
        // session — we surface a clear pending-confirmation banner.
        if (!data.session) {
          setSignupSent(true);
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo,
        });
        if (error) {
          setSubmitError(translateAuthError(error.message));
          return;
        }
        setResetSent(true);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-[#F8F7F4]">
      {/* ── Left column — form ──────────────────────────────────────────────────── */}
      <div className="flex w-full flex-col px-6 py-10 md:w-1/2 md:px-12 md:py-16">
        <div className="mb-10 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/immoyield_logo_dark.png"
              alt="ImmoYield logo"
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="text-base font-bold tracking-tight text-[#1C2B20]">ImmoYield</span>
          </Link>
          <span className="border border-[#A8C5B2] bg-[#EBF3EE] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#4A7C59]">
            beta
          </span>
        </div>

        <div className="flex max-w-sm flex-1 flex-col justify-center">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-[#1C2B20]">
            {mode === 'signin'
              ? 'Entrar na plataforma'
              : mode === 'signup'
                ? 'Criar sua conta'
                : 'Recuperar senha'}
          </h1>
          <p className="mb-8 text-sm text-[#9CA3AF]">
            {mode === 'signin'
              ? 'Bem-vindo de volta. Suas análises estão onde você deixou.'
              : mode === 'signup'
                ? 'Confirmamos seu email para manter sua conta segura.'
                : 'Enviamos um link para redefinir sua senha.'}
          </p>

          {loginSuccess && (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 border border-[#A8C5B2] bg-[#EBF3EE] px-4 py-3 font-mono text-sm font-semibold text-[#4A7C59]"
            >
              Login realizado com sucesso. Redirecionando…
            </div>
          )}

          {signupSent ? (
            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-6">
              <p className="mb-2 text-sm font-semibold text-[#1C2B20]">Verifique seu email</p>
              <p className="mb-4 text-sm text-[#6B7280]">
                Enviamos um link de confirmação para{' '}
                <span className="font-mono text-[#1C2B20]">{email}</span>. Clique no link para
                ativar sua conta.
              </p>
              <p className="mb-4 text-xs text-[#9CA3AF]">
                Não recebeu? Verifique a pasta de spam ou tente novamente em alguns minutos.
              </p>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-sm font-semibold text-[#4A7C59] hover:text-[#3D6B4F]"
              >
                Voltar para entrar
              </button>
            </div>
          ) : resetSent ? (
            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-6">
              <p className="mb-2 text-sm font-semibold text-[#1C2B20]">Email enviado</p>
              <p className="mb-4 text-sm text-[#6B7280]">
                Se esse email existir em nossa base, você receberá instruções em alguns minutos.
              </p>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-sm font-semibold text-[#4A7C59] hover:text-[#3D6B4F]"
              >
                Voltar para entrar
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="border border-[#E2E0DA] bg-[#FAFAF8] p-6"
            >
              <label className="block">
                <span className="text-xs font-semibold tracking-wide text-[#6B7280] uppercase">
                  Email
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                    if (emailSuggestion) setEmailSuggestion(null);
                  }}
                  placeholder="seu@email.com"
                  aria-invalid={!!emailError}
                  className={`mt-1.5 w-full border bg-[#F0EFEB] px-3 py-2 font-mono text-sm text-[#1C2B20] transition-colors outline-none placeholder:text-[#9CA3AF] focus:border-[#4A7C59] ${
                    emailError ? 'border-[#DC2626]' : 'border-[#E2E0DA]'
                  }`}
                />
                {emailError && <p className="mt-1 text-xs text-[#DC2626]">{emailError}</p>}
                {emailSuggestion && (
                  <button
                    type="button"
                    onClick={acceptSuggestion}
                    className="mt-1 text-xs text-[#4A7C59] underline hover:text-[#3D6B4F]"
                  >
                    Você quis dizer {emailSuggestion}?
                  </button>
                )}
              </label>

              {mode !== 'forgot' && (
                <label className="mt-4 block">
                  <span className="text-xs font-semibold tracking-wide text-[#6B7280] uppercase">
                    Senha
                  </span>
                  <input
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder={
                      mode === 'signup' ? 'Mínimo 8 caracteres, letras + números' : 'Sua senha'
                    }
                    aria-invalid={!!passwordError}
                    className={`mt-1.5 w-full border bg-[#F0EFEB] px-3 py-2 font-mono text-sm text-[#1C2B20] transition-colors outline-none placeholder:text-[#9CA3AF] focus:border-[#4A7C59] ${
                      passwordError ? 'border-[#DC2626]' : 'border-[#E2E0DA]'
                    }`}
                  />
                  {mode === 'signup' && passwordStrength && !passwordError && (
                    <PasswordStrengthBar strength={passwordStrength} />
                  )}
                  {passwordError && <p className="mt-1 text-xs text-[#DC2626]">{passwordError}</p>}
                </label>
              )}

              {submitError && (
                <p
                  role="alert"
                  className="mt-4 border border-[#FCA5A5] bg-[#FEE2E2] px-3 py-2 text-xs text-[#DC2626]"
                >
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full bg-[#4A7C59] px-4 py-2.5 text-xs font-semibold tracking-[0.12em] text-white uppercase transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
              >
                {submitting
                  ? 'Aguarde…'
                  : mode === 'signin'
                    ? 'Entrar'
                    : mode === 'signup'
                      ? 'Criar conta'
                      : 'Enviar instruções'}
              </button>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
                {mode === 'signin' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[#4A7C59] hover:text-[#3D6B4F]"
                    >
                      Esqueceu a senha?
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="text-[#6B7280] hover:text-[#1C2B20]"
                    >
                      Criar conta
                    </button>
                  </>
                ) : mode === 'signup' ? (
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-[#6B7280] hover:text-[#1C2B20]"
                  >
                    Já tem conta? Entre
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-[#6B7280] hover:text-[#1C2B20]"
                  >
                    Voltar para entrar
                  </button>
                )}
              </div>
            </form>
          )}

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
        <blockquote className="mb-10 border-l-2 border-[#4A7C59] pl-5">
          <p className="text-base leading-relaxed text-[#1C2B20]">
            &ldquo;Economizei a planilha que eu fazia a cada imóvel. Agora eu rejeito em dois
            minutos o que antes tomava uma noite inteira.&rdquo;
          </p>
          <cite className="mt-3 block font-mono text-xs text-[#9CA3AF] not-italic">
            — Investidor individual · São Paulo
          </cite>
        </blockquote>

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

        <p className="font-mono text-[10px] leading-relaxed text-[#9CA3AF]">
          Cálculos para fins informativos — ImmoYield não compra, vende nem recomenda imóveis e não
          presta consultoria de investimento.
        </p>
      </div>
    </main>
  );
}

function messageForReason(reason: string): string {
  switch (reason) {
    case 'empty':
      return 'Informe seu email.';
    case 'invalid-format':
      return 'Email inválido. Verifique se digitou corretamente.';
    case 'disposable':
      return 'Endereços de email descartáveis não são permitidos. Use seu email pessoal ou corporativo.';
    case 'typo':
      return 'Esse domínio parece ter um erro de digitação.';
    case 'no-mx':
      return 'Esse domínio não aceita emails. Verifique o endereço.';
    default:
      return 'Email inválido.';
  }
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email ou senha incorretos.';
  if (m.includes('email not confirmed'))
    return 'Confirme seu email antes de entrar — verifique sua caixa de entrada.';
  if (m.includes('user already registered')) return 'Esse email já está cadastrado. Tente entrar.';
  if (m.includes('rate limit'))
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (m.includes('password')) return message;
  return message;
}

function PasswordStrengthBar({ strength }: { strength: PasswordStrength }) {
  const fill =
    strength === 'weak'
      ? 'w-1/3 bg-[#DC2626]'
      : strength === 'fair'
        ? 'w-2/3 bg-[#F59E0B]'
        : 'w-full bg-[#4A7C59]';
  const label = strength === 'weak' ? 'Fraca' : strength === 'fair' ? 'Razoável' : 'Forte';
  const labelColor =
    strength === 'weak'
      ? 'text-[#DC2626]'
      : strength === 'fair'
        ? 'text-[#92400E]'
        : 'text-[#4A7C59]';
  return (
    <div className="mt-2">
      <div className="h-1 w-full overflow-hidden bg-[#F0EFEB]">
        <div className={`h-full transition-all ${fill}`} />
      </div>
      <p className={`mt-1 font-mono text-[10px] tracking-wider uppercase ${labelColor}`}>
        Senha {label}
      </p>
    </div>
  );
}
