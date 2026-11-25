import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeCardio } from '../../src/domain/cardio';
import { createSeed } from '../../src/services/mock/seed';

const entry =
  process.env.MOVRA_PORTABLE === '1'
    ? `${pathToFileURL(path.resolve('../index.html')).href}#/entrar`
    : '/entrar';

async function enter(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date('2026-11-02T15:00:00Z'));
  await page.goto(entry);
  await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar na demonstração' }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
}

async function download(page: Page, button: Locator) {
  await expect(button).toBeEnabled();
  const [event] = await Promise.all([page.waitForEvent('download'), button.click()]);
  const file = await event.path();
  expect(file).not.toBeNull();
  const encoded = (await readFile(file!)).toString('base64');
  const image = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return {
      width: canvas.width,
      height: canvas.height,
      corner: Array.from(context.getImageData(0, 0, 1, 1).data),
      content: context
        .getImageData(0, 0, canvas.width, canvas.height)
        .data.some((value, index) => index % 4 === 3 && value > 0),
    };
  }, encoded);
  return { ...image, filename: event.suggestedFilename() };
}

async function addPhoto(page: Page, dialog: Locator, hex: string) {
  const content = await page.evaluate((color) => {
    const fixture = document.createElement('canvas');
    fixture.width = 400;
    fixture.height = 240;
    const context = fixture.getContext('2d')!;
    context.fillStyle = color;
    context.fillRect(0, 0, fixture.width, fixture.height);
    context.fillStyle = '#9A8675';
    context.fillRect(180, 20, 38, 70);
    return fixture.toDataURL('image/png').split(',')[1];
  }, hex);
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'foto-local.png',
    mimeType: 'image/png',
    buffer: Buffer.from(content, 'base64'),
  });
  await expect(dialog.getByLabel('Formato')).toHaveValue('photo');
}

test('conclusão e histórico abrem seis modelos e exportam PNGs transparentes ou com foto', async ({
  page,
}, testInfo) => {
  await enter(page);
  await page.getByText('Definir meus dias de treino', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Segunda', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar dias de treino' }).click();
  await page.getByRole('link', { name: 'Começar meu treino' }).click();
  const sets = page.locator('.set-check input');
  await expect(sets.first()).toBeVisible();
  for (const set of await sets.all()) await set.check();
  await page.clock.setFixedTime(new Date('2026-11-02T15:08:00Z'));
  await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
  await expect(page.locator('.completion')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('treino-concluido.png') });
  await page.getByRole('button', { name: 'Compartilhar treino', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compartilhar treino' });
  const preview = dialog.getByRole('img', { name: /Prévia/ });
  const exportButton = dialog.getByRole('button', { name: 'Baixar PNG', exact: true });
  await expect(preview).toHaveAccessibleName(/Musculação.*Duração: 8 min.*Exercícios.*Séries/);

  const images = new Set<string>();
  for (const template of [
    'Editorial',
    'Circular',
    'Tipográfico',
    'Essencial',
    'Consistência',
    'Progresso semanal',
  ]) {
    await dialog.getByRole('button', { name: template, exact: true }).click();
    await expect(exportButton).toBeEnabled();
    images.add(await preview.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()));
  }
  expect(images.size).toBe(6);
  await expect(preview).toHaveAccessibleName(
    /1 de 1 treinos programados nesta semana.*Seg: concluído/,
  );
  await dialog.getByRole('button', { name: 'Editorial', exact: true }).click();
  await dialog.getByRole('button', { name: 'Transparência', exact: true }).click();
  await expect(exportButton).toBeEnabled();
  await dialog.screenshot({ path: testInfo.outputPath('editor-compartilhamento.png') });
  const compact = await download(page, exportButton);
  expect(compact).toMatchObject({
    filename: 'movra-figurinha.png',
    corner: [0, 0, 0, 0],
    content: true,
  });
  expect(compact.width).toBeLessThan(1080);
  expect(compact.height).toBeLessThan(1080);

  await dialog.getByLabel('Formato').selectOption('story');
  await dialog.getByText('Tamanho e posição', { exact: true }).click();
  await dialog.getByRole('slider', { name: 'Posição vertical da figurinha' }).press('Home');
  const story = await download(page, exportButton);
  expect(story).toMatchObject({ width: 1080, height: 1920, corner: [0, 0, 0, 0], content: true });

  await addPhoto(page, dialog, '#F2E3D8');
  await dialog
    .getByRole('group', { name: 'Cor do texto' })
    .getByRole('button', { name: 'Escuro' })
    .click();
  const composed = await download(page, exportButton);
  expect(composed).toMatchObject({ width: 1080, height: 1920, corner: [242, 227, 216, 255] });
  await dialog.evaluate((node) => {
    node.scrollTop = 0;
  });
  await dialog.screenshot({ path: testInfo.outputPath('overlay-fundo-claro.png') });
  await dialog.getByLabel('Enquadramento da foto').selectOption('contain');
  expect((await download(page, exportButton)).corner).toEqual([0, 0, 0, 0]);

  await addPhoto(page, dialog, '#16292A');
  await dialog.getByLabel('Enquadramento da foto').selectOption('cover');
  await dialog.getByRole('button', { name: 'Branco', exact: true }).click();
  await expect(exportButton).toBeEnabled();
  await dialog.evaluate((node) => {
    node.scrollTop = 0;
  });
  await dialog.screenshot({ path: testInfo.outputPath('overlay-fundo-escuro.png') });
  await dialog.getByRole('button', { name: 'Remover foto', exact: true }).click();
  await expect(dialog.getByLabel('Formato')).toHaveValue('story');
  await expect(
    dialog.getByLabel('Formato').getByRole('option', { name: 'Stories com foto' }),
  ).toHaveCount(0);

  const axe = await new AxeBuilder({ page })
    .include('.share-editor-window')
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.evaluate(() => {
    document.documentElement.dataset.movraTheme = 'dark';
  });
  const darkAxe = await new AxeBuilder({ page })
    .include('.share-editor-window')
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(darkAxe.violations).toEqual([]);
  await page.evaluate(() => {
    delete document.documentElement.dataset.movraTheme;
  });
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await dialog.evaluate((node) => {
      node.scrollTop = 0;
    });
    expect(
      await exportButton.evaluate((node) => node.getBoundingClientRect().bottom <= innerHeight),
    ).toBe(true);
    await dialog.screenshot({ path: testInfo.outputPath(`editor-${width}.png`) });
  }
  await page.keyboard.press('Escape');
  const completionTrigger = page.getByRole('button', { name: 'Compartilhar treino', exact: true });
  await expect(completionTrigger).toBeFocused();
  await page.getByRole('link', { name: 'Revisar histórico' }).click();
  await page
    .locator('.history-row')
    .first()
    .getByRole('button', { name: /^Compartilhar treino/ })
    .click();
  await expect(dialog).toBeVisible();
});

