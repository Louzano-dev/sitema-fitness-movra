# MOVRA · entrada cinematográfica

> Registro histórico da entrega anterior, com poster sem vídeo. Foi substituído pela [entrega MOVRA 2.0](experience-2-release.md), que integra o vídeo real fornecido. Os resultados e pendências abaixo descrevem a versão anterior.

## Escopo e direção

Implementação nos fontes reais restaurados em `src`, com exportação portátil atualizada em `index.html`. A referência de login mencionada não estava anexada/disponível; a composição segue a descrição do briefing e deve ser comparada à referência quando ela for fornecida. Nenhuma fidelidade pixel a pixel é alegada.

Poster fotográfico original gerado com imagegen: atleta adulto com cordas, academia escura e luz lima. Não é uma captura da interface. Arquivo otimizado em `public/media/movra-login-poster.webp`, com imagem de origem preservada. Formulário, texto, controles, iluminação e cena são camadas independentes.

Sequência: entrada com poster e formulário → benefícios → painel ilustrativo → execução de séries → gráfico com tabela acessível → retorno ao formulário. GSAP ScrollTrigger aplica parallax à cena e à atmosfera e um único pin/scrub curto no painel. Sem captura de roda, aceleração de scroll ou animação do formulário. No mobile e com movimento reduzido, a leitura é linear, sem pin/parallax.

## Funciona

- Entrada com nome fictício e perfil Personal ou Aluno/Atleta; operação administrativa separada para preservar o módulo existente.
- Nome dinâmico no ambiente e no perfil, sem senha ou login social.
- Menu de usuário na navegação, sair e trocar perfil; ambos restauram as fixtures e encerram a sessão demonstrativa.
- Rotas internas sem sessão, ou de outro perfil, retornam à entrada. Essa é apenas uma regra de navegação do frontend, não autorização ou segurança.
- Os módulos anteriores continuam disponíveis; registro de séries e histórico preservados durante a sessão. Os dados são apagados ao sair/recarregar.
- HTML portátil com poster, fontes, scripts e estilos embutidos. Licenças ficam em metadados, sem blocos técnicos visíveis. Fontes React editáveis continuam em `src`.

## Mídia pendente

**Nenhum vídeo foi gerado ou fornecido.** O poster é estático e a interface informa a pendência. Não há botão de play/pausa quando não existe vídeo disponível.

Adicionar um MP4 válido em `public/media/movra-login.mp4` e iniciar/recompilar o projeto. `scripts/prepare-media.mjs`, executado por predev/prebuild e pela exportação portátil, detecta o arquivo real. O vídeo é configurado com muted, loop, playsInline, autoplay e preload metadata; só mostra controle quando pode reproduzir, pausa fora da tela e mantém poster em falha. Movimento reduzido, economia de dados e conexões 2G/3G mantêm o poster. Na exportação portátil o vídeo também é embutido, aumentando o tamanho do HTML.

O caminho de reprodução real depende do MP4 pendente; não foi validado com footage final. Não há backend, Supabase, pagamento ou autenticação real.

## Validação

Build Next.js, TypeScript, lint e 14 testes de regras aprovados. A suíte `tests/cinema` cobre poster sem vídeo, ausência de senha/controles falsos, navegação Personal/Aluno/Admin, identidade dinâmica, logout com limpeza, troca de perfil, entrada por rota direta, execução e histórico, 320/390/768/1440 px, teclado e retorno ao formulário, movimento reduzido e axe sem violações na entrada. Capturas em `test-results/cinema-*.png` revisadas visualmente.

As suítes históricas de `tests/e2e` e `tests/portable` antecedem a exigência de sessão e são referência; os comandos atuais apontam para `tests/cinema`. A suíte atual roda tanto no Next.js quanto na cópia isolada do HTML offline.

Não foram feitos testes manuais com leitor de tela, dispositivos físicos, performance de vídeo real ou certificação WCAG integral. Foram verificados apenas os comportamentos automatizados e estados visuais descritos.
