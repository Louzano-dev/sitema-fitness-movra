# MOVRA · arquitetura do frontend

## Etapa A — inspeção e decisões

12/11/2026: projeto de origem com index.html independente, ativos SVG, tokens e documentação. Sem package.json, backend, banco ou aplicação React. O HTML original será mantido intacto na raiz, como referência executável.

Aplicação Next.js App Router em `src/app`; layouts próprios em `/personal`, `/aluno` e `/admin`. `/` apresenta os ambientes e seus limites. Componentes de UI em `components/ui` seguem shadcn/ui/Radix; composições de domínio em `features`; entidades e validações em `domain`; contrato substituível em `services` e fixtures em `services/mock`.

Um provider de demonstração mantém dados compartilhados entre rotas. O adaptador mock opera exclusivamente no navegador; não é API nem barreira de autorização. Recarregar reinicia os dados. Alterações em treinos, sessões, agenda e perfis devem refletir em todas as telas relacionadas durante a sessão.

Identidade: verde #172C29, lima #C9F078, canvas #F3F3E9, texto #101816 e secundário #53675E. Dashboard editorial, navegação lateral escura e lista de tarefas em destaque; aluno com navegação inferior mobile; administração com tabelas densas. Tokens da documentação mapeados para CSS/Tailwind e primitives shadcn/ui.

Recharts com tabela equivalente e período explícito. GSAP limitado à atualização visual do progresso do treino; escopo local, cleanup e respeito a movimento reduzido. Sem animação que esconda conteúdo ou atrase navegação.

## Contrato futuro

O repositório recebe escopo de organização e aluno explicitamente. Isso organiza a migração, mas não garante isolamento: uma versão Supabase deverá validar sessão, membership e RBAC no servidor e aplicar RLS no banco/storage. Nenhuma chave, credencial ou acesso privilegiado será criado no frontend. Não há login, pagamentos ou IA nesta entrega.

O snapshot global do adaptador atual existe somente para compartilhar fixtures entre ambientes. Não deve ser reutilizado como endpoint que devolve todos os tenants. O adaptador real precisará carregar apenas o cache autorizado pelo servidor, explicitar o escopo em consultas e mutações e acrescentar políticas de tenant às entidades vinculadas ao aluno. As validações locais atuais são regras de consistência e não autorização.

## Etapas B–E

- B: base, tokens, componentes, layouts e rotas reais.
- C: dashboard, alunos/detalhe, treinos/editor, exercícios, evolução, agenda e configurações do personal.
- D: início, treino ativo, histórico, evolução e perfil do aluno; organizações, planos, assinaturas e indicadores do admin.
- E: build, TypeScript, lint, testes das regras e dos fluxos principais, responsividade e acessibilidade. Registrar resultados executados, sem inferir segurança ou prontidão de produção.

Referências oficiais consultadas: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [shadcn/ui](https://ui.shadcn.com/docs/installation/next), [GSAP React](https://gsap.com/resources/React/).
