'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  Layers,
  Pause,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Feedback, Field } from '@/components/shared';
import { useDemoSession } from '@/components/demo-session';
import { TrendChart } from '@/components/charts';
import { LOGIN_POSTER, LOGIN_VIDEO } from './login-media';
import type { Environment } from '@/domain/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PersonalDashboard } from './personal/dashboard';
import { motion } from '@/components/motion';
gsap.registerPlugin(useGSAP, ScrollTrigger);
const subscribeMotion = (callback: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function LoginPage() {
  const { enter } = useDemoSession();
  const router = useRouter();
  const scope = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [creationStep, setCreationStep] = useState(0);
  const [role, setRole] = useState<Environment>('personal');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('personal@example.com');
  const [showPassword, setShowPassword] = useState(false);
  const [accountMode, setAccountMode] = useState<'recover' | 'create' | null>(null);
  const [accountFeedback, setAccountFeedback] = useState('');
  const manuallyPaused = useRef(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const reduce = useSyncExternalStore(subscribeMotion, reducedMotion, () => true);
  const [videoFailed, setVideoFailed] = useState(false);
  const allowVideo =
    !!LOGIN_VIDEO &&
    !reduce &&
    !videoFailed &&
    !(
      typeof navigator !== 'undefined' &&
      (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
        .connection?.saveData
    ) &&
    !(
      typeof navigator !== 'undefined' &&
      ['slow-2g', '2g', '3g'].includes(
        (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
          ?.effectiveType ?? '',
      )
    );
  useEffect(() => {
    if (!allowVideo || !video.current) return;
    const element = video.current;
    let visible = true;
    function syncPlayback() {
      if (!visible || document.hidden) element.pause();
      else if (!manuallyPaused.current && !autoplayBlocked)
        void element.play().catch(() => setAutoplayBlocked(true));
    }
    const observer = new IntersectionObserver(
      (entries) => {
        // isIntersecting can remain true at an edge with zero visible area.
        visible = entries[0].isIntersecting && entries[0].intersectionRatio > 0.01;
        syncPlayback();
      },
      { threshold: [0, 0.01] },
    );
    document.addEventListener('visibilitychange', syncPlayback);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      element.pause();
    };
  }, [allowVideo, autoplayBlocked]);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ defaults: { duration: motion.entrance, ease: motion.ease } })
          .fromTo('.entry-scene,.entry-video', { scale: 1.025 }, { scale: 1, duration: 0.8 })
          .fromTo('.entry-nav .brand', { y: -12 }, { y: 0 }, 0)
          .fromTo('.entry-copy h1 .title-line', { y: 24 }, { y: 0, stagger: 0.07 }, 0.08)
          .fromTo('.entry-form', { x: 16 }, { x: 0 }, 0.12)
          .fromTo('.entry-form .field', { y: 8 }, { y: 0, stagger: 0.045 }, 0.18)
          .fromTo('.entry-bottom', { y: 6 }, { y: 0, duration: motion.surface }, 0.25);
        gsap.fromTo(
          '.marketing-dashboard .stat',
          { y: 14 },
          {
            y: 0,
            stagger: 0.06,
            duration: motion.entrance,
            ease: motion.ease,
            scrollTrigger: { trigger: '.marketing-dashboard', start: 'top 85%', once: true },
          },
        );
        gsap.fromTo(
          '.evolution-preview',
          { y: 20 },
          {
            y: 0,
            duration: motion.entrance,
            ease: motion.ease,
            scrollTrigger: { trigger: '.evolution-preview', start: 'top 85%', once: true },
          },
        );
      });
      media.add('(prefers-reduced-motion: no-preference) and (min-width: 1000px)', () => {
        gsap.to('.entry-scene', {
          y: 70,
          scale: 1.05,
          ease: 'none',
          scrollTrigger: {
            trigger: '.entry-hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.7,
          },
        });
        gsap.to('.depth-orbit', {
          rotate: 55,
          y: -40,
          ease: 'none',
          scrollTrigger: { trigger: '.benefits', start: 'top bottom', end: 'bottom top', scrub: 1 },
        });
        gsap.fromTo(
          '.product-board',
          { scale: 0.94, rotateX: 4 },
          {
            scale: 1,
            rotateX: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: '.product-story',
              start: 'top 15%',
              end: '+=360',
              pin: true,
              scrub: 0.6,
            },
          },
        );
        gsap.to('.training-steps .step-line', {
          scaleY: 1,
          transformOrigin: 'top',
          ease: 'none',
          scrollTrigger: {
            trigger: '.training-steps',
            start: 'top 75%',
            end: 'bottom 65%',
            scrub: 0.5,
          },
        });
      });
      return () => media.revert();
    },
    { scope },
  );
  async function start(nextRole = role, nextName = name, destination?: string, nextEmail = email) {
    setBusy(true);
    setError('');
    try {
      await enter(nextRole, nextName, nextEmail);
      setEmail('personal@example.com');
      router.push(destination ?? `/${nextRole}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revise os dados.');
    } finally {
      setBusy(false);
    }
  }
  function goToForm() {
    document
      .getElementById('entry-form')
      ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    document.getElementById('demo-name')?.focus({ preventScroll: true });
  }
  function scrollToSection(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  return (
    <div className="cinema" ref={scope}>
      <section className="entry-hero" aria-labelledby="entry-heading">
        <div
          className="entry-scene"
          aria-hidden
          style={{ backgroundImage: `url("${LOGIN_POSTER}")` }}
        />
        {allowVideo && (
          <video
            ref={video}
            className={`entry-video ${ready && !autoplayBlocked ? 'is-ready' : ''}`}
            src={LOGIN_VIDEO!}
            poster={LOGIN_POSTER}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            aria-hidden
            onCanPlay={() => setReady(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => {
              setVideoFailed(true);
              setReady(false);
            }}
          />
        )}
        <div className="entry-shade" aria-hidden />
        <header className="entry-nav">
          <a
            href="#entry-form"
            aria-label="MOVRA, entrada"
            onClick={(event) => {
              event.preventDefault();
              goToForm();
            }}
          >
            <Brand />
          </a>
          <a href="#beneficios" onClick={(event) => scrollToSection(event, 'beneficios')}>
            Conheça a experiência <ArrowDown size={14} />
          </a>
          <span className="entry-edition">Movimento com presença.</span>
        </header>
        <div className="entry-grid">
          <div className="entry-copy">
            <p className="cinema-label">
              <span />A evolução começa com presença
            </p>
            <h1 id="entry-heading">
              <span className="title-line">Seu movimento.</span>
              <span className="title-line">Sua evolução.</span>
              <em className="title-line">Nosso encontro.</em>
            </h1>
            <p>
              O planejamento do personal.
              <br />O movimento do atleta.
              <br />
              Um mesmo percurso.
            </p>
            <a
              className="entry-scroll"
              href="#beneficios"
              onClick={(event) => scrollToSection(event, 'beneficios')}
            >
              <span>
                <ArrowDown size={17} />
              </span>
              Continue o movimento
            </a>
          </div>
          <div className="entry-form" id="entry-form">
            <div className="access-brand">
              <Brand />
            </div>
            <h2>Bom ter você aqui.</h2>
            <p>Escolha como quer experimentar a MOVRA.</p>
            <div className="entry-roles" aria-label="Tipo de perfil">
              <button
                type="button"
                aria-pressed={role === 'personal'}
                onClick={() => setRole('personal')}
              >
                Personal trainer
              </button>
              <button
                type="button"
                aria-pressed={role === 'aluno'}
                onClick={() => setRole('aluno')}
              >
                Aluno / atleta
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void start();
              }}
            >
              <Field label="Como podemos te chamar?" htmlFor="demo-name">
                <Input
                  id="demo-name"
                  placeholder="Seu nome fictício"
                  autoComplete="off"
                  minLength={2}
                  maxLength={80}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="E-mail fictício" htmlFor="access-email">
                <Input
                  id="access-email"
                  type="email"
                  value={email}
                  autoComplete="off"
                  pattern="[^@]+@example\.com"
                  title="Use um endereço fictício terminado em @example.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Senha de exemplo (não editável)" htmlFor="access-password">
                <div className="password-sample">
                  <Input
                    id="access-password"
                    type={showPassword ? 'text' : 'password'}
                    value="demonstracao"
                    readOnly
                    aria-describedby="password-help"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? 'Ocultar senha de exemplo' : 'Mostrar senha de exemplo'
                    }
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <p id="password-help" className="entry-hint">
                Amostra visual. Não informe uma senha real.
              </p>
              <button
                className="access-link"
                type="button"
                onClick={() => {
                  setAccountFeedback('');
                  setAccountMode('recover');
                }}
              >
                Recuperar acesso · protótipo
              </button>
              <Feedback error={error} />
              <Button className="entry-submit" type="submit" disabled={busy}>
                {busy ? 'Preparando seu espaço…' : 'Entrar na demonstração'}
                <ArrowUpRight size={18} />
              </Button>
              <div className="access-options">
                <button
                  type="button"
                  onClick={() => {
                    setAccountFeedback('');
                    setAccountMode('create');
                  }}
                >
                  Criar conta · protótipo
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void start(role, role === 'personal' ? 'Alex Personal' : 'Alex Atleta')
                  }
                >
                  Experimentar sem preencher
                </button>
              </div>
            </form>
            <div className="entry-security">
              <ShieldCheck size={17} />
              <p>
                Experiência demonstrativa, sem autenticação real. Os dados reiniciam ao sair ou
                recarregar.
              </p>
            </div>
            <button
              className="entry-admin"
              disabled={busy}
              onClick={() => void start('admin', 'Equipe MOVRA')}
            >
              Visualizar operação administrativa
            </button>
          </div>
        </div>
        <div className="entry-bottom">
          <span>01 — Presença em cada etapa</span>
          {allowVideo && ready ? (
            <button
              onClick={() => {
                const element = video.current;
                if (!element) return;
                if (element.paused) {
                  manuallyPaused.current = false;
                  setAutoplayBlocked(false);
                  void element
                    .play()
                    .then(() => setPlaying(true))
                    .catch(() => setAutoplayBlocked(true));
                } else {
                  manuallyPaused.current = true;
                  element.pause();
                  setPlaying(false);
                }
              }}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}{' '}
              {playing ? 'Pausar vídeo' : 'Reproduzir vídeo'}
            </button>
          ) : (
            <span>
              {videoFailed
                ? 'Não foi possível carregar o vídeo · exibindo poster'
                : reduce
                  ? 'Movimento reduzido · poster estático'
                  : LOGIN_VIDEO
                    ? 'Cinematografia MOVRA · poster disponível'
                    : 'Poster estático · vídeo em preparação'}
            </span>
          )}
        </div>
      </section>
      <Dialog
        open={accountMode !== null}
        onOpenChange={(open) => {
          if (!open) setAccountMode(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accountMode === 'recover'
                ? 'Recuperar acesso demonstrativo'
                : 'Criar perfil demonstrativo'}
            </DialogTitle>
            <DialogDescription>
              Fluxo somente local. Não há conta real, armazenamento de senha ou envio de e-mail.
            </DialogDescription>
          </DialogHeader>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (accountMode === 'recover')
                setAccountFeedback(
                  'Nenhum e-mail foi enviado. Você pode acessar a experiência pelo botão de demonstração.',
                );
              else {
                const values = new FormData(event.currentTarget);
                void start(
                  role,
                  String(values.get('displayName')),
                  undefined,
                  String(values.get('email')),
                );
              }
            }}
          >
            {accountMode === 'create' && (
              <Field label="Nome fictício do perfil" htmlFor="new-display-name">
                <Input
                  id="new-display-name"
                  name="displayName"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </Field>
            )}
            <Field label="E-mail de exemplo" htmlFor="account-email">
              <Input
                id="account-email"
                name="email"
                type="email"
                defaultValue="demo@example.com"
                pattern="[^@]+@example\.com"
                required
              />
            </Field>
            <Feedback success={accountFeedback} />
            <Button type="submit" disabled={busy}>
              {accountMode === 'recover'
                ? 'Visualizar orientação de acesso'
                : 'Criar e abrir demonstração'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <section id="beneficios" className="cinema-section benefits">
        <div className="chapter-heading">
          <p className="cinema-label">02 — O dia do personal</p>
          <h2>
            Clareza para decidir.
            <br />
            <span>Contexto para acompanhar.</span>
          </h2>
          <p>
            O painel real do protótipo, com os mesmos componentes e dados demonstrativos. Entre para
            editar.
          </p>
        </div>
        <div
          className="marketing-dashboard"
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest('a')) {
              event.preventDefault();
              goToForm();
            }
          }}
        >
          <PersonalDashboard />
        </div>
        <div className="depth-orbit" aria-hidden />
      </section>
      <section className="cinema-section product-story">
        <div className="chapter-heading">
          <p className="cinema-label">03 — Da ideia ao treino</p>
          <h2>
            Um plano que respeita
            <br />
            <span>cada pessoa.</span>
          </h2>
        </div>
        <div className="product-board creation-board">
          <div className="creation-navigation">
            {['Selecionar aluno', 'Montar treino', 'Adicionar exercícios', 'Atribuir ficha'].map(
              (label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={creationStep === index}
                  onClick={() => setCreationStep(index)}
                >
                  <span>0{index + 1}</span>
                  {label}
                </button>
              ),
            )}
          </div>
          <div className="creation-detail">
            <p className="cinema-label">Fluxo demonstrativo · etapa {creationStep + 1}</p>
            <h3>
              {
                ['Ana Costa', 'A · Força e base', 'Agachamento livre', 'Ficha pronta para revisar'][
                  creationStep
                ]
              }
            </h3>
            <p>
              {
                [
                  'Um objetivo individual organiza o acompanhamento.',
                  'Defina o título e as orientações do personal.',
                  'Configure carga, repetições, séries e descanso.',
                  'Confira a prévia antes de atribuir ao aluno.',
                ][creationStep]
              }
            </p>
            <div className="creation-prescription">
              <span>3 séries</span>
              <span>12 repetições</span>
              <span>60 s</span>
            </div>
            <Button
              onClick={() => void start('personal', 'Alex Personal', '/personal/treinos/novo')}
            >
              Montar minha ficha
              <ArrowUpRight size={16} />
            </Button>
          </div>
        </div>
      </section>
      <section className="cinema-section training-story">
        <div className="chapter-heading">
          <p className="cinema-label">04 — Espaço do atleta</p>
          <h2>
            O próximo exercício.
            <br />
            <span>Só o que você precisa.</span>
          </h2>
          <p>Uma experiência direta para usar durante o treino.</p>
        </div>
        <div className="training-steps">
          <div className="step-line" aria-hidden />
          {[
            ['01', 'Veja seu treino', 'Prescrição e orientações sempre por perto.'],
            ['02', 'Registre cada série', 'Carga e repetições com controles acessíveis.'],
            [
              '03',
              'Reconheça seu percurso',
              'Histórico individual, sem comparação com outras pessoas.',
            ],
          ].map(([n, title, text]) => (
            <article key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="set-specimen">
          <Layers size={24} />
          <h3>Agachamento livre</h3>
          <p>Exemplo de registro · 3 séries × 12 repetições</p>
          <div>
            <span>Série 01</span>
            <strong>20 kg</strong>
            <strong>12 reps</strong>
            <Check size={18} />
          </div>
          <div>
            <span>Série 02</span>
            <strong>20 kg</strong>
            <strong>12 reps</strong>
            <Check size={18} />
          </div>
          <p className="specimen-context">Último registro: 20 kg · descanso prescrito: 60 s</p>
          <Button onClick={() => void start('aluno', 'Alex Atleta', '/aluno/treinos/treino-a')}>
            Experimentar o treino <ArrowUpRight size={16} />
          </Button>
        </div>
      </section>
      <section className="cinema-section evolution-story">
        <div className="chapter-heading">
          <p className="cinema-label">05 — Evolução com contexto</p>
          <h2>
            Seu progresso
            <br />
            <span>tem o seu tempo.</span>
          </h2>
          <p>
            Um histórico para conversar com seu personal. Sem interpretações clínicas automáticas.
          </p>
        </div>
        <div className="evolution-preview">
          <p>Exemplo de evolução · peso registrado (kg)</p>
          <TrendChart
            kind="line"
            label="Peso demonstrativo"
            unit="kg"
            data={[
              { label: 'Ago', value: 68.5 },
              { label: 'Set', value: 68 },
              { label: 'Out', value: 67.8 },
              { label: 'Nov', value: 68.1 },
            ]}
          />
        </div>
      </section>
      <section className="cinema-section connection-story">
        <div className="chapter-heading">
          <p className="cinema-label">06 — Dois olhares, um percurso</p>
          <h2>
            O registro do atleta.
            <br />
            <span>O contexto do personal.</span>
          </h2>
        </div>
        <div className="connection-flow">
          <article>
            <span>ALUNO</span>
            <h3>Uma série registrada.</h3>
            <p>Carga, repetições e conclusão compõem o histórico individual.</p>
          </article>
          <ArrowUpRight size={30} aria-hidden />
          <article>
            <span>PERSONAL</span>
            <h3>Um próximo passo melhor.</h3>
            <p>O mesmo registro aparece no acompanhamento, sem copiar informações.</p>
          </article>
        </div>
        <p className="form-help">
          Na demonstração, os registros ficam em memória e reiniciam ao sair.
        </p>
      </section>
      <section className="cinema-section entry-finale">
        <p className="cinema-label">07 — O seu próximo passo</p>
        <Brand />
        <h2>
          Presença transforma
          <br />o acompanhamento.
        </h2>
        <Button onClick={goToForm}>
          Experimentar a MOVRA
          <ArrowUpRight size={18} />
        </Button>
        <p>Personal e atleta. Cada um no seu ritmo.</p>
        <footer>MOVRA · Protótipo demonstrativo · Sem autenticação real</footer>
      </section>
    </div>
  );
}
