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
test('vídeo real, poster, pausa e senha de amostra não editável', async ({ page }) => {
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
  await expect(page.locator('#access-password')).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name: 'Mostrar senha de exemplo' }).click();
  await expect(page.locator('#access-password')).toHaveAttribute('type', 'text');
  expect(
    await page.locator('.entry-scene').evaluate((e) => getComputedStyle(e).backgroundImage),
  ).toContain(portable ? 'data:image' : 'movra-hero-poster');
});
for (const role of ['personal', 'aluno', 'admin'])
  test(`navegação completa do ambiente ${role}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await login(page, role);
    const links = await page
      .locator('.desktop-sidebar .sidebar-nav a')
      .evaluateAll((items) =>
        items.map((a) => ({ text: a.textContent?.trim() ?? '', href: a.getAttribute('href') })),
      );
    for (const link of links) {
      await page.locator('.desktop-sidebar .sidebar-nav a').filter({ hasText: link.text }).click();
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('.app-shell')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
test('identidade dinâmica, logout limpa alterações e troca de perfil', async ({ page }) => {
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
  await expect(page.getByText('Pessoa Temporária', { exact: true })).toHaveCount(0);
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
test('cadastro e recuperação são locais e não pedem senha real', async ({ page }) => {
  await page.goto(entry);
  await page.getByRole('button', { name: 'Recuperar acesso · protótipo' }).click();
  await page.getByRole('button', { name: 'Visualizar orientação de acesso' }).click();
  await expect(page.getByRole('dialog')).toContainText('Nenhum e-mail foi enviado');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Criar conta · protótipo' }).click();
  await page.getByLabel('Nome fictício do perfil').fill('Perfil Novo');
  await page.getByRole('button', { name: 'Criar e abrir demonstração' }).click();
  await expect(page.locator('main h1')).toHaveText('Bom dia, Perfil.');
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
  await page.getByRole('button', { name: 'Experimentar sem preencher' }).click();
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
  await page.getByRole('button', { name: 'Experimentar sem preencher' }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
});

for (const role of ['personal', 'aluno', 'admin'])
  test(`acessibilidade e responsividade das páginas de ${role}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page, role);
    const names = await page.locator('.desktop-sidebar .sidebar-nav a').allTextContents();
    for (const name of names) {
      await page
        .locator('.desktop-sidebar .sidebar-nav a')
        .filter({ hasText: name.trim() })
        .click();
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
