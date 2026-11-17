# MOVRA 3.0 · Studio e Fuel

O `index.html` da raiz continua sendo o aplicativo completo: abrir diretamente, inclusive copiado sozinho para outra pasta, sem npm ou servidor. Fontes editáveis permanecem em `projeto/src`; a apresentação original e o vídeo fornecido foram preservados. A página cinematográfica mantém composição, vídeo, poster e controles separados.

## Funcionalidades implementadas

### MOVRA Studio · Personal

- Questionário em seis etapas, com aluno/idade/experiência/nível, objetivo, dias/tempo, contexto, equipamentos e exclusões. Revisão das respostas antes de gerar.
- Motor determinístico `movra-rules/1.0`: equipamentos e exclusões respeitados, dias ordenados e modelos Full body, A/B, A/B/C, superior/inferior e padrões de movimento. Não usa IA ou cargas inferidas.
- Triagem demonstrativa exige planejamento manual supervisionado para menores, faixa etária especial, contextos de risco, incoerências e catálogo insuficiente. Ficha manual também exige supervisão quando idade é desconhecida ou contexto a exige. O sistema não verifica habilitação profissional nem assegura adequação clínica.
- Editor por dia: adicionar/remover/substituir/reordenar/duplicar exercícios, séries, repetições fixas ou intervalo, descanso, carga opcional, notas e instruções. Desfazer, prévia e modelos reutilizáveis.
- Regeneração de dia/proposta e alternativa compatível com comparação e confirmação. Exercícios marcados como preservados permanecem.
- Rascunho, aguardando revisão, aprovado, atribuído e arquivado. Aprovação exige revisão explícita; versões aprovadas são snapshots independentes. Atribuição cria fichas executáveis para o aluno selecionado e preserva versões anteriores/histórico. Arquivar organiza o Studio; não revoga retroativamente fichas já atribuídas.
- Biblioteca demonstrativa com 22 exercícios tipados, padrões/grupos/equipamentos, instruções, observações, alternativas, filtros, favoritos e recentes. Sem mídia inventada ou certificações.

### Execução · Aluno

Fichas com dia, versão, parâmetros e instruções. Registro de séries, carga/repetições e consulta da última execução; duplicação rápida dos valores, validação e progresso. Cronômetro de descanso com pausa/retomada/ajuste; pausa da sessão bloqueia as séries e desconta o intervalo parado do tempo final. Conclusão preserva séries, nomes, duração e versão. Resumo mostra volume descritivo e sessão anterior da mesma ficha quando disponível, sem pontuação clínica. Feedback opcional aparece no histórico e no perfil do aluno consultado pelo Personal.

O tempo da sessão começa ao abrir a execução e é mantido apenas nessa página. Recarregar preserva as séries válidas salvas, mas reinicia o cronômetro. Não há rastreamento em segundo plano nem notificações reais.

### MOVRA Fuel · Aluno e acompanhamento do Personal

- Diário por data, refeições personalizadas ou usuais, vários alimentos, edição/remoção/duplicação, cópia anterior, favoritos e observações. A busca permite nome, categoria, favoritos e recentes.
- Quantidades em gramas ou medidas específicas documentadas para cada alimento. Nutrientes proporcionais por 100 g; campo desconhecido continua desconhecido e sinaliza estimativa parcial. Não converte ml em g sem densidade.
- Cadastro de alimento próprio a partir da porção do rótulo, com marca opcional e validação. Receitas somam ingredientes e usam o peso final informado; não igualam peso cru e rendimento pronto.
- Calorias/macronutrientes opcionais e ocultos por padrão. Menores e identidades sem idade informada usam registro descritivo, com controles numéricos nutricionais indisponíveis. Sem dietas, metas, compensações, rankings ou restrições automáticas.
- Resumo por data, tendência informativa de frequência de registros e visualização/exportação JSON. A exportação respeita a preferência de exibir números.
- Compartilhamento desativado por padrão; aluno ativa ou revoga. O serviço do protótipo entrega ao Personal somente registros do aluno selecionado que optou por compartilhar; acesso revogado deixa de aparecer. Não há perfil de nutricionista ou prescrição dietética.

### Persistência e identidade

Repositório substituível com armazenamento local versionado (`movra:demo:3`) e restauração validada por Zod. Alunos são separados por IDs; alimentos próprios, refeições e preferências acompanham a identidade correta. Logout/reload encerram a sessão de visualização sem apagar os dados. Reset explícito com confirmação. JSON inválido volta aos exemplos e informa o problema; armazenamento negado mantém a aplicação em memória com aviso.

É demonstração local, não autenticação ou proteção de dados de produção. Quem inspeciona o navegador pode ler os dados locais. Usar exclusivamente dados fictícios. Copiar o HTML não transporta o localStorage; comportamento de persistência em `file:` depende do navegador e caminho.

## Origem dos alimentos

