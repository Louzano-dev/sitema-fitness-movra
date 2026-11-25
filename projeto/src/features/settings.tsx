'use client';
import { useDemoSession } from '@/components/demo-session';
import { HabitsPanel } from './student/habits';
import { useState } from 'react';
import { Controller, useController, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDemo, useRepository } from '@/components/providers';
import { PERSONAL_FUEL_ID } from '@/services/experience-service';
import { Avatar, Feedback, Field, PageHeader, Panel } from '@/components/shared';
import { connectService } from '@/services/connect-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { profileSchema, errorMessage } from '@/domain/schemas';
import type { Environment, Profile } from '@/domain/types';
export function SettingsPage({ role }: { role: Environment }) {
  const data = useDemo();
  const { studentId, leave, session } = useDemoSession();
  const repository = useRepository();
  const [success, setSuccess] = useState('');
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<Profile>({
    resolver: zodResolver(profileSchema),
    defaultValues: data.profiles[role],
  });
  const diaryOwner = role === 'personal' ? PERSONAL_FUEL_ID : studentId;
  const canChooseNumbers =
    role === 'personal' || (role === 'aluno' && (data.experience.ages[studentId] ?? 0) >= 18);
  const nameField = useController({ control, name: 'name' }).field;
  const emailField = useController({ control, name: 'email' }).field;
  const specialtyField = useController({ control, name: 'specialty' }).field;
  return (
    <>
      <PageHeader
        eyebrow={role === 'aluno' ? 'Perfil e preferências' : 'Configurações'}
        title={role === 'aluno' ? 'Seu espaço, do seu jeito.' : 'O cuidado começa nos detalhes.'}
        description="Ajuste os dados do perfil demonstrativo e as preferências locais."
      />
      <div className="settings-layout">
        <aside className="settings-menu">
          <Avatar name={data.profiles[role].name} />
          <h2>{data.profiles[role].name}</h2>
          <p>
            Dados fictícios. A opção de avisos registra uma preferência local; nenhum e-mail ou
            notificação é enviado.
          </p>
          <p>Não há senha, sessão autenticada ou recuperação de conta nesta versão.</p>
          {canChooseNumbers && (
            <label className="checkbox-row fuel-preference">
              <input
                type="checkbox"
                checked={data.experience.preferences[diaryOwner]?.showNumbers ?? true}
                onChange={(event) => {
                  const showNumbers = event.currentTarget.checked;
                  repository.updateExperience((state) => ({
                    ...state,
                    preferences: {
                      ...state.preferences,
                      [diaryOwner]: { showNumbers, share: false },
                    },
                  }));
                  setSuccess('Preferência do diário atualizada.');
                }}
              />
              Exibir estimativas numéricas no meu diário
            </label>
          )}
          {!session?.account && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Redefinir dados demonstrativos</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Restaurar todos os exemplos?</DialogTitle>
                  <DialogDescription>
                    Remove fichas, refeições e registros fictícios salvos neste navegador, de todos
                    os perfis desta demonstração. Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <Button
                  variant="destructive"
                  onClick={() => {
                    repository.reset();
                    leave();
                  }}
                >
                  Confirmar redefinição dos dados
                </Button>
              </DialogContent>
            </Dialog>
          )}
        </aside>
        <Panel className="settings-card">
          <h2 className="mb-6">Informações do perfil</h2>
          <form
            className="form-stack"
            onSubmit={handleSubmit(async (input) => {
              setSuccess('');
              try {
                await repository.saveProfile(role, input, studentId);
                if (session?.account)
                  await connectService.renameAccount(session.account.id, input.name);
                reset(input);
                setSuccess('Perfil atualizado nesta demonstração.');
              } catch (error) {
                setError('root', { message: errorMessage(error) });
              }
            })}
          >
            <div className="form-grid">
              <Field label="Nome completo" htmlFor="profile-name" error={errors.name?.message}>
                <Input
                  id="profile-name"
                  {...nameField}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'profile-name-error' : undefined}
                />
              </Field>
              <Field label="E-mail fictício" htmlFor="profile-email" error={errors.email?.message}>
                <Input
                  id="profile-email"
                  type="email"
                  {...emailField}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'profile-email-error' : undefined}
                />
              </Field>
            </div>
            <Field
              label={
                role === 'aluno' ? 'Objetivo do acompanhamento' : 'Especialidade ou apresentação'
              }
              htmlFor="profile-specialty"
              error={errors.specialty?.message}
            >
              <Textarea id="profile-specialty" {...specialtyField} maxLength={150} />
            </Field>
            <label className="checkbox-row">
              <Controller
                control={control}
                name="notifications"
                render={({ field: { value, onChange, ...field } }) => (
                  <input
                    {...field}
                    type="checkbox"
                    checked={value}
                    onChange={(event) => onChange(event.target.checked)}
                  />
                )}
              />
              Preferência demonstrativa de receber avisos
            </label>
            <Feedback error={errors.root?.message} success={success} />
            <div className="form-actions">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Atualizando…' : 'Salvar perfil na prévia'}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
      {role === 'aluno' && <HabitsPanel settings />}
    </>
  );
}
