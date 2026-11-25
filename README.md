# MOVRA — Treinamento e diário alimentar

**[Acessar a demonstração da MOVRA na Vercel](https://sitema-fitness-movra.vercel.app/entrar)**

## MOVRA 7.0 na versão local

No painel **Hoje**, o aluno inicia ou retoma a ficha e acompanha a meta da semana. Em **Evolução e conquistas**, o companheiro MOVRA passa por Início, Ritmo, Firme, Força e Elite após 0, 1, 3, 6 e 12 semanas encerradas com a meta cumprida. Abrir o aplicativo apenas acende o indicador. Os dias de descanso preservam a sequência. Em **Meu personal**, a consulta por código, link ou QR permite conferir o profissional antes de confirmar o vínculo.

- Em **Meus treinos**, escolha o programa principal, salve, arquive ou restaure uma ficha e consulte o histórico. A cópia personalizada atribuída pelo Connect permanece disponível após encerrar o vínculo. O modelo do profissional continua no espaço dele.
- Em **Meu personal**, gerencie os acompanhamentos. O Connect permite manter mais de um treinador. **Encontrar personal** reúne os perfis publicados neste navegador. Em **Meu negócio**, o personal apresenta seu currículo e define os serviços oferecidos.
- O aluno pode escolher dias de treino e acompanhar sua constância na visão geral. Os dias planejados são independentes das reservas de horário. Cada conversa pertence a um vínculo. As mídias são locais e os vídeos têm validade de sete dias. Com a aplicação fechada, a limpeza física aguarda uma nova abertura.
- Para experimentar a troca entre personal e aluno, abra as duas contas locais na mesma cópia do aplicativo e no mesmo navegador. A seleção de serviços é demonstrativa. Verificação documental, pagamentos, sincronização entre dispositivos e descarte de mídias em servidor dependem de infraestrutura externa.

## Studio e Connect

No **MOVRA Studio**, escolha **Gerar para mim** para receber uma sugestão com base nos dados do aluno, **Escolher divisão** para consultar modelos por finalidade ou **Criar do zero** para montar uma ficha manual. O catálogo reúne 11 modelos de organização semanal. Confira a semana antes de gerar. O editor permite revisar cada dia, a cobertura muscular e a prévia que será entregue ao aluno.

Em **MOVRA Connect**, selecione Personal ou Aluno na entrada e abra **Criar ou abrir conta local**. O personal encontra seus convites no dashboard. O aluno pode continuar sem personal, solicitar vínculo por código público ou confirmar um convite individual por link, câmera ou imagem do QR Code. O personal aprova solicitações por código e pode revogar convites individuais. O compartilhamento pelo WhatsApp abre uma mensagem para o usuário enviar.

Contas, convites e fichas desta demonstração ficam no armazenamento do navegador. Para experimentar os dois lados, selecione as contas na mesma origem e no mesmo navegador. O endereço publicado e cada cópia local do HTML podem ter armazenamentos diferentes. Autenticação, controle de acesso no servidor e sincronização entre aparelhos dependem de um backend futuro.

Ative **Modo guiado** acima do conteúdo para receber orientações por tarefa. O Studio reúne as opções de criar, revisar e atribuir fichas. No diário alimentar, **Registrar e adicionar outro** permite lançar vários alimentos na mesma refeição. [Uso e validação da experiência universal](projeto/docs/experiencia-universal.md).

Biblioteca ampliada para **319 exercícios e variações**, com busca, filtros e carregamento em lotes. O Personal pode informar observações opcionais por exercício e para o treino inteiro; as instruções aparecem ao aluno durante a execução. [Lista completa do catálogo](projeto/docs/exercicios.md). O Studio usa 96 movimentos com função, equipamento e dificuldade classificados para gerar propostas por nível, divisão, equipamento e tempo disponível. [Histórico do motor 2.0 e referências](projeto/docs/motor-treinos-v2.md).

O dashboard e os editores usam transições entre aluno e perfil, treino e editor, exercício e instruções, alimento e quantidade. [Detalhes das interações](projeto/docs/interaction-refinement.md).

A MOVRA é um protótipo frontend para Personal Trainers e alunos/atletas. Reúne gestão de alunos, planejamento e execução de treinos, cardio, evolução física, agenda e um diário alimentar individual. Possui também um ambiente administrativo demonstrativo.

**Para usar, abra o `index.html` da raiz com dois cliques. Não precisa de `npm run dev`, Live Server, instalação ou internet.**

O HTML contém a aplicação, vídeo de entrada, poster, fontes, estilos e JavaScript. Pode ser copiado sozinho para outra pasta. Os fontes editáveis e as ferramentas ficam em `projeto/`.

## Começar a demonstração

1. Abra `index.html` em um navegador moderno com JavaScript habilitado.
2. Escolha Personal Trainer ou Aluno/Atleta na entrada. No perfil de aluno, selecione uma identidade fictícia.
3. Entre na demonstração e navegue pelo menu. No celular, o aluno também possui navegação inferior.
4. Use o menu de usuário para sair ou trocar de perfil. O ambiente administrativo pode ser escolhido pelo seletor de ambiente.

A entrada não autentica uma conta. Não há senha, login social ou proteção de produção. Use somente dados fictícios.

Os alertas de cobertura do Full Body usam frequência semanal e individualização como referências. A duração é estimada pelas séries, repetições, descansos, transições e cardio. [Recomendações do ACSM para adultos saudáveis](https://acsm.org/resistance-training-guidelines-update-2026/).

## Ambiente do Personal

- **Dashboard:** indicadores derivados dos registros demonstrativos, gráficos por período, agenda e ações rápidas.
- **Alunos:** busca, filtros, cadastro, edição e perfil detalhado com treinos, sessões, feedback e evolução.
- **Treinos:** criação manual, edição, modelos, duplicação e atribuição de fichas.
- **MOVRA Studio:** entrada simplificada com prévia semanal e propostas determinísticas por regras, sem IA. Editor de dias, exercícios, séries, repetições fixas/intervalos, descanso, carga opcional e instruções. Inclui regeneração com comparação, preservação de exercícios, desfazer e prévia.
- **Aprovação e versões:** revisão explícita antes de atribuir; versões aprovadas e sessões concluídas preservam seus registros anteriores.
- **Biblioteca:** exercícios com busca, filtros, instruções, equipamentos, favoritos e alternativas. Mídia técnica não cadastrada é identificada.
- **Cardio:** modalidades aeróbicas, cadastro de modalidades próprias, editor de blocos/ciclos, intensidade e parâmetros aplicáveis. Pode acompanhar a musculação ou compor um dia independente.
- **Agenda e evolução:** agendamentos, conflito/cancelamento demonstrativos, avaliações e acompanhamento dos registros.
- **Minha alimentação:** diário próprio do Personal, separado dos alunos.

O Studio organiza propostas que precisam de avaliação profissional. Contextos especiais, menores e configurações incoerentes seguem revisão/planejamento supervisionado. Não há diagnóstico ou garantia de adequação individual.

## Ambiente do aluno

O aluno recebe fichas atribuídas ao seu ID, consulta instruções e último registro, informa cargas/repetições e marca séries. Pode repetir valores nas séries em aberto, controlar descanso, pausar a execução, concluir sessões e registrar feedback. Histórico e evolução refletem os registros da demonstração.

No cardio, visualiza modalidade, parâmetros, etapa atual/próxima e histórico. Pode iniciar, pausar, retomar, avançar etapas, registrar duração real, distância aplicável, esforço percebido e observações. Registros podem ser corrigidos no histórico. Não depende de relógio ou equipamento conectado.

O cronômetro de cardio usa tempo monotônico; animações não calculam sua duração. **Recarregar ou abandonar a página reinicia o relógio em andamento. Os registros já salvos permanecem.**

## MOVRA Fuel — alimentação individual

Cada aluno possui seu próprio diário. O Personal também registra sua própria alimentação, mas **não consulta refeições, calorias ou nutrientes dos alunos**. Não existe opção de compartilhar alimentação com o Personal; permissões antigas de compartilhamento são ignoradas pelo serviço.

O Fuel permite:

- Registrar refeições e alimentos por data, editar quantidades, excluir, duplicar e reutilizar registros.
- Pesquisar alimentos, usar favoritos, cadastrar produtos próprios e criar receitas com rendimento final informado.
- Adultos podem consultar estimativas de energia e macronutrientes. A exibição começa ativa e respeita a preferência do próprio perfil. Para menores ou pessoas sem idade registrada, o diário apresenta refeições e quantidades sem contagem individualizada.
- Usar gramas e porções específicas documentadas para cada alimento.
- Consultar histórico e exportar resumo demonstrativo em JSON.

**São estimativas de energia e nutrientes ingeridos nos alimentos, não calorias gastas em exercícios.** Não há compensação entre comida e treino, dieta prescrita, metas calóricas automáticas ou recomendação de suplementos.

O catálogo inicial possui 17 alimentos identificados do USDA FoodData Central SR Legacy, com origem consultável. Não são dados atribuídos à TBCA. Alimentos próprios são identificados como informados pelo usuário. Nutrientes desconhecidos geram estimativa parcial, sem serem tratados como zero confirmado; mililitros não são convertidos genericamente em gramas.

A separação dos diários funciona na interface e nos serviços do protótipo. Não equivale a autorização segura: quem inspeciona o navegador pode acessar os dados locais. Um backend futuro deverá implementar identidade, autorização e isolamento reais. Não há perfil de nutricionista implementado.

## Administração

Ambiente separado para consultar e editar organizações, planos e assinaturas fictícias e visualizar indicadores operacionais. Não processa cobranças nem pagamentos reais.

## Interface e acessibilidade

Identidade MOVRA em verde profundo, lima e off-white; temas claro/escuro e sidebar compacta/expandida com preferências salvas. Indicador ativo animado, transições entre páginas com fallback e reordenação de exercícios com GSAP Flip.

Movimento reduzido é respeitado. A entrada tem vídeo real, pausa e poster de fallback. Menus, formulários e diálogos possuem identificação acessível e foco visível. View Transitions são usadas em navegadores compatíveis; a navegação permanece funcional sem essa API.

## Dados e persistência

Dados fictícios são salvos no armazenamento local do navegador quando permitido. Sair encerra a visualização sem apagar registros. Para restaurar os exemplos, use **Configurações/Meu perfil → Redefinir dados demonstrativos**, com confirmação.

Copiar o HTML transporta a aplicação e seus recursos, **não os dados do navegador**. Armazenamento em URLs `file:` depende do navegador e do caminho do arquivo. Não há sincronização entre computadores. Se o armazenamento for negado, a aplicação informa que opera em memória.

## Estrutura e manutenção opcional

```text
Sistema Fitness/
├── index.html          # Aplicação completa para uso direto
├── README.md           # Este guia
└── projeto/
    ├── src/            # Componentes, rotas, domínio e serviços
    ├── standalone/     # Navegação por hash e entrada portátil
    ├── public/         # Mídia e recursos dos fontes
    ├── design/         # Tokens e identidade
    ├── docs/           # Entregas, evidências e limites
    ├── scripts/        # Exportação e verificações
    ├── reference/      # Apresentação anterior preservada
    ├── tests/          # Testes de domínio e navegador
    └── package.json
```

Stack dos fontes: Next.js App Router, React, TypeScript, Tailwind CSS, componentes shadcn/Radix, Recharts e GSAP. Serviços tipados e repositório local substituível preparam a integração futura com APIs.

Somente para desenvolver ou regenerar o HTML, use Node.js 22+ e execute dentro de `projeto`:

```powershell
npm.cmd ci
npm.cmd run build:portable
```

Edite os fontes, não o runtime empacotado do HTML. A exportação atualiza o `index.html` da raiz. O modo Next.js é opcional para manutenção; não é necessário para usar a entrega.

## Verificações e documentação

Comandos disponíveis em `projeto`:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:portable
npm.cmd run test:e2e
```

Os testes portáteis copiam o HTML sozinho para uma pasta temporária e o abrem no Chrome com rede desligada. Os testes Next.js utilizam um servidor local de teste do build de produção. Isso não cria dependência de servidor para o HTML.

Na última alteração de privacidade do Fuel passaram **53 testes unitários, seis cenários Fuel/Studio offline, build, tipagem e lint**, além da confirmação final do fluxo de diários individuais. A revisão de motion executou 40 cenários; as quatro falhas iniciais foram corrigidas e retestadas em execuções específicas. Não se afirma uma rodada única de 40 testes aprovada após essas correções.

- [Diários individuais e privacidade atual](projeto/docs/fuel-private-release.md)
- [Design e motion: análise da referência e resultados](projeto/docs/premium-motion-release.md)
- [Cardio: implementação, testes e limites](projeto/docs/cardio-4.1-release.md)
- [Studio e Fuel: fundação MOVRA 3.0](projeto/docs/movra-3-release.md)
- [Uso e geração do HTML portátil](projeto/docs/portable.md)

Documentos antigos registram políticas anteriores. Para alimentação, prevalece o fluxo individual descrito neste README e na entrega de privacidade.

## O que ainda falta para produção

Backend, banco de dados, autenticação/autorização reais, sincronização, isolamento por organização e auditoria de acesso. Pagamentos e IA não foram implementados. Também faltam calendário recorrente de cardio, cronômetros persistentes em segundo plano, ampliação/revisão profissional dos catálogos e testes em aparelhos físicos, outros navegadores e leitores de tela.

Os testes automatizados e as capturas em diferentes larguras ajudam a validar a interface; não certificam conformidade integral com WCAG nem garantem desempenho em todos os dispositivos.
