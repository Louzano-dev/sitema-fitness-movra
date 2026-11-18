import { chromium, test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('Páginas principais permitem navegar com 320 CSS px', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 320, height: 850 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const student of [false, true]) {
    await enter(page, student);
    const labels = student
      ? ['Hoje', 'Meus treinos', 'Histórico', 'Evolução', 'Alimentação', 'Agenda', 'Meu perfil']
      : [
          'Visão geral',
          'Alunos',
          'Treinos',
          'MOVRA Studio',
          'Exercícios',
          'Evolução física',
          'Agenda',
          'Alimentação',
          'Configurações',
        ];
    for (const label of labels) {
      await test.step(label, async () => {
        await navigate(page, label);
        await checkWidth(page);
      });
    }
  }
});

let entry = '/entrar';
let folder: string | undefined;
test.beforeAll(async () => {
  if (process.env.MOVRA_PORTABLE === '1') {
    folder = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-universal-'));
    await fs.copyFile('../index.html', path.join(folder, 'index.html'));
    entry = pathToFileURL(path.join(folder, 'index.html')).href + '#/entrar';
  }
});
test.afterAll(async () => {
  if (folder) await fs.rm(folder, { recursive: true });
});
async function enter(page: Page, student = false) {
  await page.goto(entry);
  if (student) await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
  await page.locator('.entry-submit').click();
  await expect(page.locator('main h1')).toBeVisible();
}
async function navigate(page: Page, name: string) {
  const mobile = (page.viewportSize()?.width ?? 1440) < 1000;
  if (mobile) await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page
    .locator(mobile ? '.mobile-drawer' : '.desktop-sidebar')
    .getByRole('link', { name, exact: true })
    .click();
  await expect(page.locator('main h1')).toBeVisible();
}
async function checkWidth(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1);
}
test('Modo guiado acompanha cadastro, edição, correção e retorno por teclado', async ({ page }) => {
  test.setTimeout(100000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page);
  const toggle = page.getByRole('button', { name: 'Modo guiado' });
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Dispensar dica' }).click();
  await navigate(page, 'Alunos');
  await page.getByRole('button', { name: 'Adicionar aluno', exact: true }).click();
  await page.getByLabel('Nome completo').fill('Pessoa Guia');
  await page.getByLabel('E-mail fictício').fill('pessoa.guia@example.com');
  await page.getByLabel('Objetivo do acompanhamento').fill('Aprender os movimentos');
  await page.getByRole('button', { name: 'Adicionar aluno na prévia' }).click();
  await navigate(page, 'MOVRA Studio');
  await page.getByRole('button', { name: 'Criar treino', exact: true }).click();
  await page.getByRole('button', { name: 'Criar treino do zero', exact: true }).click();
  await page.getByLabel('Atribuir ao aluno').selectOption({ label: 'Pessoa Guia' });
  await page.getByLabel('Nome da ficha').fill('Treino guiado');
  await page.getByRole('button', { name: 'Adicionar exercícios', exact: true }).click();
  await page.getByLabel('Adicionar exercício', { exact: true }).selectOption('abdominal');
  await page.getByRole('button', { name: 'Adicionar ao dia', exact: true }).click();
  await page.getByRole('button', { name: 'Voltar à ficha', exact: true }).click();
  await toggle.click();
  await expect(page.getByLabel('Nome da ficha')).toHaveValue('Treino guiado');
  await toggle.click();
  await page.getByRole('button', { name: 'Remover exercício', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.studio-exercise')).toHaveCount(1);
  await page.getByRole('button', { name: 'Minhas fichas', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Sair da ficha');
  await page.getByRole('button', { name: 'Continuar editando' }).press('Enter');
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await page.getByRole('button', { name: 'Marcar aguardando revisão', exact: true }).click();
  await page.getByRole('button', { name: 'Minhas fichas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Treino guiado' })).toBeVisible();
  await navigate(page, 'Visão geral');
  await page.getByRole('link', { name: '1 ficha aguardando revisão' }).click();
  await expect(page.getByLabel('Somente fichas aguardando revisão')).toBeChecked();
  await expect(page.getByRole('heading', { name: 'Treino guiado' })).toBeVisible();
  await enter(page);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.guide-hint')).toHaveCount(0);
  await navigate(page, 'MOVRA Studio');
  await page.getByRole('button', { name: 'Criar treino', exact: true }).click();
  await page.getByRole('button', { name: 'Gerar treino personalizado' }).click();
  await page.getByRole('button', { name: 'Etapa 3: Dias' }).click();
  await page.getByLabel('Dias por semana').selectOption('2');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('#studio-days')).toBeFocused();
  await expect(page.locator('#studio-days-error')).toContainText('Selecione 2 dias');
  await page.getByLabel('Sexta', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Equipamentos', exact: true })).toBeFocused();
});
test('Fuel registra dois itens na mesma refeição e respeita a preferência do adulto', async ({
  page,
}) => {
  await enter(page, true);
  await navigate(page, 'Alimentação');
  await page.getByRole('button', { name: 'Adicionar alimento', exact: true }).click();
  await page.getByLabel('Buscar alimento').fill('arroz');
  await page.getByLabel('Alimento da biblioteca').selectOption('usda-168878');
  await page.getByRole('button', { name: 'Registrar e adicionar outro' }).click();
  await expect(page.getByLabel('Buscar alimento')).toBeFocused();
  await page.getByLabel('Buscar alimento').fill('feijao');
  await page.getByLabel('Alimento da biblioteca').selectOption({ index: 0 });
  await page.getByRole('button', { name: 'Registrar alimento', exact: true }).click();
  await expect(page.locator('.meal-card')).toHaveCount(1);
  await expect(page.locator('.food-row')).toHaveCount(2);
  await navigate(page, 'Meu perfil');
  await page.getByLabel('Exibir estimativas numéricas no meu diário').uncheck();
  await navigate(page, 'Alimentação');
  await expect(page.locator('.nutrition-numbers')).toHaveCount(0);
  await expect(page.locator('.food-row')).toHaveCount(2);
});
test('Reflow, teclado e registro com texto ampliado', async ({ page }) => {
  test.setTimeout(100000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 850 });
  await enter(page);
  for (const width of [320, 360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await checkWidth(page);
  }
  await page.setViewportSize({ width: 320, height: 850 });
  await navigate(page, 'MOVRA Studio');
  await checkWidth(page);
  await page.getByRole('button', { name: 'Criar treino', exact: true }).click();
  await page.getByRole('button', { name: 'Gerar treino personalizado' }).click();
  await checkWidth(page);
  await enter(page, true);
  await page.getByRole('link', { name: 'Começar meu treino' }).click();
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await checkWidth(page);
  await expect(page.locator('.session-exercise h2').first()).toBeVisible();
  const check = page.locator('.set-check input').first();
  await check.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.set-complete').first()).toContainText('Registrada');
  await page.getByRole('button', { name: 'Próximo exercício' }).first().press('Enter');
  await expect(page.locator('.session-exercise').nth(1)).toBeFocused();
  for (const box of await page
    .locator('.set-check')
    .first()
    .evaluateAll((labels) => labels.map((el) => el.getBoundingClientRect().toJSON()))) {
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations.map((v) => [v.id, v.nodes.map((n) => n.target)])).toEqual([]);
});

test('Zoom real de 200% no Chrome preserva o acesso à navegação e ao diário', async () => {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chrome',
    viewport: null,
    offline: process.env.MOVRA_PORTABLE === '1',
    baseURL: process.env.MOVRA_PORTABLE === '1' ? undefined : 'http://localhost:3000',
    args: ['--window-size=1440,900'],
  });
  try {
    // A preferência do Chrome vale somente para este perfil temporário.
    const settings = await context.newPage();
    await settings.goto('chrome://settings/appearance');
    await settings.evaluate(async () => {
      const { settingsPrivate } = (
        window as unknown as {
          chrome: { settingsPrivate: { setDefaultZoom(factor: number): Promise<void> } };
        }
      ).chrome;
      await settingsPrivate.setDefaultZoom(2);
    });
    await settings.close();
    const page = context.pages()[0];
    await enter(page, true);
    expect(await page.evaluate(() => outerWidth / innerWidth)).toBeCloseTo(2, 1);
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Alimentação', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar alimento', exact: true }).click();
    await page.getByLabel('Buscar alimento').fill('arroz');
    await page.getByLabel('Alimento da biblioteca').selectOption('usda-168878');
    await checkWidth(page);
    await page.getByRole('button', { name: 'Registrar alimento', exact: true }).click();
    await expect(page.locator('.food-row')).toHaveCount(1);
  } finally {
    await context.close();
  }
});
