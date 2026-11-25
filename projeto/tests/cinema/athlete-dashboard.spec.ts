import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('treino e companheiro funcionam no painel do aluno em quatro larguras', async ({
  page,
}, info) => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-companion-'));
  try {
    let entry = '/entrar';
    if (process.env.MOVRA_PORTABLE === '1') {
      const copy = path.join(folder, 'index.html');
      await fs.copyFile('../index.html', copy);
      entry = pathToFileURL(copy).href + '#/entrar';
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(entry);
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
    const start = page.getByRole('link', { name: 'Começar meu treino' });
    const art = page.locator('.habits-panel .companion-figure img').first();
    await expect
      .poll(() => art.evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBe(284);
    if (process.env.MOVRA_PORTABLE === '1')
      await expect(art).toHaveAttribute('src', /^data:image\/webp;base64,/);
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 820 });
      await expect(start).toBeInViewport();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      await expect(
        page.locator('.athlete-shortcuts').getByRole('link', { name: 'Conversas' }),
      ).toBeVisible();
      await page.screenshot({ path: info.outputPath('aluno-' + width + '.png') });
    }
    await start.click();
    await expect(page.getByRole('button', { name: 'Concluir treino', exact: true })).toBeVisible();
    await page.locator('.desktop-sidebar').getByRole('link', { name: 'Hoje', exact: true }).click();
    await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
    await page.getByText('Evolução e conquistas', { exact: true }).click();
    const habits = await new AxeBuilder({ page })
      .include('.habits-panel')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      habits.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    await page
      .locator('.athlete-shortcuts')
      .getByRole('link', { name: 'Meu personal', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Conecte-se ao seu personal' })).toBeVisible();
    const connect = await new AxeBuilder({ page })
      .include('.student-connect')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      connect.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});
