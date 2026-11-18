import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
let entry = '/entrar';
test.beforeAll(async () => {
  await fs.mkdir('docs/evidence-interactions', { recursive: true });
  if (process.env.MOVRA_PORTABLE === '1') {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-interactions-'));
    await fs.copyFile('../index.html', path.join(dir, 'index.html'));
    entry = pathToFileURL(path.join(dir, 'index.html')).href + '#/entrar';
  }
});
async function enter(page: Page, aluno = false) {
  await page.goto(entry);
  if (aluno) await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
  await page.locator('.entry-submit').click();
  await expect(page.locator('.app-shell')).toBeVisible();
}
async function captureGeometry(page: Page) {
  await page.evaluate(() => {
    const frames: number[][] = [];
    (window as unknown as { surfaceFrames: number[][] }).surfaceFrames = frames;
    const observer = new MutationObserver(() => {
      const el = document.querySelector<HTMLElement>('.shared-surface-clone');
      if (!el) return;
      observer.disconnect();
      function sample() {
        if (!el?.isConnected) return;
        const r = el.getBoundingClientRect();
        frames.push([r.x, r.y, r.width, r.height]);
        if (frames.length < 120) requestAnimationFrame(sample);
      }
      sample();
    });
    observer.observe(document.body, { childList: true });
  });
}
async function geometryChanged(page: Page) {
  await expect(page.locator('.shared-surface-clone')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const f = (window as unknown as { surfaceFrames: number[][] }).surfaceFrames ?? [];
        return f.length > 2 && f.some((r) => r.some((n, i) => Math.abs(n - f[0][i]) > 8));
      }),
    )
    .toBe(true);
}
test('Aluno/perfil e exercício/detalhes têm continuidade geométrica real', async ({ page }) => {
  await enter(page);
  await page.locator('.desktop-sidebar').getByRole('link', { name: 'Alunos', exact: true }).click();
  await captureGeometry(page);
  await page.getByRole('link', { name: 'Abrir perfil de Ana Costa', exact: true }).click();
  await expect(page.locator('.detail-hero')).toContainText('Ana Costa');
  await geometryChanged(page);
  await page
    .locator('.desktop-sidebar')
    .getByRole('link', { name: 'Treinos', exact: true })
    .click();
  await captureGeometry(page);
  await page.getByRole('link', { name: 'Editar treino', exact: true }).first().click();
  await expect(page.getByLabel('Nome do treino', { exact: true })).toBeVisible();
  await geometryChanged(page);
  await page
    .locator('.desktop-sidebar')
    .getByRole('link', { name: 'Exercícios', exact: true })
    .click();
  await captureGeometry(page);
  await page.getByRole('button', { name: 'Ver instruções', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await geometryChanged(page);
  await page.screenshot({
    path: 'docs/evidence-interactions/exercise-dialog.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(page.locator('.shared-surface-clone')).toHaveCount(0);
});
test('Fuel alimento/editor mantém geometria, cálculo e foco', async ({ page }) => {
  await enter(page, true);
  await page
    .locator('.desktop-sidebar')
    .getByRole('link', { name: 'Alimentação', exact: true })
    .click();
  await page.getByRole('button', { name: 'Adicionar alimento', exact: true }).click();
  await page.getByLabel('Alimento da biblioteca', { exact: true }).selectOption('usda-168878');
  await page.getByLabel('Quantidade', { exact: true }).fill('150');
  await page.getByRole('button', { name: 'Registrar alimento', exact: true }).click();
  await expect(page.locator('.stats-grid')).toContainText('195 kcal');
  await captureGeometry(page);
  await page
    .getByRole('button', { name: 'Editar Arroz branco cozido, grão longo', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await geometryChanged(page);
  await page.getByLabel('Quantidade', { exact: true }).fill('200');
  await page.getByRole('button', { name: 'Atualizar alimento', exact: true }).click();
  await expect(page.locator('.stats-grid')).toContainText('260 kcal');
  await expect(page.locator('.shared-surface-clone')).toHaveCount(0);
});
test('Dashboard assimétrico, filtros reais e quatro larguras sem overflow', async ({ page }) => {
  test.setTimeout(90000);
  await enter(page);
  await page.getByLabel('Período do gráfico').selectOption('30');
  await expect(page.locator('.chart-readout')).toContainText('30 dias');
  for (const width of [390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: `docs/evidence-interactions/dashboard-${width}.png`,
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(axe.violations).toEqual([]);
});
