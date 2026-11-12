# MOVRA · index.html portátil

Abra `index.html` com dois cliques. Esse é o arquivo completo para uso: não exige servidor, npm, outros arquivos ou internet. Pode ser copiado isoladamente para outra pasta ou computador com navegador moderno e JavaScript habilitado.

O HTML inclui React, os componentes de personal/aluno/administração, validações, dados mockados, Recharts, GSAP, estilos Tailwind, vídeo MP4, poster e fontes Inter/Space Grotesk em data URLs. Não há CDN, import de módulos externo ou busca de dados em runtime. A navegação interna usa `#/entrar`, `#/personal`, `#/aluno` e `#/admin`, incluindo detalhes e editor de treinos.

Os dados são demonstrativos e permanecem apenas em memória. Reabrir/recarregar restaura os exemplos. Não há autenticação, pagamentos, IA ou persistência em servidor.

## Preservação e manutenção

- O HTML anterior foi arquivado, sem alteração, em `reference/index.presentation.html`.
- A aplicação Next.js e os componentes em `src` foram preservados.
- `standalone/main.tsx` reúne as rotas no navegador e `standalone/router.tsx` adapta a navegação para arquivo local.
- `scripts/build-portable.mjs` compila os componentes existentes, processa os estilos e embute todos os recursos em `index.html`.
- Para manutenção do código, `npm run build:portable` regenera o arquivo. Esse comando não é necessário para abrir o HTML já gerado.

## Validação executada em 12/11/2026

20 testes Playwright da suíte atual `tests/cinema` passaram em Chrome, com a rede desativada, sobre uma cópia de `index.html` em uma pasta temporária contendo somente esse arquivo. Nenhum servidor foi usado pelos testes portáteis.

Verificados: navegação dos três ambientes, identidade dinâmica, limpeza ao sair, troca de perfil, guardas de navegação, criação e duplicação de treino com prévia/carga/modelo/busca, execução e histórico, descanso e avanço de exercício, vídeo real e pausa, falha de mídia, autoplay bloqueado, economia de dados e movimento reduzido. Auditoria axe em todas as páginas principais dos três ambientes e na execução do treino. Responsividade em 360/768/1280/1920 px.

Também passaram TypeScript e lint. Capturas atuais em `docs/evidence/`; observações de layout e ausência de requisições HTTP em `docs/evidence/layout-observations.json`. Tamanho gerado: aproximadamente 6,95 MiB, incluindo o vídeo. O arquivo único transfere todos os bytes ao ser aberto, mesmo quando o poster é usado; a versão Next.js permite carregamento separado da mídia.

Esses testes não certificam compatibilidade com todos os navegadores ou uma auditoria integral de acessibilidade. Os limites de dados e segurança do protótipo continuam explícitos na interface.
