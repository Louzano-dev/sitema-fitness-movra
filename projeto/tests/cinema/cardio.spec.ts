import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
let entry = '/entrar';
test.beforeAll(async () => {
  await fs.mkdir('docs/evidence-cardio', { recursive: true });
  if (process.env.MOVRA_PORTABLE === '1') {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-cardio-'));
    await fs.copyFile('../index.html', path.join(folder, 'index.html'));
    entry = pathToFileURL(path.join(folder, 'index.html')).href + '#/entrar';
  }
});
async function navigate(page: Page, label: string) {
  if ((page.viewportSize()?.width ?? 1280) < 1000) {
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: label, exact: true }).click();
  } else
    await page.locator('.desktop-sidebar').getByRole('link', { name: label, exact: true }).click();
}
async function switchRole(page: Page, role: 'aluno' | 'personal') {
  await page
    .locator('.topbar')
    .getByRole('button', { name: /^Conta de / })
    .click();
  await page.getByRole('button', { name: 'Trocar perfil', exact: true }).click();
  await page
    .getByRole('button', {
      name: role === 'aluno' ? 'Aluno / atleta' : 'Personal trainer',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
}
for (const width of [390, 1280])
  test(`Cardio prescrição, intervalos, execução, correção e persistência ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => console.log('Browser:', error.message));
    await page.emulateMedia({ reducedMotion: width === 390 ? 'reduce' : 'no-preference' });
    await page.setViewportSize({ width, height: 900 });
    await page.goto(entry);
    await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
    await navigate(page, 'MOVRA Studio');
    await page.getByRole('button', { name: 'Criar treino', exact: true }).click();
    await page.getByRole('button', { name: 'Criar treino do zero', exact: true }).click();
    await page.getByLabel('Nome da ficha', { exact: true }).fill('Cardio validado');
    await page.getByRole('button', { name: 'Adicionar cardio', exact: true }).click();
    await page.getByLabel('Duração orientativa (min)', { exact: true }).fill('5');
    await page.getByRole('button', { name: 'Salvar cardio na ficha', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar cardio', exact: true }).click();
    await page.getByLabel('Modalidade de cardio', { exact: true }).selectOption('cardio-4');
    await expect(page.getByLabel('Inclinação (%)', { exact: true })).toHaveCount(0);
    await page.getByLabel('Distância (km)', { exact: true }).fill('2');
    await page.getByRole('button', { name: 'Salvar cardio na ficha', exact: true }).click();
    await page.getByRole('button', { name: 'Editar cardio 1', exact: true }).click();
    await page.getByLabel('Tipo de cardio', { exact: true }).selectOption('Intervalado');
    await page.getByRole('button', { name: 'Adicionar bloco', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar bloco', exact: true }).click();
    await page.getByLabel('Tipo do bloco 2', { exact: true }).selectOption('Recuperação');
    await page.getByLabel('Duração (s) do bloco 2', { exact: true }).fill('30');
    await page.getByLabel('Ciclos da sequência completa', { exact: true }).fill('2');
    await expect(page.getByRole('dialog')).toContainText('Tempo total planejado: 3:00');
    await page.screenshot({ path: `docs/evidence-cardio/editor-${width}.png` });
    await page.getByRole('button', { name: 'Duplicar bloco 2', exact: true }).click();
    await page.getByRole('button', { name: 'Subir bloco 3', exact: true }).click();
    await page.getByRole('button', { name: 'Excluir bloco 3', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Tempo total planejado: 3:00');
    const axe = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
    await page.getByRole('button', { name: 'Salvar cardio na ficha', exact: true }).click();
    await page
      .getByLabel('Revisei aluno, contexto, dias, exercícios e parâmetros desta proposta fictícia.')
      .check();
    await page.getByRole('button', { name: 'Aprovar versão revisada', exact: true }).click();
    await page.getByRole('button', { name: 'Atribuir ficha ao aluno', exact: true }).click();
    await expect(page.locator('.review-panel')).toContainText('Ficha atribuída');
    await switchRole(page, 'aluno');
    await navigate(page, 'Meus treinos');
    await page
      .locator('.workout-card')
      .filter({ hasText: 'Cardio validado' })
      .getByRole('link', { name: 'Iniciar treino', exact: true })
      .click();
    const runner = page.locator('.cardio-runner').first();
    const timerEpoch = new Date('2026-11-17T12:00:00Z');
    await page.clock.install({ time: timerEpoch });
    await page.clock.pauseAt(new Date(timerEpoch.getTime() + 10000));
    await expect(runner).toContainText('Caminhada na esteira');
    await runner.getByRole('button', { name: 'Iniciar cardio', exact: true }).click();
    await page.clock.runFor(2000);
    await expect(runner.getByRole('button', { name: 'Pausar cardio', exact: true })).toBeEnabled();
    await runner.getByRole('button', { name: 'Pausar cardio', exact: true }).click();
    const paused = await runner.locator('.cardio-clock').innerText();
    await page.clock.runFor(5000);
    await expect(runner.locator('.cardio-clock')).toHaveText(paused);
    await runner.getByRole('button', { name: 'Retomar cardio', exact: true }).click();
    await page.clock.runFor(1000);
    await runner.getByRole('button', { name: 'Avançar etapa', exact: true }).click();
    await expect(runner).toContainText('Etapa 2/4');
    await runner.getByRole('button', { name: 'Finalizar cardio', exact: true }).click();
    await expect(runner.getByLabel('Duração real (segundos)', { exact: true })).toHaveValue('3');
    await page.clock.resume();
    await page.screenshot({ path: `docs/evidence-cardio/execution-${width}.png` });
    await runner.getByLabel('Duração real (segundos)', { exact: true }).fill('180');
    await runner.getByLabel('Distância realizada (km)', { exact: true }).fill('0.5');
    await runner.getByLabel('Esforço percebido (RPE 0–10, opcional)', { exact: true }).fill('4');
    await runner.getByRole('button', { name: 'Salvar registro de cardio', exact: true }).click();
    await expect(runner.locator('.form-success')).toContainText('Cardio registrado');
    await navigate(page, 'Histórico');
    const history = page.locator('.cardio-history');
    await expect(history).toContainText('0.5 km');
    await history.locator('details').first().locator('summary').click();
    await history.getByLabel('Corrigir duração (s)', { exact: true }).fill('200');
    await history.getByRole('button', { name: 'Salvar correção de cardio', exact: true }).click();
    await expect(history).toContainText('3:20');
    await page.reload();
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
    await navigate(page, 'Histórico');
    await expect(page.locator('.cardio-history')).toContainText('3:20');
    await switchRole(page, 'personal');
    await navigate(page, 'Alunos');
    await page.getByRole('link', { name: 'Abrir perfil de Ana Costa', exact: true }).click();
    await expect(page.locator('.cardio-history')).toContainText('3:20');
    await navigate(page, 'MOVRA Studio');
    await page.getByRole('button', { name: 'Abrir ficha', exact: true }).click();
    await page.getByRole('button', { name: 'Remover cardio 1', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await switchRole(page, 'aluno');
    await navigate(page, 'Histórico');
    await expect(page.locator('.cardio-history')).toContainText('Caminhada na esteira');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
