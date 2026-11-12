# MOVRA · entrega frontend 2.0

## Uso e preservação

Abra `../../index.html` diretamente no navegador. Continua independente de servidor, internet e npm, inclusive quando copiado sozinho para outra pasta. Na raiz permanecem somente `index.html` e `projeto/`. Fontes React/Next.js, componentes, mock, design e ferramentas permanecem em `projeto/`; a exportação usa esses mesmos componentes. A referência histórica foi preservada.

## Implementado

- Entrada em camadas: cinematografia, iluminação, texto, formulário e controles independentes. Inter/Space Grotesk locais, paleta MOVRA e layout específico para celular. O botão de entrada aparece no primeiro viewport em 360 × 900; a página continua rolável para opções secundárias.
- Vídeo real fornecido: `public/media/movra-hero.mp4`, H.264, 1280 × 720, 24 fps, cerca de 14 s, sem áudio e com faststart. Cópia otimizada de 7.356.228 para 2.726.714 bytes (aproximadamente 63% menor). Original em Downloads intocado. Poster WebP de 40.134 bytes extraído aos 5 s do próprio vídeo.
- Muted/loop/playsInline, controle de pausa/retomada, poster em falha e autoplay bloqueado. Pausa fora da tela/aba; preferência de pausa manual preservada. Critério de visibilidade usa área real, evitando o caso de borda do IntersectionObserver. Economia de dados, conexão lenta e movimento reduzido mantêm poster.
- Timeline GSAP curta na abertura; sete capítulos com painel real, criação, aluno, evolução, conexão e encerramento. Um pin curto em desktop, scrub/parallax controlados e limpeza de triggers. Sem scroll-jacking. Ações da narrativa abrem fluxos reais da demonstração.
- Nome/e-mail fictícios dinâmicos, escolha Personal/Aluno, menu de conta na lateral e cabeçalho, sair, trocar perfil e reset completo dos mocks. Rotas sem sessão retornam à entrada. Administração separada da escolha principal.
- Recuperação/cadastro locais, identificados como protótipo. Nenhum e-mail é enviado ou conta criada. Senha exibida é uma amostra constante, não editável; mostrar/ocultar funciona sem receber credenciais reais.
- Personal: indicador de alunos ativos com registro no período (denominador explícito), atalhos e módulos preservados. Editor com busca/grupo muscular, séries/repetições/carga/descanso, reordenação, reutilização de modelos, prévia validada, atribuição local e duplicação. Histórico concluído permanece preservado.
- Aluno: carga inicial da prescrição, último registro com data, marcação de séries, progresso, descanso prescrito com pausa/pular, foco no próximo exercício, conclusão e histórico. Navegação inferior e campos adequados ao celular.
- Motion system em `src/components/motion.tsx`/CSS; documentação em `design-implementation.md`. Foco, erros/sucesso textuais, dados de gráficos em tabela e redução de movimento.

## Validação

- Build Next.js de produção, TypeScript e ESLint sem erros.
- 15 testes Vitest: consistência do mock, validações, carga prescrita, histórico, conflitos de agenda, sincronização e reset.
- 20 testes Playwright no HTML copiado isoladamente e com rede desligada; 20 no build de produção. Cobrem três ambientes, entrada/saída/troca, dados dinâmicos, editor completo, registro/histórico, descanso, foco, falha de mídia, bloqueio de autoplay, vídeo fora da tela e cleanup.
- Axe nas páginas principais dos três ambientes, entrada e execução do treino, sem violações automatizadas nas regras WCAG 2.x A/AA selecionadas. Inclui teclado/foco, labels, contraste e diálogos nos fluxos testados.
- Larguras 360, 768, 1280 e 1920 × 900. Capturas reais de entrada, criação e treino em `evidence/`; `layout-observations.json` registra zero overflow do documento, zero exceções e zero requisições HTTP na revisão do HTML. Desktop tem um pin; mobile/tablet têm zero.
- Revisão visual das capturas; estado vazio com limpar filtros e perfil com dados parciais. O checker da skill verifica a integridade do registro de evidências, sem certificar qualidade visual ou conformidade WCAG.
- Amostra de rolagem no Chrome headless offline em 1280 × 900: 179 intervalos de quadro, mediana 6,9 ms, p95 7,2 ms, nenhum intervalo acima de 50 ms e nenhum long task observado na amostra. Três ciclos entrar/sair mantiveram um vídeo/um pin na entrada e zero nos painéis. Resultados em `evidence/motion-observations.json`; medição indicativa, sem garantia de FPS em aparelhos reais.
- Correções encontradas nos testes: camada que interceptava a pausa, pausa no limite visível do vídeo e espaçamento/tipografia da entrada em telas menores.

Comandos: `npm.cmd run build`, `typecheck`, `lint`, `test`, `test:e2e`, `test:portable`; capturas com `node scripts/review-experience.mjs` e amostra de motion com `node scripts/measure-motion.mjs`. Os comandos são ferramentas de manutenção/verificação, não requisitos para abrir o HTML. Suítes históricas `tests/e2e` e `tests/portable` foram preservadas; os comandos atuais usam `tests/cinema`.

## Limites e pendências reais

Tudo referente a contas, alunos, agenda, planos, assinaturas, prescrição e histórico continua fictício e em memória. Sair/trocar perfil/recarregar restaura os exemplos. Guardas de rota são comportamento de navegação, sem segurança ou autorização de produção. Não há backend, Supabase, autenticação real, envio de e-mail, cobrança ou IA.

O HTML único tem cerca de 6,95 MiB e contém todo o vídeo; abrir o arquivo lê esse conteúdo mesmo quando a preferência é por poster. A versão Next.js mantém MP4 separado e usa carregamento nativo. Não foi medida autonomia de bateria nem garantido 60 fps em qualquer aparelho.

Ainda requer validação em dispositivos físicos, Safari/Firefox, leitores de tela e entrevistas com personal/alunos. Axe e automação não constituem certificação WCAG integral. Backend, persistência e autorização real ficam para a fase futura explicitamente solicitada pelo usuário.

## Arquivos de implementação alterados/adicionados

- Distribuição: `../../index.html`.
- Entrada/mídia: `src/features/login.tsx`, `login-media.ts`; `public/media/movra-hero.mp4`, `movra-hero-poster.webp` e frames de revisão JPG.
- Estrutura/motion: `src/components/app-shell.tsx`, `demo-session.tsx`, `motion.tsx`, `src/app/globals.css`.
- Produto: `src/features/personal/dashboard.tsx`, `workout-editor.tsx`, `workouts.tsx`, `src/features/student/workout-session.tsx`.
- Tipos/validação: `src/domain/types.ts`, `schemas.ts`.
- Ferramentas: `scripts/prepare-media.mjs`, `build-portable.mjs`, `review-experience.mjs`, `measure-motion.mjs`, `package.json`, `package-lock.json`.
- Verificação: `tests/cinema/app.spec.ts`, `tests/unit/repository.test.ts`, `playwright.config.ts`, `playwright.portable.config.ts`.
- Documentação: `README.md`, `docs/experience-2-plan.md`, este arquivo, `design-implementation.md`, `portable.md`, nota histórica em `cinematic-release.md`, capturas e observações em `docs/evidence/`.
