import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'docs/evidence');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const observations = [];
try {
  for (const width of [360, 768, 1280, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, offline: true });
    const page = await context.newPage();
    const errors = [];
    const external = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) external.push(request.url());
    });
    await page.goto(pathToFileURL(path.resolve(root, '../index.html')).href + '#/entrar');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    await page.locator('video').evaluate((video) => {
      video.pause();
      video.currentTime = 5;
    });
    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const box = document.querySelector(selector).getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom };
      };
      return {
        viewport: `${innerWidth}x${innerHeight}`,
        overflow: document.documentElement.scrollWidth > innerWidth,
        hero: rect('.entry-hero'),
        form: rect('.entry-form'),
        submit: rect('.entry-submit'),
        pinCount: document.querySelectorAll('.pin-spacer').length,
      };
    });
    await page.screenshot({ path: path.join(output, `entry-${width}.png`) });
    await page.locator('.product-story').scrollIntoViewIfNeeded();
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(output, `creation-${width}.png`) });
    await page.locator('.entry-finale').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Experimentar a MOVRA' }).click();
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    await page.getByRole('button', { name: 'Experimentar sem preencher' }).click();
    await page.getByRole('link', { name: 'Começar meu treino' }).click();
    await page.screenshot({ path: path.join(output, `workout-${width}.png`) });
    observations.push({ ...layout, errors, external });
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    offline: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(path.resolve(root, '../index.html')).href + '#/entrar');
  await page.getByRole('button', { name: 'Experimentar sem preencher' }).click();
  await page.getByRole('link', { name: 'Alunos', exact: true }).click();
  await page.getByLabel('Buscar aluno').fill('sem-resultados-000');
  await expect(page.getByRole('heading', { name: 'Nenhum resultado por aqui.' })).toBeVisible();
  await page.screenshot({ path: path.join(output, 'empty-filter.png') });
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.getByRole('link', { name: 'Abrir perfil de Ana Costa' })).toBeVisible();
  await page.getByRole('link', { name: 'Abrir perfil de Felipe Rocha' }).click();
  await expect(page.locator('main h1')).toBeVisible();
  await page.screenshot({ path: path.join(output, 'partial-student.png') });
  await context.close();
} finally {
  await browser.close();
}
await fs.writeFile(
  path.join(output, 'layout-observations.json'),
  JSON.stringify(observations, null, 2),
);
console.log(JSON.stringify(observations, null, 2));
if (observations.some((item) => item.overflow || item.errors.length || item.external.length))
  process.exitCode = 1;
