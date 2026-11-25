import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const portable = process.env.MOVRA_PORTABLE === '1';
let entry = '/entrar';
test.beforeAll(async () => {
  if (portable) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-cinema-'));
    const file = path.join(dir, 'index.html');
    await fs.copyFile('../index.html', file);
    entry = pathToFileURL(file).href + '#/entrar';
  }
});
async function login(page: Page, role = 'personal', name = 'Alex Demonstração') {
  await page.goto(entry);
  if (role === 'aluno')
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
  if (role === 'admin')
    await page.getByRole('button', { name: 'Visualizar operação administrativa' }).click();
  else {
    await page.getByLabel('Como podemos te chamar?').fill(name);
    await page.getByRole('button', { name: 'Entrar na demonstração' }).click();
  }
  await expect(page.locator('.app-shell')).toBeVisible();
}
async function logout(page: Page) {
  await page.getByRole('button', { name: 'Abrir menu do usuário' }).click();
  await page.getByRole('button', { name: 'Sair da demonstração' }).click();
  await expect(page.locator('#entry-form')).toBeVisible();
}
async function navigatePage(page: Page, label: string) {
  if ((page.viewportSize()?.width ?? 1280) < 1000) {
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: label, exact: true }).click();
  } else await page.locator('.desktop-sidebar').getByRole('link', { name: label, exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
}
async function changeRole(page: Page, role: 'personal' | 'aluno') {
  await page
    .locator('.topbar')
    .getByRole('button', { name: /^Conta de / })
    .click();
  await page.getByRole('button', { name: 'Trocar perfil', exact: true }).click();
  await page
    .getByRole('button', {
      name: role === 'aluno' ? 'Aluno / atleta' : 'Personal trainer',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
}
test('vídeo real, poster, pausa e entrada sem credenciais', async ({ page }) => {
  await page.goto(entry);
  await expect(page.locator('#entry-heading')).toBeVisible();
  const video = page.locator('video');
  await expect(video).toHaveCount(1);
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThan(1);
  expect(
    await video.evaluate(
      (element: HTMLVideoElement) => element.muted && element.loop && element.playsInline,
    ),
  ).toBe(true);
  const pause = page.getByRole('button', { name: 'Pausar vídeo', exact: true });
  await expect(pause).toBeVisible();
  await pause.click();
  expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await page.getByRole('button', { name: 'Reproduzir vídeo', exact: true }).click();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(false);
  await expect(page.locator('input[type=password], input[type=email]')).toHaveCount(0);
  expect(
    await page.locator('.entry-scene').evaluate((e) => getComputedStyle(e).backgroundImage),
  ).toContain(portable ? 'data:image' : 'movra-hero-poster');
});
for (const role of ['personal', 'aluno', 'admin'])
  test(`navegação completa do ambiente ${role}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await login(page, role);
    const links = await page.locator('.desktop-sidebar .sidebar-nav a').evaluateAll((items) =>
      items.map((a) => ({
        text: a.getAttribute('aria-label') ?? '',
        href: a.getAttribute('href'),
      })),
    );
    for (const link of links) {
      await page
        .locator('.desktop-sidebar')
        .getByRole('link', { name: link.text, exact: true })
        .click();
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('.app-shell')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
test('identidade dinâmica, logout encerra visualização sem apagar registros e troca de perfil', async ({
  page,
}) => {
  await login(page, 'personal', 'João Fictício');
  await expect(page.locator('main h1')).toHaveText('Bom dia, João.');
  await page.getByRole('link', { name: 'Alunos', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar aluno', exact: true }).click();
  await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa Temporária');
  await page.getByLabel('E-mail fictício').fill('temp@example.com');
  await page.getByLabel('Objetivo do acompanhamento').fill('Teste de sessão');
  await page.getByRole('button', { name: 'Adicionar aluno na prévia' }).click();
  await expect(page.getByText('Pessoa Temporária', { exact: true })).toBeVisible();
  await logout(page);
  await login(page);
  await page.getByRole('link', { name: 'Alunos', exact: true }).click();
  await expect(page.getByText('Pessoa Temporária', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menu do usuário' }).click();
  await page.getByRole('button', { name: 'Trocar perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
  await page.getByLabel('Como podemos te chamar?').fill('Bia Atleta');
  await page.getByRole('button', { name: 'Entrar na demonstração' }).click();
  await expect(page.locator('main h1')).toHaveText('Olá, Bia.');
});
test('rotas diretas sem sessão voltam para entrada', async ({ page }) => {
  await page.goto(portable ? entry.replace('#/entrar', '#/personal/alunos') : '/personal/alunos');
  await expect(page.locator('#entry-form')).toBeVisible();
});
test('treino mantém séries, feedback e histórico', async ({ page }) => {
  await login(page, 'aluno');
  await page.getByRole('link', { name: 'Começar meu treino' }).click();
  await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  for (const check of await page.locator('.set-check input').all()) await check.check();
  await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Seu treino foi registrado na prévia.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Revisar histórico' }).click();
  await expect(page.locator('.history-row')).toHaveCount(4);
});
test('retoma as séries e soma apenas o tempo ativo após sair da ficha', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page, 'aluno');
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00Z'));
  await page.getByRole('link', { name: 'Começar meu treino' }).click();
  await page.locator('.set-check input').first().check();
  const sessionUrl = page.url();
  await page.clock.setFixedTime(new Date('2026-11-12T12:02:00Z'));
  await page.getByRole('button', { name: 'Pausar sessão', exact: true }).click();
  await navigatePage(page, 'Meus treinos');
    await page.getByRole('button',{name:'Histórico',exact:true}).click();
  await page.clock.setFixedTime(new Date('2026-11-12T15:00:00Z'));
  await page.goBack();
  await expect(page).toHaveURL(sessionUrl);
  await expect(page.locator('.set-check input').first()).toBeChecked();
  for (const check of await page.locator('.set-check input').all()) await check.check();
  await page.clock.setFixedTime(new Date('2026-11-12T15:01:00Z'));
  await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
  await expect(page.locator('.completion')).toContainText('3 min.');
});

test('responsividade e teclado em entrada e formulário', async ({ page }) => {
  for (const width of [360, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(entry);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.entry-finale').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Experimentar a MOVRA' }).click();
    await expect(page.locator('#demo-name')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.keyboard.type('Alex Teste');
  await page.keyboard.press('Enter');
  await expect(page.locator('.app-shell')).toBeVisible();
});
test('movimento reduzido, scroll e contraste automatizado', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(entry);
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.locator('.entry-finale').scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Experimentar a MOVRA' })).toBeVisible();
});
test('capturas de revisão desktop, mobile e scroll', async ({ page }) => {
  await page.goto(entry);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/cinema-desktop.png' });
  await page.locator('.product-board').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/cinema-scroll.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(entry);
  await page.screenshot({ path: 'test-results/cinema-mobile.png', fullPage: true });
});

test('editor: busca, carga, modelo, reordenação, prévia e duplicação', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Treinos', exact: true }).click();
  await page.getByRole('link', { name: 'Criar treino', exact: true }).click();
  await page.getByLabel('Reutilizar uma ficha como modelo').selectOption('treino-b');
  await expect(page.locator('.exercise-editor')).toHaveCount(2);
  await page.getByRole('button', { name: 'Mover exercício 2 para cima' }).click();
  await expect(page.locator('.exercise-editor').first()).toContainText('Supino');
  await page.getByRole('button', { name: 'Remover exercício 2' }).click();
  await page.getByLabel('Nome do treino', { exact: true }).fill('Ficha premium validada');
  await page.getByLabel('Aluno', { exact: true }).selectOption('ana');
  await page.getByLabel('Pesquisar exercícios').fill('ponte');
  await page.getByLabel('Grupo muscular', { exact: true }).selectOption('Membros inferiores');
  await page.getByLabel('Adicionar exercício da biblioteca').selectOption('ponte');
  await expect(page.locator('.exercise-editor')).toHaveCount(2);
  await page.locator('#load-0').fill('12.5');
  await page.getByRole('button', { name: 'Revisar treino antes de atribuir' }).click();
  await expect(page.getByRole('dialog')).toContainText('12.5 kg');
  await page.getByRole('button', { name: 'Confirmar atribuição na prévia' }).click();
  await expect(page.locator('main').getByRole('status')).toContainText('Treino atualizado');
  await page.getByRole('link', { name: 'Voltar aos treinos' }).click();
  const card = page
    .locator('.workout-card')
    .filter({ has: page.getByRole('heading', { name: 'Ficha premium validada', exact: true }) });
  await card.getByRole('button', { name: 'Duplicar treino' }).click();
  await expect(
    page.getByRole('heading', { name: 'Ficha premium validada (cópia)', exact: true }),
  ).toBeVisible();
});
test('entrada opcional usa o perfil ficticio selecionado', async ({ page }) => {
  await page.goto(entry);
  await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
  await expect(page.locator('.entry-profile-preview')).toContainText('Ana Costa');
  await expect(page.locator('input[type=password],input[type=email]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Entrar na demonstra\u00e7\u00e3o' }).click();
  await expect(page.locator('main h1')).toHaveText('Ol\u00e1, Ana.');
});

test('economia de dados preserva o formulário sem baixar vídeo', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true, effectiveType: '2g' },
    });
  });
  await page.goto(entry);
  await expect(page.locator('#entry-form')).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
});

test('falha de mídia mantém poster e entrada funcional', async ({ page }) => {
  await page.goto(entry);
  await page.locator('video').dispatchEvent('error');
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.getByText('Não foi possível carregar o vídeo · exibindo poster')).toBeVisible();
  await page.getByRole('button', { name: 'Entrar na demonstração' }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
});

test('autoplay bloqueado aguarda decisão do usuário', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
  });
  await page.goto(entry);
  await expect(page.locator('video')).not.toHaveClass(/is-ready/);
  await expect(page.locator('#entry-form')).toBeVisible();
  await page.getByRole('button', { name: 'Entrar na demonstração' }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
});

for (const role of ['personal', 'aluno', 'admin'])
  test(`acessibilidade e responsividade das páginas de ${role}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page, role);
    const names = await page
      .locator('.desktop-sidebar .sidebar-nav a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('aria-label')!));
    for (const name of names) {
      await page.locator('.desktop-sidebar').getByRole('link', { name, exact: true }).click();
      await expect(page.locator('main h1')).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        result.violations.map(({ id, nodes }) => ({ id, elements: nodes.map((n) => n.target) })),
      ).toEqual([]);
      for (const width of [360, 768, 1280, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await expect(page.locator('main h1')).toBeVisible();
      }
    }
  });

test('descanso prescrito, carga anterior e avanço por teclado', async ({ page }) => {
  await login(page, 'aluno');
  await page.setViewportSize({ width: 360, height: 900 });
  await page.getByRole('link', { name: 'Começar meu treino' }).click();
  await expect(page.locator('.previous-load').first()).toContainText('Último registro');
  await page.getByRole('button', { name: 'Descansar 60s', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Pausar descanso' })).toBeVisible();
  await page.getByRole('button', { name: 'Pausar descanso' }).click();
  await expect(page.getByRole('button', { name: 'Iniciar descanso de 60 segundos' })).toBeVisible();
  await page.getByRole('button', { name: 'Próximo exercício' }).first().click();
  await expect(page.locator('.session-exercise').nth(1)).toBeFocused();
  await page.locator('.set-check input').first().check();
  await expect(page.locator('.set-complete')).toHaveCount(1);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  await page.getByRole('button', { name: 'Conta de Alex Demonstração', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('sem autenticação real');
  await page.getByRole('button', { name: 'Sair da demonstração' }).click();
  await expect(page.locator('#entry-form')).toBeVisible();
});
test('vídeo para fora da tela e é removido ao entrar no painel', async ({ page }) => {
  await page.goto(entry);
  const video = page.locator('video');
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThan(1);
  await page.getByRole('link', { name: 'Conheça a experiência' }).click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await page.getByRole('button', { name: 'Experimentar a MOVRA' }).click();
  await page.getByLabel('Como podemos te chamar?').fill('Alex Vídeo');
  await page.getByRole('button', { name: 'Entrar na demonstração' }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
});

for (const width of [390, 1280]) {
  test(`ficha atribuída, execução e acompanhamento entre perfis em ${width}px`, async ({
    page,
  }) => {
    await login(page, 'personal', 'Aline Exemplo');
    await page.setViewportSize({ width, height: 900 });
    await navigatePage(page, 'Treinos');
    await page.getByRole('link', { name: 'Criar treino', exact: true }).click();
    await page.getByLabel('Reutilizar uma ficha como modelo').selectOption('treino-b');
    await page.getByLabel('Nome do treino', { exact: true }).fill('Ficha conectada');
    await page.getByLabel('Aluno', { exact: true }).selectOption('ana');
    await page.locator('#load-0').fill('17.5');
    await page.getByRole('button', { name: 'Revisar treino antes de atribuir' }).click();
    await page.getByRole('button', { name: 'Confirmar atribuição na prévia' }).click();
    await expect(page.locator('main').getByRole('status')).toContainText('Treino atualizado');
    await changeRole(page, 'aluno');
    await expect(page.locator('main h1')).toHaveText('Olá, Ana.');
    await navigatePage(page, 'Meus treinos');
    await page
      .locator('.workout-card')
      .filter({ has: page.getByRole('heading', { name: 'Ficha conectada', exact: true }) })
      .getByRole('link', { name: 'Iniciar treino' })
      .click();
    await expect(page.locator('.set-row input[type=number]').first()).toHaveValue('17.5');
    for (const check of await page.locator('.set-check input').all()) await check.check();
    await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Seu treino foi registrado na prévia.' }),
    ).toBeFocused();
    await page.getByRole('link', { name: 'Revisar histórico' }).click();
    await expect(page.locator('.history-row').filter({ hasText: 'Ficha conectada' })).toBeVisible();
    await changeRole(page, 'personal');
    await expect(page.locator('main h1')).toHaveText('Bom dia, Aline.');
    await navigatePage(page, 'Alunos');
    await page.getByRole('link', { name: 'Abrir perfil de Ana Costa' }).click();
    await expect(page.locator('main')).toContainText('Ficha conectada');
  });

  test(`cadastro, conflito/cancelamento de agenda e evolução em ${width}px`, async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width, height: 900 });
    await navigatePage(page, 'Alunos');
    await page.getByRole('button', { name: 'Adicionar aluno', exact: true }).click();
    await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa Exemplo');
    await page.getByLabel('E-mail fictício').fill('novo@example.com');
    await page.getByLabel('Objetivo do acompanhamento').fill('Consistência semanal');
    await page.getByRole('button', { name: 'Adicionar aluno na prévia' }).click();
    await expect(page.getByText('Pessoa Exemplo', { exact: true })).toBeVisible();
    await navigatePage(page, 'Agenda');
    await page.getByRole('button', { name: 'Agendar encontro' }).click();
    await page.getByLabel('Aluno', { exact: true }).selectOption('ana');
    await page.getByLabel('Horário', { exact: true }).fill('09:30');
    await page.getByRole('button', { name: 'Agendar na prévia' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('conflita');
    await page.getByLabel('Horário', { exact: true }).fill('18:00');
    await page.getByRole('button', { name: 'Agendar na prévia' }).click();
    await expect(page.locator('main').getByRole('status').first()).toContainText(
      'Encontro adicionado',
    );
    await page
      .locator('.agenda-entry')
      .filter({ hasText: '18:00' })
      .getByRole('button', { name: 'Cancelar sessão' })
      .click();
    await page.getByRole('button', { name: 'Confirmar cancelamento' }).click();
    await expect(page.locator('main').getByRole('status').first()).toContainText(
      'Encontro cancelado',
    );
    await expect(page.locator('.agenda-entry').filter({ hasText: '18:00' })).toHaveCount(0);
    await navigatePage(page, 'Evolução física');
    await page.getByRole('button', { name: 'Registrar avaliação', exact: true }).click();
    await page.getByLabel('Peso (kg)', { exact: true }).fill('67.6');
    await page.getByLabel('Cintura (cm)', { exact: true }).fill('75');
    await page.getByRole('button', { name: 'Registrar na prévia' }).click();
    await expect(page.locator('main .form-success')).toContainText('Avaliação registrada');
    await changeRole(page, 'aluno');
    await navigatePage(page, 'Evolução');
    await expect(page.getByRole('cell', { name: '67,6', exact: true })).toBeVisible();
  });
}

test('registro rápido valida valores e cronômetro pausa sem perder tempo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page, 'aluno');
  await page.setViewportSize({ width: 360, height: 900 });
  await page.getByRole('link', { name: 'Começar meu treino' }).click();
  await page.locator('#kg-agachamento-1').fill('20.5');
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.locator('.session-timer-dock').evaluate((element) => {
        const box = element.getBoundingClientRect();
        return [...element.querySelectorAll('button')].every((button) => {
          const bounds = button.getBoundingClientRect();
          return bounds.left >= box.left && bounds.right <= box.right;
        });
      }),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 360, height: 900 });
  await page.locator('#reps-agachamento-1').fill('14');
  await page.getByRole('button', { name: 'Repetir primeira série', exact: true }).first().click();
  await expect(page.locator('#kg-agachamento-2')).toHaveValue('20.5');
  await expect(page.locator('#reps-agachamento-3')).toHaveValue('14');
  await page.locator('.set-check input').first().check();
  await page.locator('#kg-agachamento-1').fill('-1');
  await expect(page.locator('.set-check input').first()).not.toBeChecked();
  await expect(page.locator('#kg-agachamento-1')).toHaveAttribute('aria-invalid', 'true');
  await page.clock.install();
  await page.getByRole('button', { name: 'Descansar 60s', exact: true }).first().click();
  await page.clock.fastForward(2000);
  await page.getByRole('button', { name: 'Pausar descanso' }).click();
  await expect(page.getByRole('timer')).toHaveText('00:58');
  await page.getByRole('button', { name: 'Adicionar 15 segundos de descanso' }).click();
  await page.clock.fastForward(2000);
  await expect(page.getByRole('timer')).toHaveText('01:13');
  await page.screenshot({ path: 'test-results/sprint-mobile-timer.png' });
});
