# Como o MOVRA Studio monta e entrega uma semana de treino

## O defeito reproduzido

No código-fonte de `generateProgram`, a regra `movra-rules/1.0` filtrava a divisão A/B/C por padrão de movimento, criava uma lista de padrões únicos e escolhia o primeiro exercício de cada padrão. No fim, dividia os minutos restantes por oito e aplicava um limite entre um e cinco exercícios. No teste com adulto intermediário, disponibilidade de 60 minutos e todos os equipamentos, isso gerou **1, 1 e 4 exercícios**. A combinação dos filtros eliminava alternativas mesmo quando ainda havia tempo. Intermediários e avançados também compartilhavam praticamente a mesma prescrição.

## O que orienta a proposta

O motor `movra-rules/2.0` está em [training-engine.ts](../src/domain/training-engine.ts) e [training-plan.ts](../src/domain/training-plan.ts). O questionário e o contexto local alimentam funções determinísticas. O personal pode reproduzir a saída usando os mesmos dados e a mesma variação.

- A semana segue a ordem dos dias selecionados. Corpo inteiro alterna a sequência e as variantes. A/B para iniciantes alterna corpo inteiro. Superior/inferior alterna segmentos. A/B/C e Push/Pull/Legs distribuem empurrar, puxar e inferiores. Na divisão personalizada, o personal escolhe o foco de cada dia.
- A seleção automática usa 62 movimentos do catálogo com papel e dificuldade definidos. Primeiro filtra equipamentos exigidos, exclusões, padrões evitados e experiência. Depois classifica candidatos considerando variação semanal, treino em dias consecutivos, preferências e exercícios já registrados pelo próprio aluno. A biblioteca manual oferece 319 exercícios de base, além dos cadastros do personal.
- O nível interfere na complexidade disponível, nas séries, nas faixas de repetições e no descanso. Os principais e os acessórios recebem parâmetros diferentes. Há campos opcionais para carga, RIR e RPE. O histórico orienta familiaridade com exercícios. Decisões de progressão de carga, fadiga e organização de blocos ficam a cargo do profissional.
- A estimativa de musculação soma 150 segundos iniciais, 75 segundos por movimento, três segundos por repetição usando o máximo indicado e o descanso entre séries do mesmo movimento. O cardio soma a duração contínua ou seus blocos, repetições e ciclos. O total é arredondado para cima em minutos.
- Os alvos configuráveis por sessão são 2, 4, 6 e 8 exercícios para diferentes faixas de tempo, limitados também pelo nível. O orçamento disponível pode reduzir a quantidade. Quando o resultado perde o foco do dia ou fica incompleto, o gerador identifica o dia e pede ajuste de parâmetros. O resumo semanal contabiliza séries diretas e indica grupos sem cobertura direta. A estimativa não mede o tempo real do aluno.
- Na regeneração de um dia, as outras sessões ficam intactas. Exercícios preservados e cardio previamente editado entram no cálculo antes de acrescentar movimentos. Um conflito entre linha preservada e restrições requer revisão.

## Exemplos reproduzíveis

A tabela foi obtida chamando `generateProgram` e `estimateDay` com os mesmos dados fictícios de comparação. Adulto de 32 anos, objetivo de hipertrofia, mais de um ano de experiência informada, academia com todos os equipamentos do questionário, 60 minutos disponíveis, sem cardio, favoritos ou histórico. O nível da proposta varia independentemente da experiência informada. Os tempos abaixo são os estimados pelo programa.

| Nível | Divisão e dias | Exercícios por dia | Séries por dia | Minutos estimados |
| --- | --- | --- | --- | --- |
| Iniciante | Corpo inteiro, seg/qua/sex | 6 / 6 / 6 | 12 / 12 / 12 | 21 / 21 / 21 |
| Intermediário | A/B/C, seg/qua/sex | 7 / 7 / 7 | 16 / 16 / 18 | 29 / 29 / 34 |
| Avançado | Superior/inferior, seg/ter/qui/sex | 8 / 8 / 8 / 8 | 22 / 22 / 22 / 18 | 44 / 44 / 44 / 36 |

No primeiro dia iniciante entram agachamento com peso corporal, supino na máquina, remada baixa, ponte de glúteos, dead bug e elevação lateral. O segundo dia começa com levantamento com kettlebell e remada com elástico. No dia de puxar intermediário aparecem remada com halter, puxada frontal aberta, rosca com halteres, pulldown com braços estendidos, abdominal reverso, rosca martelo e dead bug. O primeiro dia de inferiores avançado começa com agachamento livre e levantamento terra romeno com barra. Essas saídas demonstram o software e exigem revisão antes da atribuição.