Catálogo inicial: 17 registros identificados da edição **USDA FoodData Central SR Legacy 04/2018**, com nomes em português e descrição original/ID/link preservados. Condições verificadas antes da extração: o [guia oficial USDA](https://fdc.nal.usda.gov/api-guide/) informa domínio público e CC0. [Downloads oficiais](https://fdc.nal.usda.gov/download-datasets/). Não há chave, consulta de API ou dependência de rede durante o uso.

O script `scripts/import-foods.mjs` reproduz a seleção a partir dos CSVs oficiais extraídos; `scripts/food-selection.json` lista os IDs e traduções. Importa energia (1008), proteína (1003), carboidratos (1005), gordura (1004) e pesos das porções específicas do dataset. Exemplo verificável: arroz `168878`, 130 kcal/100 g, portanto 195 kcal/150 g. Medidas USDA preservam o identificador original, por exemplo `cup`; não são conversões domésticas genéricas.

Não houve importação da TBCA: condições de redistribuição não confirmadas nesta etapa. Preparações USDA podem diferir das brasileiras; o catálogo é pequeno e não representa todos os alimentos ou preparos. Dados personalizados são identificados como informados pelo usuário. Regras do Studio são modelos demonstrativos de organização, não diretrizes clínicas validadas por USDA/OMS ou outra entidade.

## Arquitetura e design

`domain/experience.ts`, `exercise-catalog.ts`, `training-engine.ts` e `foods.ts` separam dados/regras da interface. `services/experience-service.ts` contém operações de programas, refeições e consentimento; `services/local-storage.ts` valida o envelope local. Componentes em `features/studio.tsx` e `features/fuel.tsx`, rotas App Router e hash router portátil compartilham os mesmos serviços.

Tokens MOVRA preservados: verde profundo, lima, off-white, Inter e Space Grotesk. Motion curto com transform/opacity, escopo e cleanup GSAP; movimento reduzido oferece leitura linear/poster. Alterações frequentes no Fuel não transferem foco nem rolam para o topo. Diálogos Radix, labels, foco visível, mensagens textuais e navegação móvel adaptada. A seleção alimentar troca a busca por quantidade após escolher, mantém origem em disclosure e prioriza salvar no celular. Design documentado em `design-implementation.md`.

## Validação

Validações executadas em 17/11/2026, Node 26.13.0, Chrome instalado:

- `npm.cmd run build`: aprovado, incluindo as novas rotas Studio/Fuel e agenda do aluno.
- `npm.cmd run typecheck` e `npm.cmd run lint`: aprovados. O script de medição foi conferido separadamente após o ajuste do diretório de evidências.
- `npm.cmd test`: **46 testes de domínio aprovados** em dois arquivos. Incluem geração determinística, frequência, equipamentos/exclusões, revisão de menores/contextos, ficha manual com idade desconhecida/especial, versões imutáveis, séries duplicadas, cálculos, dados ausentes, porções, receitas, identidade/consentimento, restauração corrompida, reset e armazenamento negado.
- `npm.cmd run test:e2e`: **35 cenários aprovados no build Next.js de produção**, em 2,9 min. Incluem navegação dos três ambientes, cadastro, editor manual/gerado, modelos, atribuição, execução, feedback visível no Personal, versão nova sem alterar histórico, agenda/conflito/cancelamento, avaliações, vídeo/fallback, teclado, axe, redução de movimento e Fuel. O servidor de teste foi encerrado ao terminar; não altera a execução portátil.
- `npm.cmd run test:portable`: **35 cenários aprovados no HTML isolado offline**, em 5,9 min. Os testes copiam somente o `index.html` para uma pasta temporária e abrem por `file:` com a rede desligada, sem servidor. Cobertura equivalente à suíte Next, incluindo persistência após reload, troca de identidade e compartilhamento/revogação.
- `node scripts/review-v3.mjs`: Studio e Fuel em **360/768/1280/1920 × 900 px**, sem transbordamento horizontal, exceções de página ou requisições HTTP. Capturas inspecionadas; observações em `evidence-v3/observations.json`.
- Registro de evidências `evidence-v3/frontend-review.json` validado pelo checker da skill; esse checker verifica a estrutura do registro, não certifica qualidade visual ou acessibilidade.
- `git diff --check`: aprovado; somente avisos de normalização LF/CRLF do Git no Windows, sem erros de whitespace.
- `node scripts/measure-motion.mjs docs/evidence-v3`: Chrome 157.0.8103.79, 1280 × 900, arquivo local offline. Amostra de 179 intervalos: mediana **6,9 ms**, p95 **7,2 ms**, nenhum intervalo acima de 50 ms ou long task observado. Três ciclos mantiveram um vídeo/pin na entrada e zero nos painéis, sem acumulação. É medição indicativa headless, não garantia de FPS, bateria ou desempenho em aparelhos físicos. Registro em `evidence-v3/motion-observations.json`.

## Pendências e limites

- Backend, migrações, sincronização, autenticação/autorização e RLS reais; futura modelagem multi-organização, consentimento auditável e atuação de nutricionista habilitado. Nenhum pagamento ou IA implementado.
- Revisão profissional do catálogo e dos modelos de treinamento antes de uso real. A triagem por palavras e contexto não é avaliação clínica, e pode não reconhecer todos os casos.
- Ampliar catálogo alimentar brasileiro com direitos de uso confirmados, porções e preparações revisadas; expandir mídia dos exercícios somente com material real/licenciado.
- Sessão/descanso em segundo plano, notificações, duração persistente e sincronização entre dispositivos ainda não implementados.
- Testes realizados em Chrome desktop/headless com viewports móveis. Faltam testes em celulares físicos, Safari/Firefox e auditoria manual completa com leitores de tela. Axe sem violações não certifica WCAG integral.

## Abrir e manter

Uso: abrir `../index.html` diretamente. Manutenção opcional em `projeto`: `npm.cmd ci`, editar fontes e `npm.cmd run build:portable`. Para testes dos fontes: `npm.cmd run build`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run test:e2e`. Para o arquivo isolado offline: `npm.cmd run test:portable`. Não é necessário usar `npm run dev` para a entrega.
