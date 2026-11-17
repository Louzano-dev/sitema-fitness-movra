# MOVRA — Treinamento e diário alimentar

A MOVRA é um protótipo frontend para Personal Trainers e alunos/atletas. Reúne gestão de alunos, planejamento e execução de treinos, cardio, evolução física, agenda e um diário alimentar individual. Possui também um ambiente administrativo demonstrativo.

**Para usar, abra o `index.html` da raiz com dois cliques. Não precisa de `npm run dev`, Live Server, instalação ou internet.**

O HTML contém a aplicação, vídeo de entrada, poster, fontes, estilos e JavaScript. Pode ser copiado sozinho para outra pasta. Os fontes editáveis e as ferramentas ficam em `projeto/`.

## Começar a demonstração

1. Abra `index.html` em um navegador moderno com JavaScript habilitado.
2. Escolha Personal Trainer ou Aluno/Atleta na entrada. No perfil de aluno, selecione uma identidade fictícia.
3. Entre na demonstração e navegue pelo menu. No celular, o aluno também possui navegação inferior.
4. Use o menu de usuário para sair ou trocar de perfil. O ambiente administrativo pode ser escolhido pelo seletor de ambiente.

A entrada não autentica uma conta. Não há senha, login social ou proteção de produção. Use somente dados fictícios.

## Ambiente do Personal

- **Dashboard:** indicadores derivados dos registros demonstrativos, gráficos por período, agenda e ações rápidas.
- **Alunos:** busca, filtros, cadastro, edição e perfil detalhado com treinos, sessões, feedback e evolução.
- **Treinos:** criação manual, edição, modelos, duplicação e atribuição de fichas.
- **MOVRA Studio:** questionário em seis etapas e propostas determinísticas por regras, sem IA. Editor de dias, exercícios, séries, repetições fixas/intervalos, descanso, carga opcional e instruções. Inclui regeneração com comparação, preservação de exercícios, desfazer e prévia.
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
- Consultar automaticamente estimativas de energia, proteínas, carboidratos e gorduras, sem opção de ocultar.
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
