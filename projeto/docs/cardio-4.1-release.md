# MOVRA 4.1 · cardio integrado

Implementação incremental nos fontes reais. O `index.html` da raiz continua completo e independente: vídeo, fontes, CSS e JavaScript embutidos, sem servidor ou internet. A apresentação cinematográfica e o Fuel foram preservados.

## Funcionalidades

- Biblioteca específica de cardio dentro da biblioteca existente: 14 modalidades, descrições, equipamentos, parâmetros aplicáveis e alternativas. Cadastro de modalidades próprias com seleção dos parâmetros suportados, persistido localmente.
- No Studio, cada dia possui **Adicionar cardio**. Pode combinar cardio antes/depois da musculação ou conter somente cardio. Todos usam aprovação explícita, versão imutável e atribuição da ficha existente.
- Editor: contínuo, intervalado, progressivo, livre e personalizado; duração/frequência, intensidade qualitativa, RPE, teste da fala ou faixa cardíaca opcional definida pelo profissional. Distância/velocidade/inclinação/resistência/cadência aparecem conforme modalidade. Não há cálculo de zonas pela idade.
- Blocos de aquecimento, esforço, recuperação e desaquecimento, com segundos, repetições, intensidade e instruções; adicionar, remover, duplicar e reordenar pelo botão Subir. Ciclos multiplicam a sequência. Linha do tempo e duração derivadas dos blocos. Validação impede durações negativas, intervalado sem esforço/recuperação, faixa cardíaca incoerente e total acima de 240 minutos.
- A revisão do questionário permite incluir cardio, escolher modalidades, frequência, tempo, experiência, objetivo e observações. O gerador reserva tempo dentro da sessão, respeita equipamentos, recusa frequência/tempo incompatíveis e mantém a triagem existente para menores/contextos especiais. Propostas não recebem intensidade alta por nível/idade. Modalidades fora do subconjunto suportado pelo motor seguem edição manual.
- Aluno recebe modalidade, parâmetros, instruções, intensidade, etapa atual/próxima e último registro. Relógio monotônico baseado em `performance.now()`, iniciar/pausar/retomar, avanço manual de etapas e finalizar. Campos permitem duração real, distância aplicável, RPE opcional e notas. Salvar novamente corrige o mesmo registro; histórico permite correções posteriores.
- Histórico do aluno e acompanhamento dentro do perfil de cada aluno no Personal, com período/modalidade, prescrições atribuídas, sessões realizadas, minutos planejados/realizados, dias com execução e evolução descritiva de duração/distância/RPE. Valores vêm dos registros, sem pontuação ou conclusão de que mais é melhor.

## Persistência e versões

Modelos em `domain/cardio.ts`, operações em `services/cardio-service.ts`, UI em `features/cardio.tsx`. Campos novos são opcionais no envelope v3 para restaurar dados anteriores sem apagar registros. Aprovação copia o cardio junto ao dia; atribuição cria snapshot na ficha executável. Execução guarda cópia da prescrição e versão. Alterar o rascunho ou criar nova versão não altera execuções anteriores. Serviço valida vínculo com aluno/ficha/versão.

Dados continuam fictícios, locais e sem segurança de produção. Sem backend, autenticação real, smartwatch ou notificações. Recarregar preserva os registros salvos; cronômetro em andamento não persiste. Avançar etapa é manual e a contagem de etapas não é supervisão clínica. Musculação e cardio possuem registros de execução separados dentro da mesma ficha; salvar cardio não conclui automaticamente as séries.

## Fontes e limites de intensidade

Referências consultadas antes de implementar os campos:

- [CDC — medir intensidade](https://www.cdc.gov/physical-activity-basics/measuring/index.html): esforço relativo, percepção subjetiva e teste da fala. O módulo oferece esses métodos como entradas do profissional; não converte RPE em diagnóstico ou prescrição automática.
- [OMS — atividade física](https://www.who.int/initiatives/behealthy/physical-activity): contexto geral; não transforma recomendações populacionais em metas individuais automáticas.
- [American Heart Association — frequência cardíaca](https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/target-heart-rates): valores estimados por idade são médias gerais. Não foram implementadas fórmulas ou zonas individuais automáticas.

Fuel continua contabilizando somente alimentos. Nenhum gasto calórico do cardio é estimado/subtraído. Modalidades não têm imagens/vídeos técnicos cadastrados; isso é explícito, sem mídia ou certificação inventada.

## Validação

- Build Next.js de produção, TypeScript e ESLint aprovados.
- 52 testes unitários aprovados em três arquivos, incluindo seis testes novos de cardio (modalidades/parâmetros, duração dos blocos/ciclos, validações, vínculo/aprovação/versionamento/persistência e organização automática respeitando tempo/equipamentos/contextos).
- Dois percursos E2E de cardio aprovados em 390 e 1280 px no HTML copiado sozinho para pasta temporária, com rede desligada: movimento reduzido no celular e animações ativas no desktop. Cobrem esteira por tempo, bicicleta por distância, duplicação/reordenação/exclusão de blocos, duração total, aprovação/atribuição, execução, etapas, pausa/retomada, correção, acompanhamento, reload e preservação do histórico após edição da ficha. O teste unitário também aprova/atribui uma nova versão e confirma o vínculo do registro antigo com a versão original.
- Cronômetro testado com relógio controlado: 2 segundos de execução + 5 segundos pausado + 1 segundo de execução resultam em 3 segundos. Axe sem violações no diálogo auditado; não constitui certificação integral. Capturas em `docs/evidence-cardio/`.
- **37 cenários E2E aprovados na regressão completa offline**, em 6,1 min, incluindo os 35 percursos anteriores de Studio/Fuel e os dois novos de cardio. Nenhum servidor foi necessário. Não foi repetida a suíte E2E da distribuição Next.js nesta etapa; seu build, tipagem e lint passaram.
- Na regressão foi removida uma animação GSAP aninhada do novo histórico que interferia no fluxo de navegação móvel com movimento ativo. O percurso normal passou novamente; navegação e motion compartilhados permaneceram como antes, sem os ajustes experimentais da investigação.
- `git diff --check` aprovado. Evidência do artefato e resultados em `docs/evidence-cardio/verification.json`. Testes executados em 17/11/2026.

## Pendências

- Calendário de ocorrências de cardio, metas de adesão e comparação agregada entre versões não implementados. As métricas planejadas contam snapshots atribuídos no período (inclusive versões anteriores); a interface explicita que isso não equivale a sessões agendadas. A frequência de execução exibida é a contagem de dias com registro.
- Tendências são listagens cronológicas acessíveis por modalidade, com números reais; não foi introduzido gráfico com dados inventados.
- Motor automático cobre caminhada/corrida ao ar livre, esteira compatível, bicicleta ergométrica compatível, dança e circuito; outras modalidades são configuradas pelo profissional no editor. Regras são organização demonstrativa, não validação clínica de distribuição/recuperação.
- Faltam validação profissional para uso real, aparelhos físicos, leitores de tela e outros navegadores. Auditoria automatizada não certifica WCAG integral.
- Exportação portátil carrega aproximadamente 7,1 MiB com o vídeo embutido. Persistência `file:` depende do navegador/caminho; copiar o HTML transporta a aplicação, não registros locais.

Uso: abrir `../index.html` diretamente. Para manutenção opcional, editar os fontes em `projeto` e regenerar com `npm.cmd run build:portable`. Não precisa iniciar servidor para usar a entrega.