test('atividade declarada omite séries, aceita nome longo e usa compartilhamento nativo quando disponível', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (data: ShareData) => data.files?.[0]?.type === 'image/png',
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        if (document.body.dataset.shareFailure)
          throw new DOMException('Indisponível', 'NotAllowedError');
        document.body.dataset.sharedFile = data.files?.[0]?.name;
      },
    });
  });
  await enter(page);
  await page.getByText('Registrar treino sem ficha', { exact: true }).click();
  const title =
    'Mobilidade e equilíbrio com acessórios simples e exercícios de controle corporal em casa';
  await page.getByLabel('Atividade realizada', { exact: true }).fill(title);
  await page.getByLabel('Duração em minutos', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Registrar atividade de hoje', exact: true }).click();
  await page.getByRole('button', { name: 'Compartilhar treino', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compartilhar treino' });
  const preview = dialog.getByRole('img', { name: /Prévia/ });
  await expect(preview).toHaveAccessibleName(/Atividade física.*Duração: 20 min/);
  await dialog.getByText('Conteúdo da figurinha', { exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: /Exercícios|Séries/ })).toHaveCount(0);
  await dialog.getByRole('checkbox', { name: 'Nome do treino', exact: true }).check();
  await expect(preview).toHaveAccessibleName(new RegExp(title));

  const native = dialog.getByRole('button', { name: 'Compartilhar imagem', exact: true });
  await native.click();
  await expect(page.locator('body')).toHaveAttribute('data-shared-file', 'movra-figurinha.png');
  await page.evaluate(() => {
    document.body.dataset.shareFailure = 'true';
  });
  expect(await download(page, native)).toMatchObject({
    filename: 'movra-figurinha.png',
    content: true,
  });
});

test('cardio compartilha somente depois de salvar e só apresenta ritmo com distância realizada', async ({
  page,
}) => {
  const seed = createSeed();
  const workout = seed.workouts[0];
  workout.versionId = 'share-v1';
  workout.cardio = [{ ...makeCardio(undefined, 'share-cardio'), position: 'Antes' }];
  await page.addInitScript((state) => {
    localStorage.setItem('movra:demo:3', JSON.stringify({ version: 3, state }));
  }, seed);
  await enter(page);
  await page.getByRole('link', { name: 'Começar meu treino' }).click();
  const runner = page.locator('.cardio-runner');
  const share = runner.getByRole('button', { name: 'Compartilhar treino', exact: true });
  await expect(share).toHaveCount(0);
  await runner.getByLabel('Duração real (segundos)').fill('180');
  await runner.getByRole('button', { name: 'Salvar registro de cardio' }).click();
  await share.click();
  const dialog = page.getByRole('dialog', { name: 'Compartilhar treino' });
  const preview = dialog.getByRole('img', { name: /Prévia/ });
  await expect(preview).toHaveAccessibleName(/Caminhada na esteira.*Duração: 3 min/);
  await expect(preview).not.toHaveAccessibleName(/Distância|Ritmo|RPE/);
  await page.keyboard.press('Escape');

  await runner.getByLabel('Distância realizada (km)').fill('0.5');
  await runner.getByRole('button', { name: 'Salvar registro de cardio' }).click();
  await share.click();
  await expect(preview).toHaveAccessibleName(/Duração: 3 min.*Distância: 0,5 km.*Ritmo: 6:00 \/km/);
  await page.keyboard.press('Escape');

  await page
    .locator('.desktop-sidebar')
    .getByRole('link', { name: 'Meus treinos', exact: true })
    .click();
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await page
    .locator('.cardio-history')
    .getByText('2026-11-02 · Caminhada na esteira · 3:00', { exact: true })
    .click();
  await page
    .locator('.cardio-history')
    .getByRole('button', { name: 'Compartilhar treino', exact: true })
    .click();
  await expect(preview).toHaveAccessibleName(/Distância: 0,5 km/);
});
