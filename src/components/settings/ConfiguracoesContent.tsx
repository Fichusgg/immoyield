'use client';

import { useState } from 'react';
import {
  User,
  Lock,
  Bell,
  CreditCard,
  Sliders,
  LinkIcon,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type SectionKey =
  | 'perfil'
  | 'conta'
  | 'seguranca'
  | 'notificacoes'
  | 'plano'
  | 'preferencias'
  | 'integracoes';

interface SectionDef {
  key: SectionKey;
  label: string;
  icon: React.ElementType;
  description: string;
}

const SECTIONS: SectionDef[] = [
  { key: 'perfil', label: 'Perfil', icon: User, description: 'Nome, foto e dados públicos.' },
  { key: 'conta', label: 'Conta', icon: Mail, description: 'E-mail e exclusão de conta.' },
  { key: 'seguranca', label: 'Segurança', icon: Lock, description: 'Senha e verificação em duas etapas.' },
  { key: 'notificacoes', label: 'Notificações', icon: Bell, description: 'E-mails e alertas.' },
  { key: 'plano', label: 'Plano e Cobrança', icon: CreditCard, description: 'Assinatura e faturas.' },
  { key: 'preferencias', label: 'Preferências', icon: Sliders, description: 'Idioma, moeda e tema.' },
  { key: 'integracoes', label: 'Integrações', icon: LinkIcon, description: 'Contas conectadas.' },
];

interface Props {
  userEmail: string;
  createdAt?: string;
}

export default function ConfiguracoesContent({ userEmail, createdAt }: Props) {
  const [active, setActive] = useState<SectionKey>('perfil');
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#1C2B20]">Configurações</h1>
        <p className="mt-1 text-sm text-[#6B7480]">
          Gerencie sua conta, plano e preferências da ImmoYield.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav aria-label="Seções de configuração" className="border border-[#E2E0DA] bg-[#FAFAF8]">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center gap-2.5 border-l-2 px-4 py-2.5 text-left text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-[#4A7C59] bg-[#EBF3EE] text-[#4A7C59]'
                      : 'border-transparent text-[#6B7280] hover:bg-[#F0EFEB] hover:text-[#1C2B20]'
                  }`}
                >
                  <Icon size={13} className="shrink-0" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Main panel ───────────────────────────────────────── */}
        <div className="space-y-6">
          {active === 'perfil' && (
            <PerfilSection userEmail={userEmail} memberSince={memberSince} />
          )}
          {active === 'conta' && <ContaSection userEmail={userEmail} />}
          {active === 'seguranca' && <SegurancaSection userEmail={userEmail} />}
          {active === 'notificacoes' && <NotificacoesSection />}
          {active === 'plano' && <PlanoSection />}
          {active === 'preferencias' && <PreferenciasSection />}
          {active === 'integracoes' && <IntegracoesSection />}
        </div>
      </div>
    </div>
  );
}

/* ─── Section Shell ───────────────────────────────────────────── */
function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#E2E0DA] bg-[#FAFAF8]">
      <header className="border-b border-[#E2E0DA] px-6 py-4">
        <h2 className="text-base font-bold text-[#1C2B20]">{title}</h2>
        {description && <p className="mt-1 text-xs text-[#6B7480]">{description}</p>}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-[#6B7280] uppercase">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2 text-sm text-[#1C2B20] outline-none placeholder:text-[#9CA3AF] focus:border-[#4A7C59] disabled:opacity-60 ${
        props.className ?? ''
      }`}
    />
  );
}

function PrimaryButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`bg-[#4A7C59] px-4 py-2 text-[11px] font-semibold tracking-[0.12em] text-white uppercase transition-colors hover:bg-[#3D6B4F] disabled:opacity-60 ${
        rest.className ?? ''
      }`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`border border-[#D0CEC8] bg-transparent px-4 py-2 text-[11px] font-semibold tracking-[0.12em] text-[#6B7280] uppercase transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59] disabled:opacity-60 ${
        rest.className ?? ''
      }`}
    >
      {children}
    </button>
  );
}

function ComingSoonBadge() {
  return (
    <span className="rounded bg-[#F0EFEB] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-[#6B7480] uppercase">
      Em breve
    </span>
  );
}

