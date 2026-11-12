'use client';
import { Building2, CreditCard, Layers, Users } from 'lucide-react';
import { useDemo } from '@/components/providers';
import { PageHeader, Panel, Stat, Status, TableRegion, TextLink } from '@/components/shared';
import { TrendChart } from '@/components/charts';
import { formatDate } from '@/domain/selectors';
export function AdminDashboard() {
  const data = useDemo();
  const points = data.plans.map((p) => ({
    label: p.name,
    value: data.organizations.filter((o) => o.planId === p.id).length,
  }));
  return (
    <>
      <PageHeader
        eyebrow="Operação da plataforma"
        title="Uma visão de todo o movimento."
        description="Organizações, planos e assinaturas de exemplo. Indicadores operacionais derivados dos dados demonstrativos."
      />
      <div className="stats-grid">
        <Stat
          label="Organizações"
          value={data.organizations.length}
          note="Total neste conjunto demonstrativo"
          icon={Building2}
        />
        <Stat
          label="Operações ativas"
          value={data.organizations.filter((o) => o.status === 'Ativa').length}
          note="Organizações com situação ativa"
          icon={Users}
        />
        <Stat
          label="Assinaturas ativas"
          value={data.subscriptions.filter((s) => s.status === 'Ativa').length}
          note="Estados simulados, sem cobrança"
          icon={CreditCard}
        />
        <Stat
          label="Planos disponíveis"
          value={data.plans.length}
          note="Oferta ilustrativa, sem preços"
          icon={Layers}
        />
      </div>
      <div className="two-columns">
        <Panel
          title="Organizações por plano"
          description="Distribuição atual do conjunto demonstrativo"
        >
          <TrendChart kind="bar" data={points} label="Organizações" />
        </Panel>
        <Panel
          title="Operação com clareza"
          description="Mudanças explícitas, sem movimentação financeira"
        >
          <div className="panel-body">
            <p className="form-help">
              Altere um plano ou uma situação no módulo de organizações. A assinatura demonstrativa
              acompanha essa situação e os indicadores são recalculados.
            </p>
            <div className="mt-6">
              <TextLink href="/admin/organizacoes">Gerenciar organizações</TextLink>
            </div>
            <div>
              <TextLink href="/admin/assinaturas">Consultar assinaturas</TextLink>
            </div>
            <p className="form-help mt-6">
              Não há MRR ou faturamento fictício nesta versão. Pagamentos e conciliação serão
              integrações futuras.
            </p>
          </div>
        </Panel>
      </div>
      <Panel
        title="Organizações em acompanhamento"
        description="Visão resumida da operação"
        action={<TextLink href="/admin/organizacoes">Ver todas</TextLink>}
        className="section-gap"
      >
        <TableRegion label="Resumo de organizações">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Organização</th>
                <th scope="col">Plano</th>
                <th scope="col">Situação</th>
                <th scope="col" className="mobile-hide">
                  Desde
                </th>
              </tr>
            </thead>
            <tbody>
              {data.organizations.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td>{data.plans.find((p) => p.id === o.planId)?.name}</td>
                  <td>
                    <Status value={o.status} />
                  </td>
                  <td className="mobile-hide">{formatDate(o.since)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableRegion>
      </Panel>
    </>
  );
}
