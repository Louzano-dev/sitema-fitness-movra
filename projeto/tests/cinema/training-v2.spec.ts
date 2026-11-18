import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
test('Semana A/B/C e exercício autoral chegam à prévia e ao aluno com os mesmos parâmetros', async ({
  page,
}) => {
  test.setTimeout(150000);
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-plan-'));
  try {
    let entry = '/entrar';
    if (process.env.MOVRA_PORTABLE === '1') {
      await fs.copyFile('../index.html', path.join(folder, 'index.html'));
      entry = pathToFileURL(path.join(folder, 'index.html')).href + '#/entrar';
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(entry);
    await page.locator('.entry-submit').click();
    await page
      .locator('.desktop-sidebar')
      .getByRole('link', { name: 'MOVRA Studio', exact: true })
      .click();
    await page.getByRole('button', { name: 'Criar treino', exact: true }).click();
    await page.getByRole('button', { name: 'Explorar modelos', exact: true }).click();
    await page.getByRole('button', { name: 'Intermediário · A/B/C · 3 dias' }).click();
    await expect(page.getByLabel('Nível atual')).toHaveValue('Intermediário');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(page.getByLabel('Divisão da proposta')).toHaveValue('A/B/C');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(page.getByLabel('Tempo por sessão (min)')).toHaveValue('60');
    await page.getByRole('button', { name: 'Etapa 6: Revisão' }).click();
    await page.getByRole('button', { name: 'Gerar proposta de treino' }).click();
    await expect(page.locator('.day-tab')).toHaveCount(3);
    for (const button of await page.locator('.day-tab').all()) {
      await button.click();
      expect(await page.locator('.studio-exercise').count()).toBeGreaterThanOrEqual(4);
    }
    await page.locator('.day-tab').first().click();
    await page.getByRole('button', { name: 'Adicionar exercícios', exact: true }).click();
    await page.getByText('Cadastrar exercício próprio', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome do exercício', { exact: true }).fill('Passo orientado');
    await dialog.getByLabel('Grupo muscular', { exact: true }).fill('Quadríceps');
    await dialog.getByLabel('Padrão de movimento', { exact: true }).fill('Agachar');
    await dialog
      .getByLabel('Instruções de execução')
      .fill('Siga o apoio demonstrado pelo personal.');
    await dialog.getByRole('button', { name: 'Salvar exercício na biblioteca' }).click();
    await dialog.getByRole('button', { name: 'Adicionar ao dia', exact: true }).click();
    await dialog.getByRole('button', { name: 'Voltar à ficha' }).click();
    const customRow = page.locator('.studio-exercise').filter({ hasText: 'Passo orientado' });
    await customRow.locator('summary').click();
    await customRow.getByLabel('Observações do exercício').fill('Usar o apoio combinado.');
    await customRow.getByLabel(/Repetições em reserva/).fill('2');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const audit = await new AxeBuilder({ page })
      .include('.studio-editor')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      audit.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    await page.getByRole('button', { name: 'Visualizar como o aluno' }).click();
    const expected = await page.locator('.workout-outline').allInnerTexts();
    expect(expected[0]).toContain('Passo orientado');
    expect(expected[0]).toContain('Usar o apoio combinado.');
    expect(expected[0]).toContain('2 repetições em reserva');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByLabel('Revisei aluno, contexto, dias, exercícios e parâmetros desta proposta fictícia.')
      .check();
    await page.getByRole('button', { name: 'Aprovar versão revisada' }).click();
    await page.getByRole('button', { name: 'Atribuir ficha ao aluno' }).click();
    await expect(page.locator('.review-panel')).toContainText('Ficha atribuída');
    await page
      .locator('.topbar')
      .getByRole('button', { name: /^Conta de / })
      .click();
    await page.getByRole('button', { name: 'Trocar perfil', exact: true }).click();
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    await page.locator('.entry-submit').click();
    await page
      .locator('.desktop-sidebar')
      .getByRole('link', { name: 'Meus treinos', exact: true })
      .click();
    for (const [i, label] of ['A · Empurrar', 'B · Puxar', 'C · Inferior'].entries()) {
      const card = page.locator('.workout-card').filter({ hasText: label });
      await card.getByRole('link', { name: 'Iniciar treino', exact: true }).click();
      await page.getByText(/Consultar ficha completa/).click();
      expect(await page.locator('.workout-outline').innerText()).toBe(expected[i]);
      await page
        .locator('.desktop-sidebar')
        .getByRole('link', { name: 'Meus treinos', exact: true })
        .click();
    }
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});
