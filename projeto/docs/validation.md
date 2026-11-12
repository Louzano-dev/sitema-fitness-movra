# Validação local · MOVRA v0.2

Este relatório registra a versão Next.js. A entrega atual também possui [um HTML único portátil](portable.md), que funciona sem servidor. O HTML de apresentação mencionado abaixo está preservado em `reference/index.presentation.html`.

Executada em 12/11/2026, Windows, Node.js 26.13.0, Next.js 16.4.6 e React 19.3.1. Aplicação local com adaptador mock; sem implantação externa.

## Resultados

| Verificação | Resultado |
| --- | --- |
| `npm run build` | PASS · compilação e geração das rotas de produção |
| `npm run typecheck` | PASS · sem erros TypeScript |
| `npm run lint` | PASS · sem erros ou avisos |
| `npm test` | PASS · 14 testes unitários |
| `npm run test:e2e` | PASS · 32 testes em Chrome, 41,1 s na rodada final |
| Prettier check | PASS · fontes, estilos, testes e configurações verificados |
| npm audit | 0 vulnerabilidades reportadas após o override de ferramenta de desenvolvimento |
| npm audit --omit=dev | 0 vulnerabilidades reportadas |
| Preservação do HTML | PASS · SHA-256 idêntico ao arquivo original |
| Inicialização em desenvolvimento | PASS · `npm run dev`, HTTP 200 em `/personal`, `/aluno` e `/admin` |
| Links da documentação atual | PASS · 6 referências locais verificadas |

SHA-256 do HTML de apresentação preservado em reference/index.presentation.html: `7F720A533387AA7256EC0AA8E969FA8717051069844741A51AA02CF6CDE6E1D9`.

## Cobertura funcional executada

- 20 rotas principais abriram com HTTP 200, título visível e sem exceções de página.
- Criar treino, adicionar/reordenar/remover exercícios, atribuir a Ana, executar séries com carga decimal, concluir, revisar histórico e consultar o registro no perfil do personal.
- Criar, buscar e editar aluno; estado vazio sem resultados.
- Rejeitar conflito de agenda, criar encontro e cancelar com confirmação.
- Alterar organização e conferir plano/situação na assinatura correspondente.
- Registrar avaliação no personal e conferir o mesmo valor no ambiente do aluno.
- Editar perfil do aluno e conferir a ficha no personal, incluindo interação rápida após a carga inicial.
- Editar plano, conferir organização vinculada, filtrar exercícios e abrir instruções.
- Responsividade: 320, 390, 768, 1024 e 1440 px em cinco telas representativas, sem transbordamento horizontal do documento. Tabelas podem rolar dentro de sua região.
- Menu móvel com abrir/fechar, Escape, retorno de foco e navegação; axe também executado com o menu aberto.
- axe com tags WCAG 2 A/AA, 2.1 AA e 2.2 AA em seis telas e no formulário de aluno: nenhuma violação detectada nas verificações executadas.
- Movimento reduzido na execução do treino mantém controles e progresso utilizáveis.

Os 14 testes unitários verificam validação, duplicatas, referências, intervalos adjacentes/conflitantes, cancelamento, passagem de meia-noite, conclusão de séries, histórico imutável, sincronização de perfis, avaliações, assinaturas, notificações de estado e independência de instâncias.

## Revisão e correções

Corrigidos: regra global que sobrescrevia a cor de links-botão; texto acessível oculto de tabela que causava overflow; identificador de ambiente duplicado entre menus; inicialização de campos de perfil durante hidratação; warnings de lint. O perfil usa campos controlados e os valores iniciais do editor são renderizados no HTML.

Capturas em `test-results/visual-*.png`: personal desktop/mobile, aluno mobile e administração desktop. Foram geradas para revisão visual; não são testes de regressão por comparação de pixels.

Scan de padrões em `src` não encontrou HTML arbitrário, eval, localStorage ou os padrões de segredos pesquisados. É uma revisão limitada do código local, não uma auditoria de segurança de produção. Não há histórico Git neste diretório para revisão de diff/histórico.

## Limites da validação

Não foi medida cobertura percentual. Não foram executados testes manuais com NVDA/VoiceOver, dispositivos físicos, Safari/Firefox, carga ou integrações externas. axe sem violações não certifica conformidade integral WCAG.

Persistência, autenticação, RLS/RBAC, isolamento multi-tenant, storage, auditoria e privacidade para produção continuam pendentes. Pagamentos e IA foram mantidos fora do escopo. Nenhuma verificação de produção é aplicável a esta entrega local.

Skills aplicadas seletivamente: React Patterns, GSAP React, Security Review e Verification Loop, além da reutilização das decisões documentadas do design system. Não foram executados agentes paralelos ou instaladas novas skills.
