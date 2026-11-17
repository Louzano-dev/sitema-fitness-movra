# Fuel · diários individuais

O Personal utiliza a mesma experiência de refeições, alimentos, receitas, histórico e estimativas para sua própria alimentação, vinculada à identidade demonstrativa `personal:org-1`. Ela não é um aluno da lista e não compartilha registros com Ana, Bruno ou outras identidades.

O seletor de aluno e a opção de compartilhar alimentação foram retirados do Fuel. O resumo do dashboard do Personal contém apenas seu próprio diário. O serviço recusa consultas do Personal a diários de alunos mesmo quando existem permissões antigas de compartilhamento. A administração não recebe esses registros. Os alunos continuam vendo somente seus registros; as estimativas são sempre exibidas.

As métricas representam alimentos registrados e energia/nutrientes ingeridos, não gasto calórico com treino. Não foram implementados prescrição de dieta, perfil de nutricionista ou autorização clínica. Esta é uma decisão de produto, sem afirmação genérica sobre atribuições legais de profissões.

Persistência mantém dados anteriores e separa registros, alimentos próprios e favoritos pela identidade. `studentId` é o campo legado usado também como identificador do diário próprio do Personal; uma integração futura deverá modelar explicitamente o proprietário e implementar autorização no servidor.

Continuamos em um protótipo local: o fluxo da interface e os serviços aplicam essa separação, mas não oferecem segurança contra inspeção do navegador. Sem backend ou autenticação real.

Validação: TypeScript, ESLint, build Next.js e 53 testes unitários aprovados; seis cenários E2E Fuel/Studio no HTML isolado offline aprovados. Cobrem CRUD de refeições, cálculo, alimentos personalizados/receitas, ausência de alternância nutricional, diário próprio do Personal, isolamento entre identidades, persistência após reload e acessibilidade automatizada. O HTML foi regenerado pelos fontes e permanece independente de servidor.
