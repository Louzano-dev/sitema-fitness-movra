# Handoff · próxima etapa condicionada à aprovação

## Limites desta entrega

Foram definidos identidade, tokens, componentes, estados e direções de experiência. Não foram criados aplicação Next.js, dependências, banco, login, cobrança, persistência ou IA. O SVG é uma prancha de identidade estática, não um frontend.

## Sequência proposta

1. Aprovar esta direção ou registrar ajustes específicos.
2. Criar base Next.js + TypeScript + Tailwind + shadcn/ui; integrar tokens, fontes e shell responsivo. Verificar versões e compatibilidade na documentação oficial quando iniciar a instalação; não fixar versões por memória.
3. Construir landing e primeiro fluxo completo do personal: localizar aluno, editar treino e revisar atualização local.
4. Conectar experiência do aluno aos mesmos dados fictícios: executar séries e revisar resumo.
5. Construir administração demonstrativa e adicionar gráficos Recharts e motion GSAP somente onde a tarefa justificar.
6. Revisar os fluxos, corrigir problemas e executar lint, TypeScript, build e verificações de interação/acessibilidade. Entregas incrementais, sem integrações reais nesta fase.

## Organização sugerida do protótipo

App Router com grupos para marketing, personal, aluno e admin. Componentes de UI compartilhados separados de componentes de domínio. Fixtures tipadas em módulo próprio; acesso a elas por uma interface de repositório e implementação mock. Estado de sessão em memória compartilhado entre os ambientes demonstrativos, reiniciado ao recarregar.

Entidades previstas: Organization, Membership, Student, Exercise, WorkoutTemplate, WorkoutAssignment, WorkoutSession, SetLog, Appointment, Plan, Subscription e AuditEvent. Identificadores de organização acompanham as entidades que pertencem a um tenant. Usar alunos e dados inteiramente fictícios.

Separar prescrição (template/assignment) de execução (session/set log), incluindo versão da prescrição na atribuição. Alterar um modelo não pode reescrever histórico de execução. Exercícios de catálogo global e personalizados exigem escopo explicitamente distinto.

## Fronteiras para a arquitetura futura

Decisões de preparação, não integrações implementadas nem afirmação de conformidade legal.

| Área | Restrição de arquitetura |
| --- | --- |
| Supabase Auth | Identidade validada no servidor; mudar visualização no protótipo não equivale a login |
| PostgreSQL / multi-tenancy | `organization_id` e vínculos de membership; impedir referências entre tenants com chaves e constraints apropriadas |
| RLS / RBAC | Negar por padrão; verificar membership e papel por operação; testar isolamento direto na API e no banco |
| Papéis | Personal opera alunos autorizados; aluno vê suas atribuições/registros; SaaS admin gerencia operação com privilégios explícitos e auditados |
| Storage | Buckets privados, validação de tamanho/tipo e URLs temporárias; escopo de tenant também nas políticas de objetos |
| Mercado Pago | Segredos no servidor, validar autenticidade de webhook, idempotência e reconciliação; retorno do navegador não confirma pagamento |
| Auditoria | Ator, tenant, ação, entidade, horário e resultado; acesso restrito, integridade e política de retenção definida |
| LGPD | Mapear dados/finalidades, acesso, retenção, exportação/exclusão e tratamento dos dados potencialmente sensíveis antes de produção; revisão jurídica específica em etapa própria |
| Testes | Isolamento entre tenants e papéis, transições de assinatura e fluxos críticos; frontend não é barreira de autorização |

Chaves privilegiadas nunca devem entrar no bundle do navegador. Não usar localStorage como futura fonte de identidade ou autorização. Dados pessoais e detalhes sensíveis não devem ser copiados indiscriminadamente para logs.

## Critérios de aceite do protótipo futuro

- Rotas e destinos claros nos quatro contextos; demonstração identificada em todos os ambientes.
- Fluxo personal → prescrição → execução do aluno → resumo com estado local coerente.
- Busca/filtro, edição, validação, vazio, erro e feedback acessíveis nas telas em que se aplicam.
- Mudanças administrativas apenas simuladas e rotuladas; nenhuma cobrança ou autenticação sugerida como real.
- Layout validado a 320, 390, 768, 1024 e 1440 px; teclado, foco, zoom e movimento reduzido revisados.
- Lint, checagem TypeScript e build passam. Testes de fluxo cobrem comportamentos relevantes, sem criar testes que apenas repetem os tokens.

## Aprovação

Decisor: solicitante do projeto. **Pendente.** A aprovação solicitada é da direção criativa e do design system para iniciar a interface. Não implica validação de marca, oferta comercial, publicação ou contratação de serviços.
