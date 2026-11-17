# MOVRA 4.1

Fuel individual: o Personal registra sua própria alimentação em uma identidade separada e não consulta diários, calorias ou nutrientes dos alunos. A opção de compartilhar foi removida; permissões antigas de compartilhamento são ignoradas pelo serviço. Cada aluno continua com seu próprio diário. Os valores representam energia/nutrientes ingeridos, não gasto com exercícios. Esta política substitui os fluxos de compartilhamento descritos nas entregas históricas. Continua sendo demonstração local, sem segurança de produção ou perfil de nutricionista implementado.

Interface refinada com sidebar compacta/expandida, indicador animado, temas claro/escuro persistentes, transições de navegação e reordenação GSAP Flip. Veja [Premium Motion](docs/premium-motion-release.md) para análise da referência, testes e limites.

Fuel: as estimativas nutricionais são sempre exibidas em todos os perfis, sem controle de mostrar/ocultar. A antiga preferência salva não altera a exibição. Essa mudança substitui a política de visualização opcional descrita nas entregas históricas; o compartilhamento com o Personal continua independente.

Novo: [cardio integrado ao Studio](docs/cardio-4.1-release.md), com biblioteca, editor de intervalos, aprovação/atribuição, cronômetro e histórico por aluno. O HTML independente continua sendo a forma direta de uso.

Organização atual: abra `../index.html` diretamente. Todos os fontes, recursos e ferramentas ficam nesta pasta `projeto`. Não é necessário iniciar servidor. O comando opcional `npm run build:portable`, executado aqui, atualiza o HTML na raiz. Os imports entre fontes e os caminhos de mídia dentro do projeto mantêm sua estrutura relativa.

Abra **index.html** com dois cliques para usar a versão portátil, sem npm ou servidor. Ela contém a entrada cinematográfica com o vídeo real fornecido, poster, fontes, sessão demonstrativa e os três ambientes. O arquivo pode ser copiado sozinho para outra pasta.

Os fontes foram restaurados para realizar as alterações solicitadas. `src/features/login.tsx` contém a entrada, `src/components/demo-session.tsx` o fluxo demonstrativo de sessão e `src/components/app-shell.tsx` os menus e o redirecionamento. `src/app/globals.css` reúne tokens e estilos. O HTML exportado contém código empacotado; a edição legível deve ser feita nos fontes.

## Manutenção opcional dos fontes

```powershell
npm.cmd ci
npm.cmd run dev
```

Acesse http://localhost:3000/entrar somente para manutenção com Next.js. Para gerar o HTML independente: `npm.cmd run build:portable`. Nenhum desses comandos é necessário para usar o `index.html` pronto.

## Studio e Fuel

O Personal acessa **MOVRA Studio**: questionário em seis etapas, geração determinística por regras versionadas, editor de dias/exercícios, comparação de regeneração, modelos, revisão e aprovação de versões, atribuição ao aluno correto. Contextos especiais seguem planejamento manual supervisionado; o gerador não é IA nem validação clínica.

O Aluno acessa **Alimentação / MOVRA Fuel**: refeições por data, quantidades, medidas específicas, edição/duplicação, favoritos, alimentos próprios, receitas com peso final informado e resumo exportável. Números nutricionais são opcionais e indisponíveis para menores; compartilhar com o Personal é uma escolha desativada por padrão e revogável. O catálogo inicial contém 17 alimentos USDA identificados, sem atribuição à TBCA.

Fichas, sessões, refeições e preferências são armazenadas localmente por identidade demonstrativa. Sair encerra a visualização; recarregar exige entrar novamente e conserva os dados. Para apagar, use **Meu perfil / Configurações → Redefinir dados demonstrativos**. O navegador precisa permitir armazenamento local; se negar, a interface informa que opera em memória. Copiar o HTML transporta o aplicativo e a mídia, não os registros salvos em outro navegador/caminho.

## Verificação

```powershell
npm.cmd run build
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
npm.cmd run test:portable
```

Testes de navegador usam Chrome instalado. A suíte Next.js utiliza o build de produção. A portátil abre uma cópia isolada do arquivo com rede desligada.

## Limites

Tudo é demonstrativo, com dados fictícios e armazenamento local sem segurança de produção. A entrada pede somente a seleção de perfil/identidade, com nome fictício opcional. Não há campos de e-mail/senha, cadastro de conta ou recuperação de acesso. Não há autenticação real, backend, Supabase, pagamentos ou IA. O consentimento alimentar limita a visualização do protótipo; não constitui controle de acesso seguro contra inspeção do navegador. Não inserir dados pessoais ou de saúde reais.

O vídeo está em `public/media/movra-hero.mp4`: versão H.264 silenciosa otimizada, com poster extraído do material original. Redução de movimento, economia de dados e conexões lentas usam o poster. Pausa funciona e a mídia para fora da tela. O original fornecido permanece intocado em Downloads.

Veja a [entrega MOVRA 3.0](docs/movra-3-release.md), [design e motion system](docs/design-implementation.md) e [uso portátil](docs/portable.md). Documentos das versões anteriores preservam o histórico; o comportamento atual de persistência é o descrito aqui.
