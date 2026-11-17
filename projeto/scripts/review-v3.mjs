import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'docs/evidence-v3');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const observations = [];
async function navigate(page, label, width) {
  if (width < 1000) {
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: label, exact: true }).click();
  } else
    await page.locator('.desktop-sidebar').getByRole('link', { name: label, exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
}
try {
  for (const width of [360, 768, 1280, 1920]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      offline: true,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    const external = [];
    page.on('pageerror', (error) => errors.push(error.message.slice(0, 200)));
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) external.push(request.url());
    });
    await page.goto(pathToFileURL(path.resolve(root, '../index.html')).href + '#/entrar');
    await page.locator('.entry-submit').click();
    await navigate(page, 'MOVRA Studio', width);
    await page.screenshot({
      path: path.join(output, `studio-home-${width}.png`),
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Gerar treino personalizado', exact: true }).click();
    await page.screenshot({
      path: path.join(output, `studio-questionnaire-${width}.png`),
      animations: 'disabled',
    });
    for (let step = 0; step < 5; step++)
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Gerar proposta de treino', exact: true }).click();
    await page
      .locator('.studio-editor')
      .evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({
      path: path.join(output, `studio-editor-${width}.png`),
      animations: 'disabled',
    });
    const studioOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    await page
      .locator('.topbar')
      .getByRole('button', { name: /^Conta de / })
      .click();
    await page.getByRole('button', { name: 'Trocar perfil', exact: true }).click();
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    await page.locator('.entry-submit').click();
    await navigate(page, 'Alimentação', width);
    await page.getByRole('button', { name: 'Adicionar alimento', exact: true }).click();
    await page.getByLabel('Buscar alimento', { exact: true }).fill('arroz');
    await page.getByLabel('Alimento da biblioteca').selectOption('usda-168878');
    await page.screenshot({
      path: path.join(output, `fuel-food-dialog-${width}.png`),
      animations: 'disabled',
    });
    await page.getByLabel('Quantidade', { exact: true }).fill('150');
    await page.getByRole('button', { name: 'Registrar alimento', exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(output, `fuel-overview-${width}.png`),
      animations: 'disabled',
    });
    await page
      .locator('.meal-card')
      .evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({
      path: path.join(output, `fuel-meal-${width}.png`),
      animations: 'disabled',
    });
    observations.push({
      width,
      studioOverflow,
      fuelOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      errors,
      external,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
await fs.writeFile(path.join(output, 'observations.json'), JSON.stringify(observations, null, 2));
console.log(JSON.stringify(observations, null, 2));
if (
  observations.some(
    (item) =>
      item.errors.length || item.external.length || item.studioOverflow || item.fuelOverflow,
  )
)
  process.exitCode = 1;
