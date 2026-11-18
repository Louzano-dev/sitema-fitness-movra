# MOVRA · refinamento de interação

Revisão da sequência temporal do vídeo de referência já extraída em `evidence-motion/reference-detail.jpg`: a diferença relevante é a continuidade entre componentes e detalhes, além da troca de telas. A implementação mantém cores, conteúdo fitness, sidebar, indicador, temas, dados e regras existentes.

## Continuidade espacial

`components/shared-surface.ts` implementa snapshots visuais inertes, fora da árvore acessível, com geometria inicial do componente e destino real após o commit. GSAP Flip ajusta posição/escala em 280 ms, com dissolução nos últimos 140 ms. Não clona formulários interativos para uso: os controles reais permanecem no destino, com foco e estado preservados.

Relações implementadas e verificadas:

- Linha de aluno → cabeçalho do perfil.
- Card de treino → cabeçalho do editor da ficha.
- Card de exercício → diálogo de instruções.
- Item/refeição → editor de alimento do Fuel.

As transições de rota com superfície compartilhada não usam View Transitions simultaneamente, e a entrada GSAP geral é suprimida durante a transformação. Rotas comuns mantêm o sistema anterior. A superfície possui prazo máximo de 800 ms, cancelamento ao iniciar outra, observer desconectado após encontrar o destino e remoção no fim. A desmontagem do layout portátil durante uma rota não cancela prematuramente a continuidade visual.

Movimento reduzido abre o destino diretamente. Recursos de negócio, navegação, editores e cálculos funcionam sem View Transitions; a transformação compartilhada usa GSAP. Não há transição geométrica de retorno implementada ao fechar cada diálogo; foco e fechamento seguem Radix.

## Dashboard

Composição em áreas: acompanhamento do dia e próximo encontro, indicadores agrupados em uma superfície, gráfico dominante com contagem do período e agenda lateral. Presença no período, carteira/atenção e alimentação individual aparecem em níveis posteriores. Não foram adicionados números decorativos: horários, pessoas, contagens e gráfico usam os registros existentes.

No celular as áreas se tornam uma sequência própria, com encontro próximo e indicadores antes do gráfico. Sidebar e navegação inferior permanecem. Capturas em `evidence-interactions/dashboard-{390,768,1280,1920}.png`.

## Componentes

- Studio: Flip na alteração de ordem, entrada de novos exercícios e saída breve do exercício removido. Cópias de saída são inertes e limpas ao desmontar. Captura acontece somente ao mudar IDs/ordem, não em cada tecla dos parâmetros.
- Fuel: valores visuais interpolam entre o valor anterior e o atual por 220 ms; leitura acessível recebe o valor final exato. Não se alteram os cálculos, dados salvos ou exportação. Valores desconhecidos continuam desconhecidos. Montagem inicial e movimento reduzido não contam a partir de zero.
- Cardio: relógio com anel de tempo realizado em relação ao planejado, etapas concluídas/atual/próximas e janela de até 12 etapas. Animações são exclusivamente de apresentação; `performance.now()` e registros continuam calculando duração independentemente de GSAP/frames.

Privacidade alimentar preservada: o Personal continua tendo somente seu diário próprio; não consulta alimentação de alunos. Estimativas continuam sempre visíveis ao dono do diário.

## Validação

Os três testes novos de navegador passaram no HTML isolado offline: observam frames das superfícies e exigem mudança real de geometria, verificam limpeza das cópias, abrem os quatro destinos, editam quantidades (150 g de arroz → 195 kcal; 200 g → 260 kcal), testam o filtro real do dashboard e quatro larguras sem overflow. Axe não encontrou violações no dashboard auditado; não certifica acessibilidade integral.

Build, tipagem, lint e 53 testes unitários aprovados. **43 cenários passaram na regressão completa offline**, em 7,2 minutos, incluindo Studio, atribuição/execução, cardio, agenda, Fuel privado, temas, sidebar e novos testes geométricos. Três testes de interação foram também revalidados no artefato final, incluindo a ficha/editor. Chrome desktop/headless, arquivo copiado isoladamente e rede desligada; a suíte E2E Next.js não foi repetida nesta etapa.

A primeira verificação geométrica revelou que desmontar o layout portátil removia a superfície antes de chegar ao destino. A correção manteve o ciclo de vida da superfície no controlador, com prazo/cleanup próprios. A repetição confirmou transformação, não apenas abertura do detalhe.

Não houve alteração dos motores de treino/nutrição, backend, login, landing ou mídia. A entrega segue em `index.html`, sem servidor. Resultado e hash em `evidence-interactions/verification.json`.

Limites: Chrome desktop/headless com viewports móveis; faltam aparelhos físicos, Safari/Firefox e avaliação manual com leitores de tela. Nenhuma garantia universal de FPS ou memória é afirmada. O novo dashboard e os diálogos foram inspecionados em capturas reais do navegador.
