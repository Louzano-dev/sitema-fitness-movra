'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CircleCheck, SearchX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { initials } from '@/domain/selectors';
import { cn } from '@/lib/utils';
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="page-action">{action}</div>}
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('panel', className)}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Avatar({
  name,
  color = 'sage',
  small = false,
}: {
  name: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <span className={cn('avatar', `avatar-${color}`, small && 'avatar-small')} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
export function Status({ value }: { value: string }) {
  const positive = ['Ativo', 'Ativa', 'Agendado', 'Concluído'].includes(value);
  return (
    <Badge variant="outline" className={cn('status-badge', positive && 'status-positive')}>
      <span className="status-dot" />
      {value}
    </Badge>
  );
}
export function Stat({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon?: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{label}</span>
        {Icon && <Icon size={18} aria-hidden />}
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}
export function EmptyState({
  title = 'Nenhum resultado por aqui.',
  description = 'Ajuste os filtros ou adicione o primeiro registro.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <SearchX size={32} aria-hidden />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Feedback({ error, success }: { error?: string; success?: string }) {
  return (
    <>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-success" role="status">
          <CircleCheck size={18} aria-hidden />
          {success}
        </p>
      )}
    </>
  );
}
export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && (
        <p className="field-error" id={htmlFor ? `${htmlFor}-error` : undefined}>
          {error}
        </p>
      )}
    </div>
  );
}
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-link">
      {children}
      <ArrowUpRight size={16} aria-hidden />
    </Link>
  );
}
export function TableRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="table-region" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
