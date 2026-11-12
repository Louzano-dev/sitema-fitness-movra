import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import AxeBuilder from '@axe-core/playwright';

let isolatedDirectory: string;
let fileUrl: string;
test.beforeAll(async () => {
  isolatedDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-single-file-'));
  const destination = path.join(isolatedDirectory, 'index.html');
  await fs.copyFile(path.resolve('../index.html'), destination);
  fileUrl = pathToFileURL(destination).href;
});
// A cópia isolada é intencionalmente mantida no temp para revisão manual.
const routes = [
  '/personal',
  '/personal/alunos',
  '/personal/alunos/ana',
  '/personal/treinos',
  '/personal/treinos/novo',
  '/personal/treinos/treino-a',
  '/personal/exercicios',
  '/personal/evolucao',
  '/personal/agenda',
  '/personal/configuracoes',
  '/aluno',
  '/aluno/treinos',
  '/aluno/treinos/treino-a',
  '/aluno/historico',
  '/aluno/evolucao',
  '/aluno/perfil',
  '/admin',
  '/admin/organizacoes',
  '/admin/planos',
  '/admin/assinaturas',
];
for (const route of routes)
  test(`arquivo isolado offline: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    const requests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) requests.push(request.url());
    });
    await page.goto(`${fileUrl}#${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Prévia funcional · dados em memória')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => document.fonts.check('400 14px Inter'))).toBe(true);
    expect(await fs.readdir(isolatedDirectory)).toEqual(['index.html']);
  });

test('treino criado pelo personal funciona no aluno sem servidor', async ({ page }) => {
  await page.goto(`${fileUrl}#/personal/treinos/novo`);
  await page.getByLabel('Nome do treino', { exact: true }).fill('Treino portátil');
  await page.getByLabel('Aluno', { exact: true }).selectOption('ana');
  await page.getByLabel('Adicionar exercício da biblioteca').selectOption('remada');
  await page.getByLabel('Séries', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Salvar treino na prévia' }).click();
  await expect(page.locator('main').getByRole('status')).toContainText('Treino atualizado');
  await page.getByLabel('Trocar ambiente demonstrativo').selectOption('aluno');
  await page.getByRole('link', { name: 'Meus treinos', exact: true }).click();
  const card = page
    .locator('section.workout-card')
    .filter({ has: page.getByRole('heading', { name: 'Treino portátil' }) });
  await card.getByRole('link', { name: 'Iniciar treino' }).click();
  await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('todas as séries');
  await page.getByLabel('Carga em kg, Remada baixa, série 1', { exact: true }).fill('22.5');
  await page.getByLabel('Concluir Remada baixa, série 1', { exact: true }).check();
  await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Seu treino foi registrado na prévia.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Revisar histórico' }).click();
  await page.getByRole('button', { name: /Ver registro de Treino portátil/ }).click();
  await expect(page.getByRole('dialog')).toContainText('22.5');
  await page.keyboard.press('Escape');
  await page.getByLabel('Trocar ambiente demonstrativo').selectOption('personal');
  await page.getByRole('link', { name: 'Alunos', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir perfil de Ana Costa' }).click();
  await expect(page.getByRole('heading', { name: 'Treino portátil' }).last()).toBeVisible();
});

test('cadastro, busca e edição de aluno no arquivo', async ({ page }) => {
  await page.goto(`${fileUrl}#/personal/alunos`);
  await page.getByRole('button', { name: 'Adicionar aluno', exact: true }).click();
  await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa Portátil');
  await page.getByLabel('E-mail fictício').fill('portatil@example.com');
  await page.getByLabel('Objetivo do acompanhamento').fill('Validar o arquivo independente');
  await page.getByRole('button', { name: 'Adicionar aluno na prévia' }).click();
  await page.getByLabel('Buscar aluno', { exact: true }).fill('portátil');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: 'Abrir perfil de Pessoa Portátil' }).click();
  await page.getByRole('button', { name: 'Editar aluno' }).click();
  await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa Atualizada');
  await page.getByRole('button', { name: 'Atualizar aluno na prévia' }).click();
  await expect(page.getByRole('heading', { name: 'Pessoa Atualizada', exact: true })).toBeVisible();
});

test('agenda detecta conflito e cancela encontro', async ({ page }) => {
  await page.goto(`${fileUrl}#/personal/agenda`);
  await page.getByRole('button', { name: 'Agendar encontro' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Aluno', { exact: true }).selectOption('ana');
  await dialog.getByLabel('Horário', { exact: true }).fill('09:30');
  await dialog.getByRole('button', { name: 'Agendar na prévia' }).click();
  await expect(dialog.getByRole('alert')).toContainText('conflita');
  await dialog.getByLabel('Horário', { exact: true }).fill('16:00');
  await dialog.getByRole('button', { name: 'Agendar na prévia' }).click();
  const row = page.locator('.agenda-entry').filter({ hasText: '16:00' });
  await row.getByRole('button', { name: 'Cancelar sessão' }).click();
  await page.getByRole('button', { name: 'Confirmar cancelamento' }).click();
  await expect(row).toHaveCount(0);
});

test('admin mantém organização e assinatura sincronizadas', async ({ page }) => {
  await page.goto(`${fileUrl}#/admin/organizacoes`);
  await page.getByRole('button', { name: 'Gerenciar Estúdio Horizonte' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Plano', { exact: true }).selectOption('essencial');
  await dialog.getByLabel('Situação', { exact: true }).selectOption('Pausada');
  await dialog.getByRole('button', { name: 'Confirmar alteração simulada' }).click();
  await expect(dialog.getByRole('status')).toContainText('Nenhuma cobrança');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Assinaturas', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: 'Estúdio Horizonte' });
  await expect(row).toContainText('Essencial');
  await expect(row).toContainText('Pausada');
});

test('arquivo abre por duplo clique, navega para trás e respeita movimento reduzido', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fileUrl);
  await expect(page.locator('main h1')).toHaveText('Bom dia, Marina.');
  await page.getByRole('link', { name: 'Alunos', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Cada pessoa, um percurso.');
  await page.goBack();
  await expect(page.locator('main h1')).toHaveText('Bom dia, Marina.');
  await page.getByRole('link', { name: 'Pular para o conteúdo' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main h1')).toHaveText('Bom dia, Marina.');
});

test('responsividade, menu móvel e acessibilidade offline', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/personal', '/aluno', '/admin/organizacoes']) {
      await page.goto(`${fileUrl}#${route}`);
      await expect(page.locator('main h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route}: ${width}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fileUrl}#/aluno`);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  const menu = page.getByRole('button', { name: 'Abrir menu' });
  await menu.click();
  await page
    .getByRole('dialog')
    .getByLabel('Trocar ambiente demonstrativo')
    .selectOption('personal');
  await expect(page.locator('main h1')).toHaveText('Bom dia, Marina.');
  await page.screenshot({ path: 'test-results-portable/mobile.png', fullPage: false });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results-portable/desktop.png', fullPage: false });
});
