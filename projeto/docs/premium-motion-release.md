# MOVRA · Premium Motion Experience

Revisão incremental de UI/motion nos fontes existentes; regras de treino, cardio, nutrientes, consentimento e persistência não foram alteradas. Fuel continua mostrando estimativas automaticamente. Login cinematográfico e mídia original preservados. A entrega permanece no `index.html` completo, sem servidor.

## Referência analisada

Vídeo fornecido: gravação vertical de 14,99 segundos, 530 × 848, com uma demonstração financeira dentro de uma rede social. Foram extraídos e inspecionados quadros em sequência a cada dois segundos (0–14 s), além de seis quadros a cada 1/3 s do trecho 4–6 s, com recorte do dashboard. Artefatos locais: `evidence-motion/reference-sequence.jpg` e `reference-detail.jpg`. A análise foi visual por amostragem temporal, sem inventar acesso ao projeto original ou aos seus easings/código.

Observações: lateral compacta nos primeiros quadros e expandida no detalhe; destaque lima ancora a navegação; troca de seção mantém cabeçalho e lateral; cartões surgem em sequência; lista se transforma em detalhe sem mudar a linguagem. A resolução limita leitura fina, medidas e curva exata do movimento. A MOVRA usa esses princípios, não as cores marrons, imóveis, indicadores financeiros ou imagens do vídeo.

Skills aplicadas seletivamente: `design-taste-frontend` para hierarquia, composição e acabamento; `gsap-performance` para escopo, transforms, redução de efeitos e cleanup. Instruções genéricas de landing da skill não substituem o briefing de preservar o SaaS operacional.

## Implementação

- Sidebar expandida/compacta por botão, nomes acessíveis, tooltips por hover/foco e indicador ativo GSAP contínuo. Preferência visual em `movra:appearance:1`, separada dos dados fictícios. ResizeObserver realinha o destaque e é desconectado no cleanup.
- Layout acompanha a lateral. A única transição de geometria explícita é a largura/margem do contêiner por 280 ms; é necessária para redistribuir espaço, sem medir todos os cards a cada frame. Indicador usa translate; nenhuma promessa universal de FPS.
- Navegação desktop com View Transitions quando disponível: saída/entrada centralizadas, lateral/cabeçalho estáveis e continuidade entre linha de aluno/ficha e cabeçalho de destino. Suporta hash router portátil e App Router. Sem interceptar teclas modificadoras, links externos, downloads ou menu móvel. Redução de movimento e navegadores sem API usam a navegação/GSAP existente.
- A API espera o commit da rota com limite de 700 ms para não deixar a transição presa. Não clona formulários, não substitui estado do repositório nem cria HTML de segurança. Voltar/avançar continuam nativos, com entrada padrão.
- GSAP Flip no editor para mudanças de ordem/adição/remoção de exercícios; captura antes da atualização e anima após commit. Sem captura por tecla dos parâmetros. Instância anterior é cancelada e desmontagem faz cleanup.
- Dashboard: tipografia editorial, superfície verde com marca existente, indicadores prioritários antes da leitura secundária, composições variadas, ações rápidas e números derivados dos mesmos dados. Indicadores têm feedback curto de opacidade, sem inventar contagens intermediárias. Refeições/itens entram brevemente; valores nutricionais permanecem legíveis.
- Temas claro/escuro com os mesmos componentes e tokens semânticos, preferência persistida, controles acessíveis, superfície de diálogos correspondente e gráficos legíveis. Não usa filtro de inversão de cores.
- Mobile mantém drawer e navegação inferior do aluno. Não há pinning operacional nem scroll-jacking; o ScrollTrigger narrativo original continua na entrada.

## Motion system

Resposta 120 ms; feedback 180 ms; superfícies/indicador/Flip 240 ms; navegação/layout 280 ms. Curva CSS `cubic-bezier(.22,1,.36,1)`; GSAP `power2.out` / `power3.out`. Deslocamentos de 3–10 px, opacidade .7–1 para feedback, sem escala exagerada ou blur de tela inteira. Movimento reduzido desliga transições e Flip; dados e controles nunca dependem de terminar uma animação.

## Validação

Build Next.js, TypeScript, ESLint e 52 testes unitários aprovados. Na regressão completa offline, 36 de 40 cenários passaram inicialmente. Três falhas de largura foram corrigidas (flex da área de trabalho e cabeçalho móvel) e passaram na repetição dos três ambientes. A quarta falha era do teste de cronômetro: o tempo real entre ações/animações avançava o relógio virtual. O teste agora congela um instante futuro fixo antes de simular os intervalos e retoma o relógio depois da asserção. Ambos os percursos de cardio passaram, sem mudar o cronômetro da aplicação.

Os três cenários adicionais de motion passaram: sidebar e preferência, navegação/perfil, temas em 390/768/1280/1920 px, persistência, redução de movimento e teclado no menu móvel. Axe não encontrou violações nas páginas e estados auditados, incluindo dashboard escuro; não certifica acessibilidade integral. A suíte E2E Next.js não foi repetida nesta etapa; os testes de navegador usaram o HTML isolado offline.

Medição indicativa em Chrome headless: 179 intervalos, mediana 7 ms, p95 13,9 ms, um intervalo acima de 50 ms e nenhum long task observado. Três ciclos de entrada/saída mantiveram um vídeo/pin na entrada e zero nos painéis, sem acúmulo. QA concorrente e ambiente headless limitam generalização; não é garantia de FPS em aparelhos. Registro em `evidence-motion/motion-observations.json`.

Capturas em quatro larguras e ambos os temas em `evidence-motion/`. A inspeção visual também corrigiu alinhamento da área de trabalho, espaçamento do primeiro indicador e altura inicial do destaque ativo.

## Limites

Shared transitions geométricas dependem de View Transitions e se aplicam às ligações de alunos/fichas. Detalhes de exercício, refeições e modais mantêm expansão/entrada de superfície; não se afirma uma transformação geométrica individual em todos os módulos. Não há animação de saída em navegadores sem a API; a navegação continua funcional.

Não foram implementados novos recursos de negócio, backend, autenticação, IA ou pagamentos. Faltam dispositivos físicos, Safari/Firefox e auditoria manual com leitores de tela. As preferências são locais ao navegador/caminho; falha de armazenamento não impede usar a interface.
