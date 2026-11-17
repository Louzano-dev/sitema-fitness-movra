# MOVRA · sprint de refinamento premium

Registro da versão anterior à MOVRA 3.0. Resultados abaixo descrevem aquele sprint. Studio, Fuel, persistência após logout e validações atuais estão em [movra-3-release.md](movra-3-release.md); a redefinição dos dados agora é explícita em Configurações/Meu perfil.

## Inspeção e decisões

Preservados os fontes React/Next.js, camada mock tipada, componentes, marca, vídeo e exportação independente. Skills selecionadas: gsap-performance e frontend-a11y. Revisão dos componentes de entrada, sessão, navegação, gráficos, formulários, treino, agenda e repositório; capturas em quatro larguras.

Problemas encontrados e corrigidos:

- Entrada simulava uma estrutura de conta com senha de amostra, e-mail, criação e recuperação. Agora apenas perfil e nome fictício opcional; os perfis padrão correspondem aos próprios dados mockados.
- Trocar perfil apagava a ficha, impedindo testar o ciclo personal/aluno. A troca preserva dados em memória; sair/recarregar restaura tudo. Nenhuma autorização de produção é simulada.
- Nome do personal podia divergir do responsável da organização. Os dois agora são atualizados juntos no mock; o nome do aluno já sincroniza com sua ficha.
- Menu móvel abria deslocado para fora da tela por herdar translação de diálogo centralizado. Classes e layout corrigidos tanto no Next quanto no HTML portátil; novos testes exercitam o drawer e os fluxos móveis.
- Cronômetro só aparecia ao fim da longa lista no celular. Agora fica acima das séries e acompanha a rolagem; controles cabem também no tablet. Pausa mantém segundos restantes, ajuste de 15 s não reinicia a contagem, pular encerra.
- Registrar séries exigia repetir digitação e permitia marcar valores inválidos. Adicionado repetir primeira série nas próximas em aberto, validação por campo, bloqueio de marcação inválida e nova confirmação ao editar uma série concluída.
- Cancelar agenda removia a linha sem confirmação visível de resultado. Agora há mensagem de cancelamento e liberação do horário.
- Timeline de abertura e parallax disputavam escala da cena. A abertura atua sobre vídeo, parallax sobre poster. Gráficos, páginas e feedback usam movimentos curtos, com redução de movimento e cleanup.
- Erros de campos sem conexão acessível são associados por `Field`; foco de página e conclusão, margens contra obstrução, controles de toque e foco em superfícies escuras refinados.

## Validação e evidências

Resultado final: build, TypeScript e ESLint aprovados; 16 testes Vitest aprovados; 25 cenários Playwright aprovados no build Next.js e 25 no HTML isolado offline. Nenhuma violação axe nas páginas e estados auditados. As falhas intermediárias de posicionamento do drawer foram corrigidas; o seletor de feedback do teste foi restringido para distinguir a mensagem do formulário do tooltip acessível do Recharts.

Amostra de motion em Chrome headless 1280 × 900: 179 intervalos medidos, mediana de 7 ms e p95 de 7,2 ms, um intervalo acima de 50 ms e nenhum long task observado. Três ciclos de entrada/saída mantiveram um vídeo e um pin na entrada, zero nos painéis. Não é teste de bateria nem garantia de FPS em aparelhos físicos. As capturas revisadas incluem entrada, treino, drawer e painel do personal; sem overflow do documento ou requisições HTTP nas quatro larguras.

Os comandos e resultados finais estão registrados na entrega. Suíte `tests/cinema` ampliada para 25 cenários por distribuição: vídeo/pausa/fallback, três ambientes, perfil dinâmico, logout/reset, troca, navegação, teclado/axe, execução e histórico, editor com modelo/carga/prévia/duplicação, ciclo entre personal e aluno, cadastro, conflito/cancelamento de agenda, avaliação e cronômetro com relógio controlado. Os novos percursos de produto rodam em 390 e 1280 px; auditoria responsiva em 360/768/1280/1920 px.

Vitest acrescenta regressão da sincronização do personal/organização, totalizando 16 regras. Build, lint e typecheck fazem parte da verificação. HTML é copiado sozinho para pasta temporária e testado com rede desligada. Capturas atuais em `docs/evidence/`, amostra de motion em `motion-observations.json`; scripts `review-experience.mjs` e `measure-motion.mjs` permitem repetir a revisão.

## Limites

Tudo continua demonstrativo, sem servidor de dados, autenticação, pagamentos ou IA. A troca de perfil serve para inspecionar o mesmo estado em memória. Recarregar ou sair restaura os exemplos. O cronômetro reinicia ao abandonar a tela; o rascunho das séries permanece durante a navegação.

Pendências: dispositivos físicos e teclado virtual real, Safari/Firefox e leitores de tela. Axe não certifica conformidade WCAG integral; a amostra de motion headless não garante FPS ou consumo de bateria de aparelhos reais. O HTML de aproximadamente 7 MiB contém vídeo, fontes e aplicação completos; não exige servidor, mas carrega todos os bytes embutidos ao abrir.