/* ─── Perfil ──────────────────────────────────────────────────── */
function PerfilSection({
  userEmail,
  memberSince,
}: {
  userEmail: string;
  memberSince: string | null;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (error) throw error;
      toast.success('Perfil atualizado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Perfil" description="Estas informações aparecem em relatórios PDF e compartilhamentos.">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-[#4A7C59] font-mono text-2xl font-bold text-white">
          {userEmail[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#1C2B20]">{userEmail}</p>
          {memberSince && (
            <p className="font-mono text-xs text-[#6B7480]">Membro desde {memberSince}</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Nome completo</FieldLabel>
          <TextInput
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Empresa (opcional)</FieldLabel>
          <TextInput placeholder="Imobiliária, fundo, autônomo..." />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </PrimaryButton>
      </div>
    </SectionCard>
  );
}

/* ─── Conta ───────────────────────────────────────────────────── */
function ContaSection({ userEmail }: { userEmail: string }) {
  return (
    <>
      <SectionCard title="E-mail da conta">
        <FieldLabel>E-mail</FieldLabel>
        <TextInput value={userEmail} readOnly disabled />
        <p className="mt-2 text-xs text-[#6B7480]">
          Para alterar o e-mail, fale com o suporte em{' '}
          <a className="font-semibold text-[#4A7C59] hover:underline" href="mailto:contato@immoyield.com.br">
            contato@immoyield.com.br
          </a>
          .
        </p>
      </SectionCard>

      <SectionCard
        title="Excluir conta"
        description="A exclusão é permanente e remove todas as suas análises após 30 dias."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#6B7280]">
            Esta ação não pode ser desfeita. Confirmação por e-mail será enviada.
          </p>
          <button
            onClick={() => toast.info('Solicitação de exclusão registrada. Verifique seu e-mail.')}
            className="border border-[#FCA5A5] bg-transparent px-4 py-2 text-[11px] font-semibold tracking-[0.12em] text-[#DC2626] uppercase transition-colors hover:bg-[#FEE2E2]"
          >
            Solicitar exclusão
          </button>
        </div>
      </SectionCard>
    </>
  );
}

/* ─── Segurança ───────────────────────────────────────────────── */
function SegurancaSection({ userEmail }: { userEmail: string }) {
  const [sendingReset, setSendingReset] = useState(false);

  const handlePasswordReset = async () => {
    setSendingReset(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/configuracoes`,
      });
      if (error) throw error;
      toast.success('E-mail enviado. Verifique sua caixa de entrada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <>
      <SectionCard title="Senha" description="Receba um link por e-mail para definir uma nova senha.">
        <PrimaryButton onClick={handlePasswordReset} disabled={sendingReset}>
          {sendingReset ? 'Enviando...' : 'Enviar e-mail de redefinição'}
        </PrimaryButton>
      </SectionCard>

      <SectionCard
        title="Verificação em duas etapas"
        description="Adicione uma camada extra de segurança ao login."
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#1C2B20]">Autenticação em 2 fatores (2FA)</p>
            <p className="mt-0.5 text-xs text-[#6B7480]">
              Use um aplicativo autenticador como Google Authenticator ou 1Password.
            </p>
          </div>
          <SecondaryButton disabled>
            Ativar <ComingSoonBadge />
          </SecondaryButton>
        </div>
      </SectionCard>

      <SectionCard
        title="Sessões ativas"
        description="Locais e dispositivos onde sua conta está logada."
      >
        <div className="flex items-center justify-between border border-[#E2E0DA] bg-[#F0EFEB] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[#1C2B20]">Esta sessão</p>
            <p className="mt-0.5 font-mono text-xs text-[#6B7480]">Navegador atual · agora</p>
          </div>
          <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-[#4A7C59]">
            <CheckCircle2 size={12} />
            ATIVA
          </span>
        </div>
      </SectionCard>
    </>
  );
}

/* ─── Notificações ────────────────────────────────────────────── */
function NotificacoesSection() {
  const [settings, setSettings] = useState({
    productUpdates: true,
    weeklyDigest: false,
    benchmarkAlerts: true,
    marketing: false,
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings((s) => ({ ...s, [key]: !s[key] }));

  const items: { key: keyof typeof settings; label: string; description: string }[] = [
    {
      key: 'productUpdates',
      label: 'Atualizações do produto',
      description: 'Novas funcionalidades e melhorias importantes.',
    },
    {
      key: 'weeklyDigest',
      label: 'Resumo semanal',
      description: 'Desempenho do seu portfólio e variações de mercado.',
    },
    {
      key: 'benchmarkAlerts',
      label: 'Alertas de CDI/IPCA',
      description: 'Avisos quando indicadores macro mudam significativamente.',
    },
    {
      key: 'marketing',
      label: 'Comunicações de marketing',
      description: 'Conteúdo educativo e ofertas especiais. Pode descadastrar a qualquer momento.',
    },
  ];

  return (
    <SectionCard
      title="Notificações por e-mail"
      description="Escolha o que deseja receber em seu e-mail."
    >
      <ul className="divide-y divide-[#E2E0DA]">
        {items.map((it) => (
          <li key={it.key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1C2B20]">{it.label}</p>
              <p className="mt-0.5 text-xs text-[#6B7480]">{it.description}</p>
            </div>
            <Switch checked={settings[it.key]} onChange={() => toggle(it.key)} ariaLabel={it.label} />
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={() => toast.success('Preferências salvas')}>
          Salvar preferências
        </PrimaryButton>
      </div>
    </SectionCard>
  );
}

function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 transition-colors ${
        checked ? 'bg-[#4A7C59]' : 'bg-[#D0CEC8]'
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-1 h-4 w-4 bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/* ─── Plano e Cobrança ────────────────────────────────────────── */
function PlanoSection() {
  return (
    <>
      <SectionCard title="Plano atual">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[#4A7C59] uppercase">
              Free
            </p>
            <p className="mt-1 text-base font-bold text-[#1C2B20]">5 análises por mês</p>
            <p className="mt-0.5 text-xs text-[#6B7480]">
              Faça upgrade para análises ilimitadas e PDFs sem marca d&apos;água.
            </p>
          </div>
          <PrimaryButton onClick={() => toast.info('Upgrade em breve')}>
            Fazer upgrade
          </PrimaryButton>
        </div>
      </SectionCard>

      <SectionCard title="Histórico de cobrança" description="Faturas e recibos.">
        <p className="text-sm text-[#6B7480]">
          Você ainda não tem cobranças. <ComingSoonBadge />
        </p>
      </SectionCard>
    </>
  );
}

/* ─── Preferências ────────────────────────────────────────────── */
function PreferenciasSection() {
  const [language, setLanguage] = useState('pt-BR');
  const [currency, setCurrency] = useState('BRL');
  const [theme, setTheme] = useState('light');

  return (
    <SectionCard title="Preferências da interface">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <FieldLabel>Idioma</FieldLabel>
          <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US" disabled>
              English (em breve)
            </option>
          </Select>
        </div>
        <div>
          <FieldLabel>Moeda</FieldLabel>
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="BRL">Real (BRL)</option>
            <option value="USD" disabled>
              Dólar (em breve)
            </option>
          </Select>
        </div>
        <div>
          <FieldLabel>Tema</FieldLabel>
          <Select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="light">Claro</option>
            <option value="dark" disabled>
              Escuro (em breve)
            </option>
            <option value="system" disabled>
              Sistema (em breve)
            </option>
          </Select>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={() => toast.success('Preferências salvas')}>
          Salvar preferências
        </PrimaryButton>
      </div>
    </SectionCard>
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2 text-sm text-[#1C2B20] outline-none focus:border-[#4A7C59] ${
        props.className ?? ''
      }`}
    />
  );
}

/* ─── Integrações ─────────────────────────────────────────────── */
function IntegracoesSection() {
  const integrations = [
    { name: 'Google', description: 'Login com sua conta Google.', connected: false },
    { name: 'Stripe', description: 'Processamento de cobrança automatizado.', connected: false },
    { name: 'Notion', description: 'Exporte análises para o Notion.', connected: false, soon: true },
  ];

  return (
    <SectionCard title="Contas conectadas" description="Conecte serviços para agilizar seu fluxo.">
      <ul className="divide-y divide-[#E2E0DA]">
        {integrations.map((it) => (
          <li
            key={it.name}
            className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#1C2B20]">{it.name}</p>
                {it.soon && <ComingSoonBadge />}
              </div>
              <p className="mt-0.5 text-xs text-[#6B7480]">{it.description}</p>
            </div>
            <SecondaryButton disabled={it.soon}>
              {it.connected ? 'Desconectar' : 'Conectar'}
            </SecondaryButton>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
