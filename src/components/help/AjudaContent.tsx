'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Rocket,
  Calculator,
  Building2,
  CreditCard,
  ShieldCheck,
  PlayCircle,
  BookOpen,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface Article {
  category: string;
  title: string;
  body: string;
}

const CATEGORIES: {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'comecar',
    label: 'Primeiros passos',
    description: 'Crie sua conta e faça sua primeira análise.',
    icon: Rocket,
  },
  {
    id: 'analise',
    label: 'Análise financeira',
    description: 'Entenda yield, fluxo de caixa, TIR e payback.',
    icon: Calculator,
  },
  {
    id: 'imoveis',
    label: 'Imóveis e portfólio',
    description: 'Importe, salve e organize suas análises.',
    icon: Building2,
  },
  {
    id: 'cobranca',
    label: 'Plano e cobrança',
    description: 'Upgrade, faturas e cancelamento.',
    icon: CreditCard,
  },
  {
    id: 'seguranca',
    label: 'Conta e segurança',
    description: 'Senha, 2FA e privacidade dos dados.',
    icon: ShieldCheck,
  },
];

const ARTICLES: Article[] = [
  {
    category: 'comecar',
    title: 'Como criar minha primeira análise?',
    body: 'Vá em "Meus Imóveis" e clique em "Adicionar imóvel". Você pode colar um link de portal (ZAP, VivaReal, QuintoAndar) ou preencher os dados manualmente. Em poucos campos, calculamos yield, fluxo e TIR.',
  },
  {
    category: 'comecar',
    title: 'Posso importar de qualquer site de imóvel?',
    body: 'Suportamos os principais portais brasileiros: ZAP Imóveis, VivaReal, QuintoAndar, ImovelWeb e OLX. Para outros sites, use o cadastro manual — leva poucos minutos.',
  },
  {
    category: 'analise',
    title: 'O que é Cap Rate?',
    body: 'Cap Rate (taxa de capitalização) é o aluguel anual líquido dividido pelo preço do imóvel. Mostra o retorno sem considerar financiamento. Cap Rate típico no Brasil varia entre 4% e 8% para imóveis residenciais.',
  },
  {
    category: 'analise',
    title: 'Como vocês calculam o fluxo de caixa?',
    body: 'Receita bruta menos: vacância, manutenção, IPTU, condomínio, IR sobre aluguel, prestação do financiamento. Os defaults seguem o padrão de mercado brasileiro mas você pode ajustar tudo na planilha.',
  },
  {
    category: 'analise',
    title: 'O ITBI é configurável?',
    body: 'Sim. O ITBI varia de 2% a 4% conforme o município. O default é 3% (média de capitais), mas você pode ajustar individualmente em cada análise.',
  },
  {
    category: 'imoveis',
    title: 'Como compartilhar uma análise?',
    body: 'Em qualquer imóvel, clique no ícone de compartilhar no canto superior direito do card. Você pode gerar um link público (sem login) ou exportar um PDF.',
  },
  {
    category: 'imoveis',
    title: 'Posso exportar para PDF?',
    body: 'Sim. No plano Free, o PDF tem a marca ImmoYield. No plano Pro, você remove a marca; no Agência, faz white-label com seu logo.',
  },
  {
    category: 'cobranca',
    title: 'Como faço upgrade para o Pro?',
    body: 'Em Configurações → Plano e Cobrança, clique em "Fazer upgrade". A cobrança é mensal ou anual e processada de forma segura via Stripe.',
  },
  {
    category: 'cobranca',
    title: 'Posso cancelar a qualquer momento?',
    body: 'Sim. O cancelamento é feito direto pelas configurações. Sem multa, sem fidelidade. O acesso permanece até o final do ciclo já pago.',
  },
  {
    category: 'seguranca',
    title: 'Meus dados ficam privados?',
    body: 'Sim. Suas análises são privadas por padrão e seguimos a LGPD. Não vendemos dados a terceiros. Veja a Política de Privacidade para detalhes.',
  },
  {
    category: 'seguranca',
    title: 'Como ativo verificação em duas etapas?',
    body: 'Vá em Configurações → Segurança. A 2FA estará disponível em breve via aplicativo autenticador (Google Authenticator, 1Password, Authy).',
  },
];

