import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

test('Conversas locais isolam vínculos, preservam histórico e removem o vídeo vencido do IndexedDB', async ({
  page,
}) => {
  test.setTimeout(120000);
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-chat-'));
  try {
    let entry = '/entrar';
    if (process.env.MOVRA_PORTABLE === '1') {
      const file = path.join(folder, 'index.html');
      await fs.copyFile('../index.html', file);
      entry = pathToFileURL(file).href + '#/entrar';
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const start = new Date('2026-02-03T12:00:00Z').getTime();
    await page.clock.setFixedTime(start);
    await page.addInitScript((startedAt) => {
      if (location.protocol === 'about:' || localStorage.getItem('movra:connect:1')) return;
      const accounts = [
        { id: 'p-aurora', name: 'Aurora Lima', role: 'personal' },
        { id: 'p-iris', name: 'Íris Mata', role: 'personal' },
        { id: 's-julio', name: 'Julio Dias', role: 'aluno' },
      ];
      localStorage.setItem(
        'movra:connect:1',
        JSON.stringify({
          version: 1,
          accounts,
          invites: [],
          attempts: {},
          requests: [],
          links: accounts.slice(0, 2).map((account) => ({
            id: account.id,
            studentId: 's-julio',
            trainerId: account.id,
            startedAt,
            endedAt: null,
          })),
        }),
      );
    }, start);
    async function login(name: string, student = false) {
      await page.goto('about:blank');
      await page.goto(entry);
      if (student) await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
      await page.locator('.connect-entry summary').click();
      await page.getByRole('button', { name: 'Abrir conta de ' + name, exact: true }).click();
      await expect(page.locator('.app-shell')).toBeVisible();
      const mobile = (page.viewportSize()?.width ?? 1440) < 1000;
      if (mobile) await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
      await page
        .locator(mobile ? '.mobile-drawer' : '.desktop-sidebar')
        .getByRole('link', { name: 'Conversas', exact: true })
        .click();
      await expect(page.getByRole('heading', { name: 'Conversas', exact: true })).toBeVisible();
    }
    const text = 'A carga da segunda série ficou confortável.';
    await login('Julio Dias', true);
    await page.getByRole('button', { name: /Aurora Lima/ }).click();
    await page.getByLabel('Sua mensagem para Aurora Lima').fill(text);
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    const upload = page.locator('input[type=file]');
    await upload.setInputFiles({
      name: 'formato-invalido.png',
      mimeType: 'image/png',
      buffer: Buffer.from('conteúdo incompatível'),
    });
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(page.getByRole('alert')).toContainText('não corresponde ao formato');
    await page.getByRole('button', { name: 'Remover anexo' }).click();
    for (const file of ['public/media/movra-hero-frame.jpg', 'public/media/movra-hero.mp4']) {
      await upload.setInputFiles(file);
      await page.getByRole('button', { name: 'Enviar mensagem' }).click();
      await expect(page.getByRole('button', { name: 'Remover anexo' })).toHaveCount(0);
    }
    const wav = Buffer.alloc(44 + 1600);
    wav.write('RIFF');
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24);
    wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(1600, 40);
    await upload.setInputFiles({ name: 'voz.wav', mimeType: 'audio/wav', buffer: wav });
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(page.getByRole('button', { name: 'Abrir áudio' })).toBeVisible();
    await login('Íris Mata');
    await page.getByRole('button', { name: /Julio Dias/ }).click();
    await expect(page.getByText('O histórico começa com a primeira mensagem.')).toBeVisible();
    await login('Aurora Lima');
    await expect(page.getByText('4 não lidas')).toBeVisible();
    await page.getByRole('button', { name: /Julio Dias/ }).click();
    for (const [label, selector] of [
      ['foto', 'img'],
      ['vídeo', 'video'],
      ['áudio', 'audio'],
    ]) {
      await page.getByRole('button', { name: 'Abrir ' + label }).click();
      await expect(page.locator('ol ' + selector)).toHaveAttribute('src', /^blob:/);
    }
    await page.getByLabel('Buscar no histórico').fill('carga');
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect(page.locator('ol li')).toHaveCount(1);
    expect(await fileCount(page)).toBe(3);

    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('movra:connect:1')!);
      state.links[0].endedAt = Date.now();
      localStorage.setItem('movra:connect:1', JSON.stringify(state));
    });
    await page.clock.setFixedTime(start + 7 * 86400000 + 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await login('Julio Dias', true);
    await page.getByRole('button', { name: /Aurora Lima/ }).click();
    await expect(page.getByText('Vídeo expirado', { exact: true })).toBeVisible();
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toHaveCount(0);
    expect(await fileCount(page)).toBe(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});

function fileCount(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open('movra:conversas:1');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const count = req.result.transaction('files').objectStore('files').count();
          count.onsuccess = () => {
            req.result.close();
            resolve(count.result);
          };
          count.onerror = () => reject(count.error);
        };
      }),
  );
}