## Do rascunho à execução

No Studio, abra **Criar treino**, gere uma sugestão, parta do zero ou abra um modelo. **Explorar modelos** oferece três semanas adaptáveis (corpo inteiro, A/B/C e superior/inferior), além dos modelos salvos pelo personal. Selecione o dia para editar séries, repetições e descanso. Em **Adicionar exercícios**, pesquise, consulte favoritos, registre um exercício próprio ou adicione vários itens. Expanda a linha para acrescentar uma orientação de execução, carga ou esforço.

**Visualizar como o aluno** usa a mesma transformação e o mesmo componente de leitura da ficha atribuída. A aprovação grava uma versão. A atribuição utiliza esse registro, incluindo notas e cardio, e preserva versões anteriores. O aluno abre **Meus treinos**, consulta a ficha e registra suas séries. Pausar ou sair acumula o tempo de execução já registrado. O personal acompanha o histórico do aluno. A persistência depende de o navegador permitir o armazenamento local naquela cópia do HTML.

## Como a entrega foi verificada

A rodada final passou em 67 testes unitários e 51 testes de navegador offline. Lint, TypeScript e compilação de produção também passaram. A cópia do HTML usada na suíte de navegador tem o mesmo SHA-256 do arquivo entregue na raiz. Em uma rodada anterior com suítes concorrentes, o teste visual da transição entre card e editor falhou de forma intermitente. Ele passou na rodada final.

- O teste de regressão em [training-v2.test.ts](../tests/unit/training-v2.test.ts) cobre a antiga saída de um exercício e verifica divisões, dias distintos, limites de duração e regeneração com linhas preservadas. Os testes de cardio conferem os segundos de intervalos e ciclos.
- Uma varredura combinou três níveis, oito divisões, quatro durações (15/30/45/60 minutos), três frequências (2/3/4 dias) e três conjuntos de equipamento, sempre com um exercício excluído. Entre 864 combinações, 744 produziram propostas e 120 solicitaram revisão. Em todos os 2.280 dias propostos, foram conferidos o orçamento de tempo, os equipamentos, a exclusão, ao menos dois exercícios e a ausência de IDs repetidos.
- O [teste da entrega A/B/C](../tests/cinema/training-v2.spec.ts) usa o navegador para cadastrar um exercício próprio, adicionar observação e RIR, comparar a prévia com os três dias entregues e inspecionar o editor móvel com axe. Os testes de [execução e acompanhamento](../tests/cinema/experience.spec.ts) registram as séries e conferem o feedback no perfil do personal, em 390 e 1280 px.
- O [teste de retomada](../tests/cinema/app.spec.ts) registra dois minutos, pausa a sessão, navega para o histórico e retorna quase três horas depois. Mais um minuto de execução resulta em três minutos registrados. Um teste separado restaura o rascunho quando um campo numérico ainda está em branco.
- No teste offline de uma cópia isolada do HTML, a geração e a edição no celular completaram sem requisições HTTP. A inspeção de uma ficha intermediária mostrou zero opções de substituição montadas com todas as linhas recolhidas e 319 ao expandir uma linha. Os testes de navegador usam Chrome, incluindo simulação de telas menores, teclado, zoom e redução de movimento. A avaliação com dispositivos físicos, leitores de tela e usuários finais permanece pendente.

## Referências e limites

O posicionamento do ACSM sobre treinamento resistido em adultos saudáveis fundamenta a distinção entre objetivos e o uso de volume e progressão ajustáveis. Os intervalos de exercícios e o cálculo de duração acima são decisões de produto, sem validação clínica. [Posicionamento do ACSM](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/)

A declaração científica da AHA orienta a leitura de contexto cardiovascular e supervisão. O protótipo encaminha relatos de condições específicas e perfis fora do escopo do modelo adulto para planejamento individual. O questionário não fornece diagnóstico nem liberação para atividade. [Declaração da AHA](https://pmc.ncbi.nlm.nih.gov/articles/PMC11209834/)

A OMS oferece contexto populacional sobre atividade física. A ACE e a NSCA permitem consultar exercícios e materiais profissionais. A validação das instruções técnicas e mídias específicas de cada exercício continua pendente. [OMS](https://www.who.int/initiatives/behealthy/physical-activity) · [Biblioteca ACE](https://www.acefitness.org/resources/everyone/exercise-library/) · [NSCA](https://www.nsca.com/)

O wger foi consultado como referência de catálogo aberto e licenciamento. O projeto distingue a licença do software e as licenças dos conteúdos. Esta atualização não importa mídias nem transcrições desses materiais. [Repositório wger](https://github.com/wger-project/wger)