export default function AjudaContent() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICLES.filter((a) => {
      if (activeCategory && a.category !== activeCategory) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      {/* ── Hero / search ──────────────────────────────────────────── */}
      <header className="mb-12 text-center">
        <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-[#6B7480] uppercase">
          Central de ajuda
        </p>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#1C2B20] md:text-[34px]">
          Como podemos ajudar?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[#6B7280]">
          Pesquise no banco de artigos ou explore por categoria. Não achou?{' '}
          <a
            href="mailto:contato@immoyield.com.br"
            className="font-semibold text-[#4A7C59] hover:underline"
          >
            fale com a gente
          </a>
          .
        </p>

        <div className="relative mx-auto mt-8 max-w-xl">
          <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-[#6B7480]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar na ajuda..."
            className="w-full border border-[#E2E0DA] bg-[#FAFAF8] py-3 pr-4 pl-11 text-sm text-[#1C2B20] outline-none placeholder:text-[#9CA3AF] focus:border-[#4A7C59]"
          />
        </div>
      </header>

      {/* ── Categories ────────────────────────────────────────────── */}
      {!query && (
        <section className="mb-12">
          <p className="mb-4 text-[11px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
            Explorar por categoria
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(isActive ? null : cat.id)}
                  className={`flex items-start gap-3 border p-4 text-left transition-colors ${
                    isActive
                      ? 'border-[#4A7C59] bg-[#EBF3EE]'
                      : 'border-[#E2E0DA] bg-[#FAFAF8] hover:border-[#D0CEC8]'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center border ${
                      isActive
                        ? 'border-[#4A7C59] bg-[#4A7C59] text-white'
                        : 'border-[#D6E4DB] bg-[#E5EFE8] text-[#4A7C59]'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1C2B20]">{cat.label}</p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">{cat.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Articles list ─────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
            {query
              ? `${filtered.length} resultado${filtered.length === 1 ? '' : 's'} para "${query}"`
              : activeCategory
                ? CATEGORIES.find((c) => c.id === activeCategory)?.label
                : 'Artigos populares'}
          </p>
          {(activeCategory || query) && (
            <button
              onClick={() => {
                setActiveCategory(null);
                setQuery('');
              }}
              className="font-mono text-xs text-[#6B7480] underline transition-colors hover:text-[#6B7280]"
            >
              Limpar
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="border border-dashed border-[#E2E0DA] bg-[#FAFAF8] p-10 text-center">
            <p className="text-sm font-semibold text-[#1C2B20]">Nenhum artigo encontrado.</p>
            <p className="mt-1 text-xs text-[#6B7480]">
              Tente outros termos ou{' '}
              <a
                href="mailto:contato@immoyield.com.br"
                className="font-semibold text-[#4A7C59] hover:underline"
              >
                envie sua dúvida
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="border border-[#E2E0DA] bg-[#FAFAF8]">
            {filtered.map((a, i) => (
              <ArticleRow key={i} article={a} />
            ))}
          </div>
        )}
      </section>

      {/* ── Resources ─────────────────────────────────────────────── */}
      <section className="mb-12">
        <p className="mb-4 text-[11px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
          Outros recursos
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ResourceCard
            icon={PlayCircle}
            title="Tutoriais em vídeo"
            description="Aprenda a usar a plataforma em poucos minutos."
            cta="Ver tutoriais"
            comingSoon
          />
          <ResourceCard
            icon={BookOpen}
            title="Guia do investidor"
            description="Conceitos, fórmulas e benchmarks do mercado brasileiro."
            cta="Abrir guia"
            comingSoon
          />
          <ResourceCard
            icon={Mail}
            title="Suporte por e-mail"
            description="Resposta em até 1 dia útil."
            cta="contato@immoyield.com.br"
            href="mailto:contato@immoyield.com.br"
          />
        </div>
      </section>

      {/* ── Contact form ──────────────────────────────────────────── */}
      <section>
        <ContactForm />
      </section>

      <p className="mt-12 text-center text-xs text-[#6B7480]">
        Ver{' '}
        <Link href="/legal/termos" className="font-semibold hover:text-[#1C2B20]">
          Termos de uso
        </Link>{' '}
        ·{' '}
        <Link href="/legal/privacidade" className="font-semibold hover:text-[#1C2B20]">
          Política de privacidade
        </Link>
      </p>
    </div>
  );
}

/* ─── Article row with expand ─────────────────────────────────── */
function ArticleRow({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#E2E0DA] last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#F0EFEB]"
      >
        <span className="flex-1 text-sm font-semibold text-[#1C2B20]">{article.title}</span>
        <ChevronRight
          size={14}
          className={`shrink-0 text-[#6B7480] transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm leading-relaxed text-[#6B7280]">{article.body}</div>
      )}
    </div>
  );
}

/* ─── Resource card ───────────────────────────────────────────── */
function ResourceCard({
  icon: Icon,
  title,
  description,
  cta,
  href,
  comingSoon,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
  href?: string;
  comingSoon?: boolean;
}) {
  const inner = (
    <div className="flex h-full flex-col gap-3 border border-[#E2E0DA] bg-[#FAFAF8] p-5 transition-colors hover:border-[#D0CEC8]">
      <div className="flex h-9 w-9 items-center justify-center border border-[#D6E4DB] bg-[#E5EFE8] text-[#4A7C59]">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-sm font-bold text-[#1C2B20]">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">{description}</p>
      </div>
      <span className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-[#4A7C59]">
        {cta}
        {comingSoon && (
          <span className="rounded bg-[#F0EFEB] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-[#6B7480] uppercase">
            Em breve
          </span>
        )}
      </span>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    );
  }
  return inner;
}

/* ─── Contact form ────────────────────────────────────────────── */
function ContactForm() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Preencha o assunto e a mensagem');
      return;
    }
    setSending(true);
    setTimeout(() => {
      toast.success('Mensagem enviada. Responderemos em até 1 dia útil.');
      setSubject('');
      setMessage('');
      setSending(false);
    }, 600);
  };

  return (
    <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-6 md:p-8">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
        Ainda precisa de ajuda?
      </p>
      <h2 className="mt-2 text-lg font-bold tracking-tight text-[#1C2B20] md:text-xl">
        Envie uma mensagem para o suporte.
      </h2>
      <p className="mt-1 text-sm text-[#6B7280]">
        Resposta em até 1 dia útil em horário comercial (BRT).
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-[#6B7280] uppercase">
            Assunto
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Problema com importação"
            className="w-full border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2 text-sm text-[#1C2B20] outline-none placeholder:text-[#9CA3AF] focus:border-[#4A7C59]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-[#6B7280] uppercase">
            Mensagem
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Descreva sua dúvida com o máximo de detalhes possível."
            className="w-full resize-none border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2 text-sm text-[#1C2B20] outline-none placeholder:text-[#9CA3AF] focus:border-[#4A7C59]"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-[#6B7480]">
            Ou escreva direto para{' '}
            <a
              href="mailto:contato@immoyield.com.br"
              className="font-semibold text-[#4A7C59] hover:underline"
            >
              contato@immoyield.com.br
            </a>
          </p>
          <button
            type="submit"
            disabled={sending}
            className="bg-[#4A7C59] px-5 py-2 text-[11px] font-semibold tracking-[0.12em] text-white uppercase transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
          >
            {sending ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </div>
      </form>
    </div>
  );
}
