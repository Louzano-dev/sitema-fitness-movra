# Design system aplicado · MOVRA 3.0

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

Trocar ambiente retorna à seleção na entrada e preserva os registros locais. Sair encerra a visualização; redefinir os exemplos exige confirmação em Configurações/Meu perfil. Não concede acesso nem autentica. A entrada possui seleção de perfil, identidade do aluno e nome opcional; nenhum campo de senha/e-mail ou ação de criar/recuperar conta. O cabeçalho identifica dados fictícios e o estado do armazenamento. A identidade é dinâmica; o menu de perfil está na lateral e no avatar do cabeçalho.

Studio e Fuel usam os mesmos tokens e componentes, com superfícies verdes para orientação e brancas para edição. O questionário mantém uma etapa por vez; o editor separa dias, parâmetros e revisão. A seleção alimentar no celular dá lugar à quantidade após escolher o alimento; origem e favoritos ficam em um disclosure, sem esconder o botão de salvar. A lateral permite rolagem em telas baixas. A navegação inferior do aluno tem cinco destinos; agenda e histórico continuam acessíveis pelo menu.

Dados de nutrição não são metas: números opcionais, sem cores de julgamento, estimativas parciais explícitas e modo descritivo para menores. Compartilhamento é um controle independente. Interações frequentes não reiniciam animação/foco de página; `PageMotion` interno usa `focusPage={false}`. A navegação real continua levando foco ao título.

## Responsividade e acessibilidade

Menu lateral vira diálogo abaixo de 1000 px. O aluno ganha navegação inferior nessa faixa. Grids empilham em 760/480 px; tabelas largas rolam dentro de região identificada e focável. Região de tabela posicionada para conter textos acessíveis ocultos, evitando transbordamento do documento.

Foco visível, link de pular navegação, labels, títulos, descrições de diálogo, botões de reordenação e retorno de foco. Gráficos Recharts com dados em tabela, sem interpolar valores. O descanso usa tempo decorrido e não anuncia cada segundo. O próximo exercício recebe foco e o progresso anuncia a contagem de séries.

## Motion system

`src/components/motion.tsx` define os padrões GSAP e `PageMotion`, usados na navegação. `globals.css` define os equivalentes CSS: 120 ms para resposta curta, 180 ms para feedback, 240 ms para superfícies e 500 ms para entrada editorial. Curva GSAP `power2.out`; CSS `cubic-bezier(.2,.7,.2,1)`. Distâncias: 8 px em páginas e campos; até 24 px em títulos. Botões, modais, foco, série concluída e progresso compartilham estes padrões; loading/sucesso/erro permanecem textuais e legíveis.

Na entrada: timeline de 0,8 s na cena e stagger curto nos títulos/campos. Nenhum campo espera uma animação para funcionar. Revelação vertical dos indicadores e gráfico por ScrollTrigger; um pin/scrub curto somente no capítulo de criação em desktop; parallax na cena e no motivo circular. Sem interceptar wheel/touch. `useGSAP`, escopo e `matchMedia().revert()` desfazem triggers/estilos ao trocar rota ou preferência.

Movimento reduzido mantém leitura linear, elimina autoplay/pin/parallax/entradas e mostra poster. O vídeo pausa fora da tela ou com aba oculta e respeita pausa manual e bloqueio de autoplay. O formulário tem camada independente, com contraste sólido por trás da translucidez.

No editor, a carga prescrita é diferente do último registro executado. Busca/grupo filtram a biblioteca; modelos copiam os campos; a prévia validada precede atribuição local. No aluno, a carga começa na prescrição e o último registro aparece com data. A repetição da primeira série preenche somente as próximas séries em aberto. Editar uma série concluída pede nova confirmação. Valores inválidos impedem marcar a série.

O cronômetro e progresso ficam em superfície verde profunda, com números lima e controles persistentes acima das séries no celular. Pausar preserva o tempo restante; +15 s ajusta sem reiniciar; pular encerra. A marcação, os campos inválidos e a contagem acompanham texto e semântica, além da cor. Os inputs reservam margem para evitar foco encoberto pelo cronômetro e navegação inferior.

Gráficos recebem uma revelação de opacity/translate, no viewport ou ao mudar dados, com `useGSAP` e cleanup. Valores e tabelas não são interpolados. A entrada de páginas move 8 px e transfere foco para o título; modais usam opacity/scale sem disputar a translação de posicionamento. O drawer zera as classes de translação central do diálogo, incluindo na exportação portátil.

## Revisão

Durante os testes foram corrigidos contraste de links com aparência de botão, transbordamento a 320 px e um identificador duplicado entre menus desktop/mobile. Validações automatizadas e inspeção visual ajudam a verificar a implementação, mas não substituem auditoria completa com leitores de tela e usuários.
