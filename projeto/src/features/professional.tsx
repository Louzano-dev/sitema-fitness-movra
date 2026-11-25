'use client';

import { useId, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, CircleCheck, ImageUp } from 'lucide-react';
import { useDemoSession } from '@/components/demo-session';
import { useDemo } from '@/components/providers';
import { Avatar, Feedback, Field, PageHeader, Panel } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { modalities, type TrainerProfile, whatsappNumber } from '@/domain/professional';
import { errorMessage } from '@/domain/schemas';
import { libraryGroups, type Library } from '@/domain/student-library';
import type { Workout } from '@/domain/types';
import { connectService } from '@/services/connect-service';
import { linkAllows, professionalService } from '@/services/professional-service';
import { profilePhoto } from '@/services/profile-media';
import { ConnectEntry } from './connect-entry';
import { ConnectFooter, ConnectHeading, PendingRequest, StudentConnect } from './connect';

const profileFields = [
  { name: 'bio', label: 'Biografia' },
  { name: 'education', label: 'Formação' },
  { name: 'experience', label: 'Experiência profissional' },
  { name: 'certificates', label: 'Certificações' },
] as const;

function useProfileSession() {
  useSyncExternalStore(professionalService.subscribe, professionalService.revision, () => 0);
  useSyncExternalStore(connectService.subscribe, connectService.revision, () => 0);
  return useDemoSession();
}

function Portrait({ name, photo }: Pick<TrainerProfile, 'name' | 'photo'>) {
  return photo ? (
    // This user-supplied thumbnail is already resized for offline use.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} width={64} height={64} alt="" />
  ) : (
    <Avatar name={name} />
  );
}

function ProfileEditor({ id, profile }: { id: string; profile: TrainerProfile }) {
  const [photo, setPhoto] = useState(profile.photo);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const prefix = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await professionalService.saveProfile(id, {
        name: value('name'),
        specialties: value('specialties'),
        region: value('region'),
        bio: value('bio'),
        education: value('education'),
        experience: value('experience'),
        certificates: value('certificates'),
        registration: value('registration'),
        modality: value('modality') as TrainerProfile['modality'],
        whatsapp: value('whatsapp'),
        photo,
      });
      setSuccess('Currículo salvo neste navegador.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Currículo"
      description="Estas informações ficam disponíveis para seus alunos vinculados."
    >
      <form onSubmit={submit} className="form-stack professional-form">
        <div className="professional-photo connect-identity">
          <Portrait name={profile.name} photo={photo} />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              <ImageUp size={17} aria-hidden /> Alterar foto
            </Button>
            {photo && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setPhoto(undefined)}
              >
                Remover foto
              </Button>
            )}
            <input
              ref={fileInput}
              type="file"
              aria-label="Foto do perfil"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (!file) return;
                setBusy(true);
                setError('');
                setSuccess('');
                try {
                  setPhoto(await profilePhoto(file));
                } catch (reason) {
                  setError(errorMessage(reason));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
        </div>
        <div className="form-grid">
          <Field label="Nome profissional" htmlFor={prefix + 'name'}>
            <Input
              id={prefix + 'name'}
              name="name"
              defaultValue={profile.name}
              minLength={2}
              maxLength={140}
              required
            />
          </Field>
          <Field label="Especialidades" htmlFor={prefix + 'specialties'}>
            <Input
              id={prefix + 'specialties'}
              name="specialties"
              defaultValue={profile.specialties}
              maxLength={140}
            />
          </Field>
          <Field label="Modalidade" htmlFor={prefix + 'modality'}>
            <select
              id={prefix + 'modality'}
              name="modality"
              defaultValue={profile.modality}
              className="native-select"
            >
              {modalities.map((mode) => (
                <option key={mode}>{mode}</option>
              ))}
            </select>
          </Field>
          <Field label="Região de atendimento" htmlFor={prefix + 'region'}>
            <Input
              id={prefix + 'region'}
              name="region"
              defaultValue={profile.region}
              maxLength={140}
            />
          </Field>
        </div>
        <div className="form-grid">
          {profileFields.map(({ name, label }) => (
            <Field key={name} label={label} htmlFor={prefix + name}>
              <Textarea
                id={prefix + name}
                name={name}
                maxLength={1500}
                defaultValue={profile[name]}
              />
            </Field>
          ))}
          <Field label="Registro profissional (CREF e UF)" htmlFor={prefix + 'registration'}>
            <Input
              id={prefix + 'registration'}
              name="registration"
              defaultValue={profile.registration}
              maxLength={140}
            />
          </Field>
          <Field label="WhatsApp profissional (opcional)" htmlFor={prefix + 'whatsapp'}>
            <Input
              type="tel"
              id={prefix + 'whatsapp'}
              name="whatsapp"
              defaultValue={profile.whatsapp}
              maxLength={35}
              placeholder="+55 11 91234-5678"
            />
          </Field>
        </div>
        <Feedback error={error} success={success} />
        <Button type="submit" disabled={busy}>
          Salvar currículo
        </Button>
      </form>
    </Panel>
  );
}

