'use client';
import { useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useDemoSession } from '@/components/demo-session';
import { Avatar, EmptyState, Feedback, Field, PageHeader, Panel } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  FREE_ACTIVE_STUDENT_LIMIT,
  MARKET_COMMISSION_PERCENT,
  modalities,
  money,
  retentionTerms,
  searchDirectory,
  serviceModes,
  type DirectoryEntry,
  type Offering,
  type TrainerProfile,
} from '@/domain/marketplace';
import { errorMessage } from '@/domain/schemas';
import { connectService } from '@/services/connect-service';
import { marketplaceService as market } from '@/services/marketplace-service';
import { profilePhoto, storePrivateRegistration } from '@/services/profile-media';
import { ConnectEntry } from './connect-entry';
import { ConnectPanel } from './connect-panel';

function useMarket() {
  useSyncExternalStore(connectService.subscribe, connectService.revision, () => 0);
  useSyncExternalStore(market.subscribe, market.revision, () => 0);
  return useDemoSession().session?.account;
}
function useAction() {
  const [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>, message: string) {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      await action();
      setSuccess(message);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, feedback: <Feedback error={error} success={success} /> };
}
function AccountEntry({ role }: { role: 'personal' | 'aluno' }) {
  return (
    <Panel
      title="Conta local MOVRA Connect"
      description="Abra ou crie um perfil fictício para gerenciar seu próprio acompanhamento neste navegador."
    >
      <ConnectEntry role={role} />
    </Panel>
  );
}
function Portrait({ profile }: { profile: Pick<DirectoryEntry, 'photo' | 'name'> }) {
  // A user-supplied thumbnail is already resized and embedded for portable HTML.
  return profile.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.photo} width="54" height="54" className="rounded-full" alt="" />
  ) : (
    <Avatar name={profile.name} />
  );
}
function TextField({
  name,
  label,
  initial = '',
  long = false,
  required = false,
}: {
  name: string;
  label: string;
  initial?: string;
  long?: boolean;
  required?: boolean;
}) {
  return (
    <Field label={label} htmlFor={'market-' + name}>
      {long ? (
        <Textarea
          id={'market-' + name}
          name={name}
          defaultValue={initial}
          maxLength={1500}
          required={required}
        />
      ) : (
        <Input
          id={'market-' + name}
          name={name}
          defaultValue={initial}
          maxLength={140}
          required={required}
        />
      )}
    </Field>
  );
}
function ModalityField({ initial = 'Online' }: { initial?: string }) {
  return (
    <Field label="Modalidade" htmlFor="market-modality">
      <select className="native-select" id="market-modality" name="modality" defaultValue={initial}>
        {modalities.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
    </Field>
  );
}
const formValue = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();
function ProfileEditor({ id, profile }: { id: string; profile: TrainerProfile }) {
  const { run, busy, feedback } = useAction();
  const [photo, setPhoto] = useState(profile.photo);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run(
      () =>
        market.saveProfile(id, {
          name: formValue(f, 'name'),
          specialties: formValue(f, 'specialties'),
          bio: formValue(f, 'bio'),
          education: formValue(f, 'education'),
          experience: formValue(f, 'experience'),
          certificates: formValue(f, 'certificates'),
          registration: formValue(f, 'registration'),
          region: formValue(f, 'region'),
          modality: formValue(f, 'modality') as TrainerProfile['modality'],
          photo,
          published: f.has('published'),
        }),
      'Currículo salvo neste navegador.',
    );
  }
  return (
    <Panel
      title="Currículo público"
      description="Escolha quais informações profissionais serão exibidas no diretório local."
    >
      <form onSubmit={submit} className="form-stack">
        <div className="flex items-center gap-3">
          <Portrait profile={{ ...profile, photo }} />
          <Field label="Foto do perfil (até 4 MB)" htmlFor="market-photo">
            <Input
              type="file"
              id="market-photo"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  void run(
                    async () => setPhoto(await profilePhoto(file)),
                    'Foto preparada. Salve o currículo.',
                  );
              }}
            />
          </Field>
          {photo && (
            <Button type="button" variant="outline" onClick={() => setPhoto(undefined)}>
              Remover foto
            </Button>
          )}
        </div>
        <div className="form-grid">
          <TextField name="name" label="Nome público" initial={profile.name} required />
          <TextField
            name="specialties"
            label="Especialidades"
            initial={profile.specialties}
            required
          />
          <TextField name="region" label="Região de atendimento" initial={profile.region} />
          <ModalityField initial={profile.modality} />
        </div>
        <TextField name="bio" label="Apresentação" initial={profile.bio} long />
        <div className="form-grid">
          <TextField name="education" label="Formação" initial={profile.education} long />
          <TextField
            name="experience"
            label="Experiência profissional"
            initial={profile.experience}
            long
          />
        </div>
        <TextField
          name="certificates"
          label="Títulos e certificações públicas"
          initial={profile.certificates}
          long
        />
        <TextField
          name="registration"
          label="Registro CREF e UF (declarado)"
          initial={profile.registration}
        />
        <label className="checkbox-row">
          <input type="checkbox" name="published" defaultChecked={profile.published} />
          Exibir meu perfil em Encontrar personal
        </label>
        {feedback}
        <Button type="submit" disabled={busy}>
          Salvar currículo
        </Button>
        {profile.published && (
          <Link className="underline" href={'/profissional/' + id}>
            Abrir página pública do perfil
          </Link>
        )}
      </form>
    </Panel>
  );
}
function OfferEditor({ id, offers }: { id: string; offers: Offering[] }) {
  const [editing, setEditing] = useState('');
  const item = offers.find((o) => o.id === editing);
  const { run, busy, feedback } = useAction();
  return (
    <Panel
      title="Serviços oferecidos"
      description="Os preços são mensais e demonstrativos. Edições valem para futuras adesões."
    >
      <div className="form-stack">
        <Field label="Oferta para editar" htmlFor="offer-edit">
          <select
            className="native-select"
            id="offer-edit"
            value={editing}
            onChange={(e) => setEditing(e.target.value)}
          >
            <option value="">Nova oferta</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <form
          key={editing}
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = new FormData(form);
            if (
              await run(
                () =>
                  market.saveOffer(
                    id,
                    {
                      name: formValue(f, 'offerName'),
                      price: Math.round(Number(f.get('price')) * 100),
                      description: formValue(f, 'description'),
                      mode: formValue(f, 'mode') as Offering['mode'],
                      modality: formValue(f, 'modality') as Offering['modality'],
                      chat: f.has('chat'),
                      cancellation: formValue(f, 'cancellation'),
                      updates: formValue(f, 'updates'),
                    },
                    item?.id,
                  ),
                'Oferta salva.',
              )
            ) {
              setEditing('');
              form.reset();
            }
          }}
        >
          <div className="form-grid">
            <TextField name="offerName" label="Nome do serviço" initial={item?.name} required />
            <Field label="Preço mensal (R$)" htmlFor="offer-price">
              <Input
                id="offer-price"
                type="number"
                name="price"
                min="0"
                max="100000"
                step="0.01"
                defaultValue={item ? item.price / 100 : undefined}
                required
              />
            </Field>
            <Field label="Formato de acompanhamento" htmlFor="offer-mode">
              <select
                className="native-select"
                name="mode"
                id="offer-mode"
                defaultValue={item?.mode}
              >
                {serviceModes.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <ModalityField initial={item?.modality} />
          </div>
          <TextField
            name="description"
            label="O que está incluído"
            initial={item?.description}
            required
            long
          />
          <TextField
            name="updates"
            label="Frequência de atualização"
            initial={item?.updates}
            required
          />
          <label className="checkbox-row">
            <input type="checkbox" name="chat" defaultChecked={item?.chat} />
            Incluir atendimento por conversa
          </label>
          <TextField
            name="cancellation"
            label="Condições de cancelamento"
            initial={item?.cancellation}
            required
            long
          />
          <small>{retentionTerms}</small>
          {feedback}
          <Button disabled={busy}>Salvar oferta</Button>
        </form>
      </div>
    </Panel>
  );
}
function Credential({ id, status }: { id: string; status: string }) {
  const { run, busy, feedback } = useAction();
  return (
    <Panel
      title="Documentação profissional"
      description="Use um PDF fictício. O arquivo fica no armazenamento privado desta demonstração e não aparece no currículo."
    >
      <div className="form-stack">
        <p>
          Situação: <strong>{status}</strong>
        </p>
        <Field label="Documento demonstrativo (PDF, até 1 MB)" htmlFor="registration-file">
          <Input
            id="registration-file"
            type="file"
            accept="application/pdf"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void run(async () => {
                  await storePrivateRegistration(id, file);
                  await market.setDocumentStatus(id, 'Documentação local');
                }, 'Documento guardado neste navegador.');
            }}
          />
        </Field>
        {status === 'Documentação local' && (
          <Button
            disabled={busy}
            onClick={() =>
              run(
                () => market.setDocumentStatus(id, 'Verificação pendente'),
                'Pedido demonstrativo registrado.',
              )
            }
          >
            Solicitar revisão demonstrativa
          </Button>
        )}
        <small>
          A verificação depende de revisão externa. Nenhum selo é emitido pela demonstração.
        </small>
        {feedback}
      </div>
    </Panel>
  );
}
export function BusinessPage() {
  const account = useMarket(),
    [tab, setTab] = useState('Perfil');
  const data = account?.role === 'personal' ? market.business(account.id) : null;
  return (
    <>
      <PageHeader
        eyebrow="MOVRA Connect"
        title="Meu negócio"
        description="Organize seu currículo, seus serviços e as condições que o aluno recebe."
      />
      {account && data ? (
        <>
          <div className="toolbar flex-wrap" aria-label="Seções do negócio">
            {['Perfil', 'Serviços', 'Documentação', 'Plano'].map((t) => (
              <Button
                key={t}
                variant={t === tab ? 'default' : 'outline'}
                aria-pressed={t === tab}
                onClick={() => setTab(t)}
              >
                {t}
              </Button>
            ))}
          </div>
          {tab === 'Perfil' ? (
            <ProfileEditor id={account.id} profile={data.profile} />
          ) : tab === 'Serviços' ? (
            <OfferEditor id={account.id} offers={data.offers} />
          ) : tab === 'Documentação' ? (
            <Credential id={account.id} status={data.verification} />
          ) : (
            <Panel
              title="Plano gratuito do personal"
              description="Capacidade local e condições demonstrativas do marketplace."
            >
              <dl className="grid gap-3">
                <div>
                  <dt>Alunos ativos</dt>
                  <dd>
                    {connectService.linkedStudents(account.id).length} de{' '}
                    {FREE_ACTIVE_STUDENT_LIMIT}
                  </dd>
                </div>
                <div>
                  <dt>Descoberta pelo marketplace</dt>
                  <dd>
                    Comissão prevista de {MARKET_COMMISSION_PERCENT}% sobre o serviço. Alunos
                    trazidos por convite têm comissão de descoberta zero.
                  </dd>
                </div>
                <div>
                  <dt>Plano profissional e complementos</dt>
                  <dd>Ampliação de capacidade prevista. Contratação indisponível nesta versão.</dd>
                </div>
              </dl>
              {market.contracts(account.id).map((c) => (
                <p key={c.id} className="mt-3">
                  {c.offer.name} · {c.origin === 'marketplace' ? 'Marketplace' : 'Convite direto'} ·
                  Comissão estimada {money(c.commission)} ·{' '}
                  {c.endedAt === null ? 'Simulação aberta' : 'Simulação encerrada'}
                </p>
              ))}
            </Panel>
          )}
        </>
      ) : (
        <AccountEntry role="personal" />
      )}
    </>
  );
}
function OfferSummary({ offer }: { offer: Offering }) {
  return (
    <div className="grid gap-1">
      <strong>
        {offer.name} · {money(offer.price)}/mês
      </strong>
      <p>{offer.description}</p>
      <small>
        {offer.modality} · {offer.mode} · Atualização: {offer.updates} ·{' '}
        {offer.chat ? 'Conversa incluída' : 'Sem conversa incluída'}
      </small>
      <small>Cancelamento: {offer.cancellation}</small>
    </div>
  );
}
export function MarketplacePage() {
  useMarket();
  const [q, setQ] = useState(''),
    [place, setPlace] = useState(''),
    [mode, setMode] = useState(''),
    [min, setMin] = useState(''),
    [max, setMax] = useState('');
  const results = searchDirectory(
    market.directory(),
    q,
    mode,
    place,
    Number(min) * 100,
    max ? Number(max) * 100 : Infinity,
  );
  return (
    <>
      <PageHeader
        eyebrow="Marketplace MOVRA"
        title="Encontrar meu personal"
        description="Compare especialidades, formatos e preços antes de escolher um acompanhamento."
      />
      <Panel>
        <div className="form-grid">
          <Field label="Nome ou especialidade" htmlFor="market-query">
            <Input
              id="market-query"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>
          <Field label="Cidade ou região" htmlFor="market-place">
            <Input id="market-place" value={place} onChange={(e) => setPlace(e.target.value)} />
          </Field>
          <Field label="Atendimento" htmlFor="market-format">
            <select
              className="native-select"
              id="market-format"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="">Todas as modalidades</option>
              <option>Online</option>
              <option>Presencial</option>
            </select>
          </Field>
          <Field label="Mínimo mensal (R$)" htmlFor="market-min">
            <Input
              type="number"
              min="0"
              step=".01"
              id="market-min"
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
          </Field>
          <Field label="Máximo mensal (R$)" htmlFor="market-max">
            <Input
              type="number"
              min="0"
              step=".01"
              id="market-max"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </Field>
        </div>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        {results.map((p) => (
          <Panel key={p.id}>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Portrait profile={p} />
                <div>
                  <h2>{p.name}</h2>
                  <p>{p.specialties}</p>
                </div>
              </div>
              <small className="flex items-center gap-1">
                <MapPin size={14} />
                {p.region || 'Região não informada'} · {p.modality}
              </small>
              <p>
                {p.offers.length
                  ? 'A partir de ' + money(Math.min(...p.offers.map((o) => o.price))) + '/mês'
                  : 'Serviços em preparação'}
              </p>
              <small>{p.sample ? 'Perfil ilustrativo' : p.verification}</small>
              <Button variant="outline" asChild>
                <Link href={'/profissional/' + p.id}>
                  Ver perfil de {p.name}
                  <ArrowUpRight size={16} />
                </Link>
              </Button>
            </div>
          </Panel>
        ))}
      </div>
      {!results.length && (
        <EmptyState
          title="Nenhum perfil para estes filtros."
          description="Altere a especialidade, a região ou os valores para ampliar sua busca."
        />
      )}
    </>
  );
}
function ActivateOffer({ studentId, offer }: { studentId: string; offer: Offering }) {
  const [reviewed, setReviewed] = useState('');
  const snapshot=JSON.stringify(offer);
  const accept=reviewed===snapshot;
  const { run, feedback, busy } = useAction();
  return (
    <div className="form-stack">
      <p>{retentionTerms}</p>
      <label className="checkbox-row">
        <input type="checkbox" checked={accept} onChange={(e) => setReviewed(e.target.checked?snapshot:'')} />
        Li as condições desta simulação sem cobrança.
      </label>
      <Button
        disabled={!accept || busy}
        onClick={() =>
          run(
            () => market.activateOffer(studentId, offer.id, accept, reviewed),
            'Serviço demonstrativo ativado.',
          )
        }
      >
        Ativar serviço demonstrativo
      </Button>
      {feedback}
    </div>
  );
}
export function PublicProfilePage({ id }: { id: string }) {
  const hydrated = useSyncExternalStore(subscribeHydration,()=>true,()=>false);
  const {session}=useDemoSession();
  const account = useMarket(),
    profile = market.directory().find((p) => p.id === id);
  const { run, busy, feedback } = useAction();
  const [shareUrl, setShareUrl] = useState('');
  const back =
    session?.role === 'personal' ? '/personal/negocio' : session?.role === 'aluno' ? '/aluno/marketplace' : '/entrar';
  if (!hydrated) return <main aria-busy="true" className="mx-auto max-w-3xl p-6"><p>Carregando currículo…</p></main>;
  if (!profile)
    return (
      <main className="mx-auto max-w-3xl p-6">
        <PageHeader
          eyebrow="MOVRA Connect"
          title="Perfil indisponível"
          description="O endereço pode pertencer a outro navegador ou a um currículo que saiu do diretório."
        />
        <Link className="underline" href={back}>
          Voltar à MOVRA
        </Link>
      </main>
    );
  const student = account?.role === 'aluno' ? account : undefined;
  const link = student
    ? connectService
        .professionalLinks(student.id)
        .find((l) => l.trainerId === id && l.endedAt === null)
    : null;
  const pending = student && connectService.pendingTrainer(student.id)?.id === id;
  const active =
    student &&
    link &&
    market.contracts(student.id).find((c) => c.linkId === link.id && c.endedAt === null);
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={back} className="underline">
          Voltar à MOVRA
        </Link>
        <Button variant="outline" onClick={() => setShareUrl(window.location.href)}>
          Compartilhar perfil
        </Button>
      </div>
      {shareUrl && (
        <Field label="Endereço do perfil (neste navegador)" htmlFor="share-profile">
          <Input id="share-profile" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
        </Field>
      )}
      <div className="flex items-center gap-4">
        <Portrait profile={profile} />
        <PageHeader
          eyebrow={profile.sample ? 'Currículo ilustrativo' : 'Currículo profissional'}
          title={profile.name}
          description={profile.specialties}
        />
      </div>
      <Panel title="Perfil profissional">
        <div className="grid gap-2">
          <p>{profile.bio}</p>
          <p>
            {profile.modality} · {profile.region || 'Região não informada'}
          </p>
          {[
            ['Formação', profile.education],
            ['Experiência', profile.experience],
            ['Certificações', profile.certificates],
            ['Registro declarado', profile.registration],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <p key={label}>
                <strong>{label}</strong> · {value}
              </p>
            ))}
          <small>
            {profile.verification} · Sem verificação profissional concluída. Nenhuma avaliação
            verificada publicada.
          </small>
        </div>
      </Panel>
      {profile.offers.map((o) => (
        <Panel key={o.id}>
          <div className="form-stack">
            <OfferSummary offer={o} />
            {student && link && !active && <ActivateOffer studentId={student.id} offer={o} />}
          </div>
        </Panel>
      ))}
      {!profile.sample && student && !link && (
        <Button
          disabled={busy || !!pending}
          onClick={() =>
            run(
              () => market.requestLink(student.id, id),
              'Solicitação enviada. Após a aprovação do personal, volte para escolher um serviço.',
            )
          }
        >
          {pending ? 'Aguardando aprovação do personal' : 'Solicitar acompanhamento'}
        </Button>
      )}
      {!profile.sample && active && (
        <Link className="underline" href="/aluno/personal">
          Gerenciar serviço demonstrativo
        </Link>
      )}
      {!profile.sample && !account && (
        <Link className="underline" href="/entrar">
          Abrir conta de aluno para solicitar acompanhamento
        </Link>
      )}
      {profile.sample && (
        <small>
          Esta ficha ilustra as opções do diretório. Solicitações estão disponíveis nos perfis
          publicados por contas Connect deste navegador.
        </small>
      )}
      {feedback}
    </main>
  );
}
function subscribeHydration() { return () => {}; }
export function MyTrainerPage() {
  const account = useMarket();
  const { run, busy, feedback } = useAction();
  const [confirm, setConfirm] = useState('');
  const links = account?.role === 'aluno' ? connectService.professionalLinks(account.id) : [];
  const contracts = account ? market.contracts(account.id) : [];
  return (
    <>
      <ConnectPanel studentPage />
      {account ? (
        <>
          {links
            .filter((l) => l.endedAt === null)
            .map((link) => (
              <Panel
                key={link.id}
                title={connectService.getAccount(link.trainerId)?.name || 'Personal'}
              >
                <div className="grid gap-2">
                  <p>
                    Vínculo ativo ·{' '}
                    {link.origin === 'marketplace' ? 'Marketplace MOVRA' : 'Convite direto'}
                  </p>
                  {market.directory().some((p) => p.id === link.trainerId) && (
                    <Link href={'/profissional/' + link.trainerId} className="underline">
                      Consultar currículo e serviços
                    </Link>
                  )}
                  {!contracts.some((c) => c.linkId === link.id && c.endedAt === null) && (
                    <small>Sem assinatura de serviço ativa. Nenhuma cobrança prevista.</small>
                  )}
                  {confirm === link.id ? (
                    <>
                      <p>
                        Encerrar o vínculo com {connectService.getAccount(link.trainerId)?.name}?
                        Seu histórico continuará disponível.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setConfirm('')}>
                          Cancelar
                        </Button>
                        <Button
                          disabled={busy}
                          onClick={async () => {
                            if (
                              await run(
                                () => connectService.unlink(account.id, link.trainerId),
                                'Vínculo encerrado.',
                              )
                            )
                              setConfirm('');
                          }}
                        >
                          Confirmar desvinculação
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div>
                      <Button variant="outline" onClick={() => setConfirm(link.id)}>
                        Desvincular personal
                      </Button>
                    </div>
                  )}
                </div>
              </Panel>
            ))}
          {contracts.length > 0 && (
            <Panel title="Serviços e histórico">
              <div className="grid gap-5">
                {contracts
                  .slice()
                  .reverse()
                  .map((c) => (
                    <section className="grid gap-2" key={c.id}>
                      <h3>{connectService.getAccount(c.trainerId)?.name}</h3>
                      <OfferSummary offer={c.offer} />
                      <p>
                        {c.endedAt === null
                          ? 'Assinatura demonstrativa aberta'
                          : 'Assinatura demonstrativa cancelada'}{' '}
                        · Nenhuma cobrança programada.
                      </p>
                      <small>{c.terms}</small>
                      {c.endedAt === null &&
                        (confirm === c.id ? (
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => setConfirm('')}>
                              Manter serviço
                            </Button>
                            <Button
                              disabled={busy}
                              onClick={async () => {
                                if (
                                  await run(
                                    () => market.cancel(account.id, c.id),
                                    'Serviço demonstrativo encerrado. Seus treinos salvos e seu histórico continuarão disponíveis conforme as condições de uso.',
                                  )
                                )
                                  setConfirm('');
                              }}
                            >
                              Confirmar cancelamento do serviço
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" onClick={() => setConfirm(c.id)}>
                            Cancelar serviço demonstrativo
                          </Button>
                        ))}
                    </section>
                  ))}
              </div>
            </Panel>
          )}
          {feedback}
        </>
      ) : null}
    </>
  );
}
