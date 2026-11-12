'use client';
import { useState } from 'react';
import { Controller, useController, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDemo, useRepository } from '@/components/providers';
import { Avatar, Feedback, Field, PageHeader, Panel } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { profileSchema, errorMessage } from '@/domain/schemas';
import type { Environment, Profile } from '@/domain/types';
export function SettingsPage({ role }: { role: Environment }) {
  const data = useDemo();
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
        </aside>
        <Panel className="settings-card">
          <h2 className="mb-6">Informações do perfil</h2>
          <form
            className="form-stack"
            onSubmit={handleSubmit(async (input) => {
              setSuccess('');
              try {
                await repository.saveProfile(role, input);
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
    </>
  );
}
