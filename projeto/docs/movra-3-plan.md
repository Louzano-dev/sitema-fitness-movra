# MOVRA 3.0 · implementação

Preservar a landing/vídeo e os componentes existentes. Acrescentar Studio e Fuel, rotas reais e exportação portátil pelos mesmos fontes.

1. Modelos e funções puras: questionário, catálogo, motor determinístico versionado, programas/dias/versões/atribuições; alimento, nutrientes desconhecidos, porções, refeições e preferências por aluno.
2. Repositório mock com persistência local versionada e validação de restauração. Sessão de visualização separada; logout não apaga dados; reset explícito. Seleção da identidade do aluno por ID, nunca por nome. Permissão Fuel desativada por padrão e consultada no serviço.
3. Studio: seis etapas, bloqueio de propostas automáticas para menores/contextos especiais, editor revisável e versionado, comparação de regeneração, modelos e atribuição em fichas executáveis existentes.
4. Fuel: catálogo verificável USDA público com atribuição, sem redistribuir TBCA sem condições confirmadas. Quantidades e conversões específicas, totais parciais, alimentos próprios/receitas, refeições/data/favoritos, números opcionais e bloqueados para menores, compartilhamento revogável.
5. Integração dos painéis, acessibilidade e motion existente; testes de regras, persistência, privacidade e percursos desktop/mobile. Recompilar o index.html completo e validar offline.

Limites: somente dados fictícios; armazenamento local não seguro; nenhuma API em runtime, autenticação, pagamento ou recomendação clínica. Regras de geração são modelos demonstrativos de organização, não diretrizes de prescrição individual. Fontes e condições: USDA FoodData Central API Guide (domínio público/CC0), dataset SR Legacy 04/2018; WHO guidelines 2020 para distinção de populações, sem atribuir validação clínica aos modelos MOVRA.
