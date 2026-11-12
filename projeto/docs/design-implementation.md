# Design system aplicado · MOVRA 2.0

A identidade da primeira etapa foi preservada. Esta versão aplica o sistema a uma aplicação, com páginas e densidades diferentes para personal, aluno e operação.

## Fonte dos valores e componentes

- `design/design-tokens.json`: referência de marca; `design/tokens.css`: variáveis importadas em `src/app/globals.css`.
- O tema Tailwind v4 mapeia primary, secondary, background, foreground, border, ring e status aos tokens MOVRA. Superfícies e componentes compartilhados usam o mesmo vocabulário.
- `components/ui`: Button, Input, Textarea, Badge, Dialog e Label gerados pelo registro oficial shadcn/ui, com correção do import utilitário, alvo de botão e tradução de fechar. Composição Radix para foco e diálogos.
- `components/shared`: títulos, painéis, indicadores, avatar, situação, campos, feedback, vazio e regiões de tabela.
- Fontes Inter e Space Grotesk servidas localmente via pacotes Fontsource; não há Google Fonts em runtime.

## Hierarquia aplicada

Títulos de página entre 27–36 px, seções de 18 px, corpo de interface 14 px e metadados de 11–12 px. Essa densidade ajusta a proposta editorial inicial ao trabalho diário em tabelas. Campos de execução do aluno mantêm 16 px em celular. Nenhuma informação depende exclusivamente de cor.

Navegação persistente verde, conteúdo off-white e superfícies brancas; lima identifica a página ativa e ações no contexto escuro. Indicadores em faixa com divisores, agenda em linhas e gráficos com tabela equivalente evitam uma grade uniforme de cards.

## Estados e comportamento

Formulários usam validação nativa/Zod, mensagens de erro e confirmação explícita de atualização local. Estados vazios para filtros sem resultado, aluno sem treino ou avaliação e agenda livre. App Router fornece estados de carregamento, erro e rota desconhecida. Mutações têm estado ocupado e desabilitam envio enquanto pendentes.

Trocar ambiente encerra a sessão local e retorna à seleção na entrada. Não concede acesso nem autentica. Cabeçalho e rodapé identificam dados fictícios e memória temporária. A identidade é dinâmica; o menu de conta está na lateral e no avatar do cabeçalho.

## Responsividade e acessibilidade

Menu lateral vira diálogo abaixo de 1000 px. O aluno ganha navegação inferior nessa faixa. Grids empilham em 760/480 px; tabelas largas rolam dentro de região identificada e focável. Região de tabela posicionada para conter textos acessíveis ocultos, evitando transbordamento do documento.

Foco visível, link de pular navegação, labels, títulos, descrições de diálogo, botões de reordenação e retorno de foco. Gráficos Recharts com dados em tabela, sem interpolar valores. O descanso usa tempo decorrido e não anuncia cada segundo. O próximo exercício recebe foco e o progresso anuncia a contagem de séries.

## Motion system

`src/components/motion.tsx` define os padrões GSAP e `PageMotion`, usados na navegação. `globals.css` define os equivalentes CSS: 120 ms para resposta curta, 180 ms para feedback, 240 ms para superfícies e 500 ms para entrada editorial. Curva GSAP `power2.out`; CSS `cubic-bezier(.2,.7,.2,1)`. Distâncias: 8 px em páginas e campos; até 24 px em títulos. Botões, modais, foco, série concluída e progresso compartilham estes padrões; loading/sucesso/erro permanecem textuais e legíveis.

Na entrada: timeline de 0,8 s na cena e stagger curto nos títulos/campos. Nenhum campo espera uma animação para funcionar. Revelação vertical dos indicadores e gráfico por ScrollTrigger; um pin/scrub curto somente no capítulo de criação em desktop; parallax na cena e no motivo circular. Sem interceptar wheel/touch. `useGSAP`, escopo e `matchMedia().revert()` desfazem triggers/estilos ao trocar rota ou preferência.

Movimento reduzido mantém leitura linear, elimina autoplay/pin/parallax/entradas e mostra poster. O vídeo pausa fora da tela ou com aba oculta e respeita pausa manual e bloqueio de autoplay. O formulário tem camada independente, com contraste sólido por trás da translucidez.

No editor, a carga prescrita é diferente do último registro executado. Busca/grupo filtram a biblioteca; modelos copiam os campos; a prévia validada precede atribuição local. No aluno, a carga começa na prescrição e o último registro aparece com data, sem substituir silenciosamente o valor.

## Revisão

Durante os testes foram corrigidos contraste de links com aparência de botão, transbordamento a 320 px e um identificador duplicado entre menus desktop/mobile. Validações automatizadas e inspeção visual ajudam a verificar a implementação, mas não substituem auditoria completa com leitores de tela e usuários.