export function BusinessPage() {
  const { session } = useProfileSession();
  const account = session?.account;
  return (
    <>
      <PageHeader
        eyebrow="MOVRA Connect"
        title="Perfil profissional"
        action={
          <Button variant="outline" asChild>
            <Link href="/personal/configuracoes">Configurações</Link>
          </Button>
        }
      />
      {account?.role === 'personal' && connectService.isActive(account.id) ? (
        <ProfileEditor
          key={account.id}
          id={account.id}
          profile={professionalService.ownProfile(account.id)}
        />
      ) : (
        <Panel
          title="Seu currículo na MOVRA"
          description="Abra uma conta de personal neste navegador para editar seu perfil profissional."
        >
          <ConnectEntry role="personal" />
        </Panel>
      )}
    </>
  );
}

function LinkedTrainer({
  profile,
  trainerId,
  studentId,
  workouts,
  library,
  hasAppointments,
}: {
  profile: TrainerProfile;
  trainerId: string;
  studentId: string;
  workouts: Workout[];
  library?: Library;
  hasAppointments: boolean;
}) {
  const titleId = useId();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const groups = libraryGroups(workouts, studentId, library ?? { entries: {} }).filter(
    ({ status }) => status === 'active' || status === 'saved',
  );
  const phone = whatsappNumber(profile.whatsapp ?? '');
  const hasAgenda = hasAppointments || linkAllows(trainerId, studentId, 'appointments');
  const details = [
    { label: 'Formação', value: profile.education },
    { label: 'Experiência profissional', value: profile.experience },
    { label: 'Certificações', value: profile.certificates },
    { label: 'Registro declarado', value: profile.registration },
  ].filter(({ value }) => !!value);

  return (
    <section className="linked-trainer" aria-labelledby={titleId}>
      <div className="connect-identity">
        <Portrait name={profile.name} photo={profile.photo} />
        <div>
          <h2 id={titleId}>{profile.name}</h2>
          {profile.specialties && <p>{profile.specialties}</p>}
          <small>
            <CircleCheck size={15} aria-hidden /> Vínculo ativo
          </small>
        </div>
      </div>
      {profile.bio && <p className="professional-copy">{profile.bio}</p>}
      <p className="professional-modality">
        {[profile.modality, profile.region].filter(Boolean).join(' · ')}
      </p>
      {details.length > 0 && (
        <dl className="professional-details">
          {details.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="professional-workouts">
        <h3>Treinos atribuídos</h3>
        {groups.length ? (
          <ul>
            {groups.map(({ key, title, days }) => (
              <li key={key}>
                <Link href={'/aluno/treinos/' + days[0].id}>{title}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>As fichas atribuídas pelo personal aparecerão aqui.</p>
        )}
      </div>
      <div className="professional-actions">
        {phone && (
          <Button variant="outline" asChild>
            <a href={'https://wa.me/' + phone} target="_blank" rel="noopener noreferrer">
              WhatsApp profissional <ArrowUpRight size={16} aria-hidden />
            </a>
          </Button>
        )}
        {hasAgenda && (
          <Button variant="outline" asChild>
            <Link href="/aluno/agenda">
              <CalendarDays size={16} aria-hidden /> Meus encontros
            </Link>
          </Button>
        )}
        <Dialog
          onOpenChange={(open) => {
            if (open) setError('');
          }}
        >
          <DialogTrigger asChild>
            <Button variant="ghost">Desvincular personal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Encerrar vínculo com {profile.name}?</DialogTitle>
              <DialogDescription>
                Seus treinos já entregues e seu histórico continuam na sua biblioteca.
              </DialogDescription>
            </DialogHeader>
            <Feedback error={error} />
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await connectService.unlink(studentId, trainerId);
                } catch (reason) {
                  setError(errorMessage(reason));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirmar desvinculação
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

export function MyTrainerPage() {
  const { session, enterAccount } = useProfileSession();
  const data = useDemo();
  const titleId = useId();
  const account = session?.account?.role === 'aluno' ? session.account : undefined;
  const trainers = account ? connectService.activeTrainers(account.id) : [];
  const invitation = session?.invitation;
  const onInvitationUsed = account && invitation ? () => enterAccount(account) : undefined;
  if (!account || !trainers.length) {
    return (
      <StudentConnect
        key={account?.id ?? 'guest'}
        account={account}
        initialCredential={invitation}
        onInvitationUsed={onInvitationUsed}
      />
    );
  }

  return (
    <section className="student-connect" aria-labelledby={titleId}>
      <ConnectHeading title="Meu personal" id={titleId} />
      <div className="connect-body">
        {trainers.map((trainer) => {
          const profile = professionalService.linkedProfile(account.id, trainer.id);
          return (
            profile && (
              <LinkedTrainer
                key={trainer.id}
                profile={profile}
                trainerId={trainer.id}
                studentId={account.id}
                workouts={data.workouts.filter(
                  (workout) => workout.delivery?.trainerId === trainer.id,
                )}
                library={data.experience.libraries?.[account.id]}
                hasAppointments={data.appointments.some(
                  (entry) => entry.studentId === account.id && entry.trainerId === trainer.id,
                )}
              />
            )
          );
        })}
        <PendingRequest account={account} />
        <details className="connect-another" open={invitation ? true : undefined}>
          <summary>Usar outro convite</summary>
          <StudentConnect
            account={account}
            initialCredential={invitation}
            onInvitationUsed={onInvitationUsed}
            embedded
          />
        </details>
      </div>
      <ConnectFooter />
    </section>
  );
}
