import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
let entry = '/entrar';
test.beforeAll(async () => {
  await fs.mkdir('docs/evidence-motion', { recursive: true });
  if (process.env.MOVRA_PORTABLE === '1') {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-motion-'));
    await fs.copyFile('../index.html', path.join(folder, 'index.html'));
    entry = pathToFileURL(path.join(folder, 'index.html')).href + '#/entrar';
  }
});
async function enter(page: Page) {
  await page.goto(entry);
  await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
}
test('Sidebar compacta, indicador, perfil e preferência persistente', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Recolher navegação', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/sidebar-compact/);
  await page.locator('.desktop-sidebar').getByRole('link', { name: 'Alunos', exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
  await page.getByRole('link', { name: 'Abrir perfil de Ana Costa', exact: true }).click();
  await expect(page.locator('main')).toContainText('Ana Costa');
  await page.reload();
  await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/sidebar-compact/);
  await page.screenshot({ animations: 'disabled', path: 'docs/evidence-motion/compact.png' });
  await page.getByRole('button', { name: 'Expandir navegação', exact: true }).click();
  await expect(page.locator('.app-shell')).not.toHaveClass(/sidebar-compact/);
});
test('Temas e responsividade em quatro larguras', async ({ page }) => {
  test.setTimeout(120000);
  await enter(page);
  for (const width of [390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      animations: 'disabled',
      path: `docs/evidence-motion/light-${width}.png`,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Ativar tema escuro', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-movra-theme', 'dark');
  for (const width of [390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      animations: 'disabled',
      path: `docs/evidence-motion/dark-${width}.png`,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.reload();
  await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-movra-theme', 'dark');
});
test('Movimento reduzido e navegação móvel por teclado', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 900 });
  await enter(page);
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'MOVRA Studio', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toContainText('Um plano. Muitas possibilidades.');
  await expect(page.locator('[role=dialog]')).toHaveCount(0);
});
