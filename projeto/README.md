# MOVRA

Organização atual: abra `../index.html` diretamente. Todos os fontes, recursos e ferramentas ficam nesta pasta `projeto`. Não é necessário iniciar servidor. O comando opcional `npm run build:portable`, executado aqui, atualiza o HTML na raiz. Os imports entre fontes e os caminhos de mídia dentro do projeto mantêm sua estrutura relativa.

Abra **index.html** com dois cliques para usar a versão portátil, sem npm ou servidor. Ela contém a entrada cinematográfica com o vídeo real fornecido, poster, fontes, sessão demonstrativa e os três ambientes. O arquivo pode ser copiado sozinho para outra pasta.

Os fontes foram restaurados para realizar as alterações solicitadas. `src/features/login.tsx` contém a entrada, `src/components/demo-session.tsx` o fluxo demonstrativo de sessão e `src/components/app-shell.tsx` os menus e o redirecionamento. `src/app/globals.css` reúne tokens e estilos. O HTML exportado contém código empacotado; a edição legível deve ser feita nos fontes.

## Desenvolvimento

```powershell
npm.cmd ci
npm.cmd run dev
```

Acesse http://localhost:3000/entrar. Para gerar o HTML independente: `npm.cmd run build:portable`.

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

Tudo é demonstrativo, com dados fictícios e estado em memória. Sair, trocar perfil ou recarregar reinicia os dados. A senha de exemplo é fixa, não editável e não é enviada nem armazenada. Não há autenticação real, backend, Supabase, pagamentos ou IA.

O vídeo está em `public/media/movra-hero.mp4`: versão H.264 silenciosa otimizada, com poster extraído do material original. Redução de movimento, economia de dados e conexões lentas usam o poster. Pausa funciona e a mídia para fora da tela. O original fornecido permanece intocado em Downloads.

Veja [entrega MOVRA 2.0](docs/experience-2-release.md), [design e motion system](docs/design-implementation.md) e [uso portátil](docs/portable.md). As instruções de desenvolvimento são opcionais para manutenção dos fontes; não são necessárias para usar o HTML.
