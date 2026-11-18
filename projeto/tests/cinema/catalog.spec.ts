import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
test('Biblioteca ampliada e observação do personal chegam à execução do aluno', async ({
  page,
}) => {
  test.setTimeout(90000);
  let entry = '/entrar';
  if (process.env.MOVRA_PORTABLE === '1') {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-catalog-'));
    await fs.copyFile('../index.html', path.join(dir, 'index.html'));
    entry = pathToFileURL(path.join(dir, 'index.html')).href + '#/entrar';
  }
  await page.goto(entry);
  await page.locator('.entry-submit').click();
  await page
    .locator('.desktop-sidebar')
    .getByRole('link', { name: 'Exercícios', exact: true })
    .click();
  await page.getByLabel('Buscar exercício', { exact: true }).fill('Rosca inclinada');
  await expect(page.locator('.exercise-card')).toHaveCount(1);
  await expect(page.locator('.exercise-card')).toContainText('Rosca inclinada com halteres');
  await page
    .locator('.desktop-sidebar')
    .getByRole('link', { name: 'Treinos', exact: true })
    .click();
  await page.getByRole('link', { name: 'Criar treino', exact: true }).click();
  await page.getByLabel('Nome do treino', { exact: true }).fill('Ficha com orientacao');
  await page.getByLabel('Aluno', { exact: true }).selectOption('ana');
  await page
    .getByLabel('Adicionar exercício da biblioteca', { exact: true })
    .selectOption('ex-rosca-inclinada-com-halteres');
  await page
    .getByLabel('Observações do exercício 1 (opcional)', { exact: true })
    .fill('Suba de forma controlada; siga a amplitude que combinamos.');
  await page.getByRole('button', { name: 'Revisar treino antes de atribuir' }).click();
  await page.getByRole('button', { name: 'Confirmar atribuição na prévia' }).click();
  await expect(page.locator('main').getByRole('status')).toContainText('Treino atualizado');
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
  await page
    .locator('.workout-card')
    .filter({ hasText: 'Ficha com orientacao' })
    .getByRole('link', { name: 'Iniciar treino', exact: true })
    .click();
  await expect(page.locator('.personal-instruction')).toContainText(
    'Suba de forma controlada; siga a amplitude que combinamos.',
  );
  await expect(page.locator('main')).toContainText('Rosca inclinada com halteres');
});
