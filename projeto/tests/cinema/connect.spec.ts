import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import QRCode from 'qrcode';

test('Connect local cadastra contas, lê QR, confirma o vínculo e preserva isolamento', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-connect-'));
  try {
    const file = path.join(folder, 'index.html');
    let entry = '/entrar';
    if (process.env.MOVRA_PORTABLE === '1') {
      await fs.copyFile('../index.html', file);
      entry = pathToFileURL(file).href + '#/entrar';
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => {
            document.body.dataset.cameraRequested = 'true';
            throw new DOMException('Denied', 'NotAllowedError');
          },
        },
      });
    });
    async function login(role: 'aluno' | 'personal', name: string, create: boolean, url = entry) {
      await page.goto('about:blank');
      await page.goto(url);
      if (role === 'aluno')
        await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
      const details = page.locator('.connect-entry');
      if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open)))
        await details.locator('summary').click();
      if (create) {
        await page.getByLabel('Nome da nova conta local').fill(name);
        if (role === 'aluno') await page.getByRole('checkbox', { name: 'Segunda' }).check();
        await page.getByRole('button', { name: 'Criar conta de ' + role, exact: true }).click();
      } else
        await page.getByRole('button', { name: 'Abrir conta de ' + name, exact: true }).click();
      await expect(page.locator('.app-shell')).toBeVisible();
      if (role === 'aluno' && url === entry) {
        await page
          .locator('.desktop-sidebar')
          .getByRole('link', { name: 'Meu personal', exact: true })
          .click();
      }
    }
    await login('personal', 'Personal Aurora', true);
    const publicCode = await page.getByLabel('Código público do personal').inputValue();
    await expect(page.getByRole('heading', { name: 'Convidar alunos' })).toBeVisible();
    await page.getByRole('button', { name: 'Criar convite individual' }).click();
    const local = await page
      .getByRole('link', { name: 'Abrir convite neste navegador' })
      .evaluate((a) => (a as HTMLAnchorElement).href);
    await page.getByRole('button', { name: 'Mostrar QR Code' }).click();
    const png = await page
      .getByRole('img', { name: 'QR Code do convite individual' })
      .getAttribute('src');
    expect(png).toMatch(/^data:image\/png/);
    await login('aluno', 'Aluno Julio', true, local);
    const field = page.getByLabel('Código ou link do personal');
    const find = page.getByRole('button', { name: 'Consultar convite' });
    const confirm = page.getByRole('button', { name: 'Conectar com este personal' });
    const upload = page.getByLabel('Imagem do QR Code');
    const alert = page.locator('.student-connect [role="alert"]');
    await expect(field).not.toHaveValue('');
    await expect(page.getByRole('heading', { name: 'Conecte-se ao seu personal' })).toBeVisible();
    await expect(page.locator('body')).not.toHaveAttribute('data-camera-requested', 'true');
    await expect(alert).toHaveCount(0);
    await expect(upload).toBeHidden();
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(find).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBeLessThanOrEqual(1);
      if (process.env.MOVRA_CONNECT_SCREENSHOTS)
        await page
          .locator('.student-connect')
          .screenshot({ path: testInfo.outputPath('connect-' + width + '.png') });
      if (width === 360)
        expect((await new AxeBuilder({ page }).include('.student-connect').analyze()).violations).toEqual([]);
    }
    await field.fill(local);
    await find.click();
    await expect(confirm).toBeVisible();
    await expect(page.getByRole('button', { name: 'Desvincular personal' })).toHaveCount(0);
    await field.fill('MOVRA-00000000');
    await find.click();
    await expect(alert).toContainText('inválido');
    await field.fill('');
    await page.getByRole('button', { name: 'Escanear QR' }).click();
    await expect(alert).toContainText('Permissão de câmera negada');
    await page.evaluate(
      () =>
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
          configurable: true,
          value: undefined,
        }) && undefined,
    );
    await page.getByRole('button', { name: 'Escanear QR' }).click();
    await expect(alert).toContainText('não oferece acesso');
    await page.evaluate(
      () =>
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
          configurable: true,
          value: async () => {
            throw new DOMException('No camera', 'NotFoundError');
          },
        }) && undefined,
    );
    await page.getByRole('button', { name: 'Escanear QR' }).click();
    await expect(alert).toContainText('Nenhuma câmera disponível');
    await upload.setInputFiles({
      name: 'foto.png',
      mimeType: 'image/png',
      buffer: Buffer.from('não é uma imagem'),
    });
    await expect(alert).toContainText('Imagem ilegível');
    await upload.setInputFiles({
      name: 'outro.png',
      mimeType: 'image/png',
      buffer: await QRCode.toBuffer('https://example.org/'),
    });
    await expect(alert).toContainText('não contém um convite MOVRA');
    await upload.setInputFiles({
      name: 'convite.png',
      mimeType: 'image/png',
      buffer: Buffer.from(png!.split(',')[1], 'base64'),
    });
    await expect(page.getByRole('heading', { name: 'Personal Aurora' })).toBeVisible();
    await confirm.click();
    await expect(page.getByRole('button', { name: 'Desvincular personal' })).toBeVisible();
    await expect(field).toBeHidden();
    expect((await new AxeBuilder({ page }).include('.student-connect').analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => {
      const accounts = JSON.parse(localStorage.getItem('movra:connect:1')!).accounts;
      const account = accounts.find(({ name }: { name: string }) => name === 'Aluno Julio');
      return JSON.parse(localStorage.getItem('movra:connect:workspace:' + account.id)!)
        .state.experience.habits[account.id].plans[0].weekdays;
    })).toEqual([0]);
    if (process.env.MOVRA_CONNECT_SCREENSHOTS)
      await page.locator('.student-connect').screenshot({ path: testInfo.outputPath('connect-vinculado.png') });
    await login('personal', 'Personal Aurora', false);
    await page
      .locator('.desktop-sidebar')
      .getByRole('link', { name: 'Alunos', exact: true })
      .click();
    await expect(page.getByRole('link', { name: 'Abrir perfil de Aluno Julio' })).toBeVisible();
    await page.locator('.desktop-sidebar').getByRole('link', { name: 'Perfil profissional' }).click();
    await page.getByLabel('Especialidades', { exact: true }).fill('Treinamento funcional');
    await page.getByRole('button', { name: 'Salvar currículo' }).click();
    await expect(page.getByText('Currículo salvo neste navegador.')).toBeVisible();
    await login('personal', 'Personal Íris', true);
    await page
      .locator('.desktop-sidebar')
      .getByRole('link', { name: 'Alunos', exact: true })
      .click();
    await expect(page.getByText('Aluno Julio')).toHaveCount(0);
    await login('aluno', 'Aluno Julio', false);
    await page.getByRole('button', { name: 'Desvincular personal' }).click();
    await page.getByRole('button', { name: 'Confirmar desvinculação' }).click();
    await expect(page.getByRole('button', { name: 'Desvincular personal' })).toHaveCount(0);
    // A stream returned after the student closes the permission prompt must be released.
    await page.evaluate(() => {
      const stream = document.createElement('canvas').captureStream(1);
      const block = new Promise<MediaStream>((resolve) => {
        window.addEventListener('grant-camera', () => resolve(stream), { once: true });
      });
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: () => {
          document.body.dataset.delayedCameraRequested = 'true';
          return block;
        },
      });
      Object.defineProperty(document.body, 'delayedCameraState', {
        get: () => stream.getTracks()[0].readyState,
      });
    });
    await page.getByRole('button', { name: 'Escanear QR' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-delayed-camera-requested', 'true');
    await page.getByRole('button', { name: 'Fechar câmera' }).click();
    await page.evaluate(() => {
      window.dispatchEvent(new Event('grant-camera'));
    });
    await expect
      .poll(() => page.evaluate(() => Reflect.get(document.body, 'delayedCameraState')))
      .toBe('ended');
    // Use the exported QR as a synthetic camera feed, including real frame decoding and cleanup.
    await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src!;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const stream = canvas.captureStream(6);
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: async () => {
          const draw = window.setInterval(() => {
            if (stream.getTracks()[0].readyState === 'ended') {
              clearInterval(draw);
              document.body.dataset.qrCameraStopped = 'true';
            } else ctx.drawImage(img, 0, 0);
          }, 100);
          return stream;
        },
      });
    }, png);
    await page.getByRole('button', { name: 'Escanear QR' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-qr-camera-stopped', 'true');
    await expect(alert).toContainText('utilizado');
    await expect(confirm).toHaveCount(0);
    await page.getByLabel('Código ou link do personal').fill(publicCode);
    await find.click();
    await expect(page.getByText('Treinamento funcional', { exact: true })).toBeVisible();
    await confirm.click();
    await expect(page.getByText(/Aguardando aprovação de Personal Aurora/)).toBeVisible();
    await login('personal', 'Personal Aurora', false);
    await page.getByRole('button', { name: 'Aprovar vínculo' }).click();
    await expect(page.getByText('Alunos conectados (1)', { exact: true })).toBeVisible();
    await login('aluno', 'Aluno Julio', false);
    await expect(page.getByRole('button', { name: 'Desvincular personal' })).toBeVisible();
    await page.goto('about:blank');
    await page.goto(entry);
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
    await page
      .locator('.desktop-sidebar')
      .getByRole('link', { name: 'Meu personal', exact: true })
      .click();
    await field.fill(publicCode);
    await find.click();
    await expect(
      page.getByText('Abra uma conta local de aluno para consultar este convite.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Abrir conta de Aluno Julio', exact: true }).click();
    await expect(field).toHaveValue(publicCode);
    await find.click();
    await expect(page.getByText('Você já está conectado a este personal.')).toBeVisible();
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});
