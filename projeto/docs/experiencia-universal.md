# Experiência universal na MOVRA

## Como usar

Abra o `index.html` da raiz, inclusive uma cópia isolada. Após entrar, o botão **Modo guiado** fica acima do conteúdo em todos os ambientes. A escolha e as dicas dispensadas ficam no navegador para aquele perfil demonstrativo. A alternância durante um formulário mantém a edição atual.

| Tarefa | Caminho |
| --- | --- |
| Encontrar fichas pendentes | No dashboard do personal, selecione a contagem de fichas aguardando revisão. Desmarque o filtro para ver as demais. |
| Criar e atribuir um treino | No Studio, escolha o questionário, a criação manual ou um modelo. O editor permite ajustar os dias, exercícios, observações e cardio. Confira a prévia, aprove a versão e atribua a ficha. |
| Corrigir uma edição | Use os botões de reordenação ou Desfazer. A remoção de exercício ou dia solicita confirmação. Ao trocar de ficha dentro do Studio com edições pendentes, é possível cancelar e voltar a salvar. |
| Registrar uma refeição | Em Alimentação, escolha Adicionar alimento, pesquise o nome e informe a quantidade. Registrar e adicionar outro mantém a refeição selecionada e devolve o foco à pesquisa. |
| Registrar uma série | No início do aluno, abra o treino, leia as orientações, ajuste os valores e marque Registrar. A linha indica Registrada. É possível desmarcar e corrigir. |
| Executar cardio | O controle junto ao cronômetro alterna entre iniciar, pausar e retomar. O término continua levando à conferência do registro. |

O diário do personal continua separado do diário de cada aluno. Para adultos, o protótipo respeita a preferência individual de exibir estimativas, disponível nas configurações do personal ou em Meu perfil para o aluno. Menores e pessoas com idade desconhecida podem registrar as refeições e quantidades. Seus resumos e exportações omitem a contagem calórica individualizada.

## Decisões de acessibilidade

A auditoria dos fontes identificou campos de validação já associados, suporte a movimento reduzido, confirmação de aprovação e reordenação por botões. Os principais obstáculos eram a competição entre ações do Studio, a perda silenciosa de edição na troca de ficha, o excesso de campos antes de escolher um alimento e a falta de identificação visual do controle de registro de cada série.

O questionário agora mostra progresso, leva o foco ao título da próxima etapa e explica divergências entre frequência e dias escolhidos. A apresentação guiada organiza controles secundários em seções expansíveis. Botões de ação frequente têm rótulos textuais, e as áreas de toque e a tipografia das tarefas acompanham telas estreitas e ampliação. No diário, os totais continuam a atualizar sem animar a entrada do painel inteiro a cada item.

As decisões de reflow, foco e tamanho dos alvos seguem os critérios pertinentes da [WCAG 2.2](https://www.w3.org/TR/WCAG22/). O uso de linguagem familiar, etapas curtas e ajuda dispensável segue as orientações cognitivas do [W3C](https://www.w3.org/TR/coga-usable/) e seu [guia de padrões](https://www.w3.org/TR/coga-usable/design_guide.html). Legibilidade e facilidade de correção atendem também às dificuldades observadas na [pesquisa do Nielsen Norman Group com pessoas mais velhas](https://www.nngroup.com/articles/usability-for-senior-citizens/).

## Cenários técnicos por persona

No artefato final passaram 49 testes E2E em Chrome offline e 55 testes unitários. Lint, TypeScript, build Next.js e empacotamento portátil passaram. O HTML verificado mede 7.556.816 bytes e tem SHA-256 `58dab93dd49aaba5decfc3b29e23161c91235236f7f25715d269c90956de8527`. A suíte cobriu 320, 360, 390, 768 e 1440 CSS px, ampliação de texto e zoom real de 200%.

| Persona do briefing | Cenário representado na automação |
| --- | --- |
| A · Aluno de 19 anos | Abrir o treino no celular, registrar séries, concluir e consultar o histórico. |
| B · Personal de 32 anos | Gerar uma proposta, ajustar séries, preservar exercícios, aprovar e atribuir. |
| C · Personal de 55 anos | Ativar o modo guiado, cadastrar um aluno, criar uma ficha para ele e recuperar uma edição antes de descartá-la. |
| D · Aluno de 68 anos | Consultar as orientações e registrar uma série com texto ampliado. |
| E · Pessoa com dificuldade motora | Mover exercícios com botões, repetir os valores de uma série e avançar sem arrastar. |
| F · Pessoa que usa teclado ou leitor de tela | Navegar por teclado, corrigir dias do questionário, verificar foco, nomes acessíveis e estados. |

Os cenários usam os perfis fictícios existentes. A idade das personas descreve o contexto da avaliação. O modo guiado e os controles do treino dependem da escolha do usuário.

O arquivo `tests/cinema/universal.spec.ts` cobre persistência, descarte, entrada sequencial de alimentos, navegação em 320 CSS px e zoom nativo de 200% em um perfil temporário do Chrome. A suíte inclui axe, temas, navegação por teclado, movimento reduzido, erros, histórico, cardio e uso offline. Para repetir a verificação do arquivo distribuído, execute `npm run test:portable` dentro de `projeto`.

A medição de rolagem da entrada no Chrome headless, a 1280 × 900, coletou 179 intervalos entre quadros. A mediana foi de 7 ms, o percentil 95 de 20,8 ms e três intervalos ultrapassaram 50 ms. O observador de tarefas longas registrou zero ocorrências. Em três ciclos de entrada e saída, o vídeo e o pin da página de entrada foram desmontados ao abrir o painel.

Ainda falta observar pessoas usando a MOVRA em aparelhos físicos e com leitores de tela como NVDA ou VoiceOver. Os testes automatizados cobrem os fluxos descritos e não estabelecem conformidade integral com WCAG 2.2 AA.
