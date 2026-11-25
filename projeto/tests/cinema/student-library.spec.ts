import { test, expect } from '@playwright/test';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('biblioteca portátil salva, prioriza, arquiva, restaura e desfaz a remoção', async ({
  page,
}) => {
  const folder = await mkdtemp(path.join(tmpdir(), 'movra-biblioteca-'));
  try {
    const target = path.join(folder, 'index.html');
    await copyFile('../index.html', target);
    await page.goto(process.env.MOVRA_PORTABLE === '1' ? pathToFileURL(target).href : '/entrar');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
    await page.locator('.desktop-sidebar').getByRole('link', { name: 'Meus treinos' }).click();
    const first = page.locator('.library-program').first();
    const title = await first.getAttribute('aria-label');
    const program = page.getByRole('region', { name: title!, exact: true });
    await program.locator('summary').click();
    await program.getByRole('button', { name: 'Salvar ficha' }).click();
    await program.getByRole('button', { name: 'Usar como principal' }).click();
    await expect(program.locator('.library-tags')).toContainText('Principal');
    await program.getByRole('button', { name: 'Arquivar ficha' }).click();
    await expect(program).toHaveCount(0);
    await page.getByRole('button', { name: 'Arquivados', exact: true }).click();
    await program.locator('summary').click();
    await program.getByRole('button', { name: 'Restaurar ficha' }).click();
    await page.getByRole('button', { name: 'Em uso', exact: true }).click();
    await program.locator('summary').click();
    await program.getByRole('button', { name: 'Remover da biblioteca' }).click();
    await program.getByRole('button', { name: 'Confirmar remoção' }).click();
    await expect(program).toHaveCount(0);
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
    await expect(program.getByRole('link', { name: 'Iniciar treino' })).toBeVisible();
    await page.getByRole('button', { name: 'Histórico', exact: true }).click();
    await expect(page.locator('.history-row').first()).toBeVisible();
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
