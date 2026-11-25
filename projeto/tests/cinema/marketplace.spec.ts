import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('currículo, descoberta, aceite e cancelamento de serviço no Connect', async ({ page }) => {
  test.setTimeout(130000);
  const entry =
    process.env.MOVRA_PORTABLE === '1'
      ? pathToFileURL(path.resolve('../index.html')).href + '#/entrar'
      : '/entrar';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  async function login(role: 'aluno' | 'personal', name: string, fresh: boolean) {
    await page.goto('about:blank');
    await page.goto(entry);
    if (role === 'aluno')
      await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    const details = page.locator('.connect-entry');
    await details.locator('summary').click();
    if (fresh) {
      await details.getByLabel('Nome da nova conta local').fill(name);
      await details.getByRole('button', { name: 'Criar conta de ' + role, exact: true }).click();
    } else await details.getByRole('button', { name: 'Abrir conta de ' + name }).click();
    await expect(page.locator('.app-shell')).toBeVisible();
  }
  await login('personal', 'Sam Particular', true);
  await page.locator('.desktop-sidebar').getByRole('link', { name: 'Meu negócio' }).click();
  await page.getByLabel('Especialidades', { exact: true }).fill('Corrida em trilha');
  await page.getByLabel('Exibir meu perfil em Encontrar personal').check();
  await page.getByRole('button', { name: 'Salvar currículo' }).click();
  await expect(page.getByText('Currículo salvo neste navegador.')).toBeVisible();
  await page.getByRole('button', { name: 'Serviços', exact: true }).click();
  await page.getByLabel('Nome do serviço').fill('Trilha híbrida');
  await page.getByLabel('Preço mensal').fill('159');
  await page.getByLabel('Formato de acompanhamento').selectOption('Híbrido');
  await page.getByLabel('O que está incluído').fill('Sessões e treino individual');
  await page.getByLabel('Frequência de atualização').fill('Semanal');
  await page.getByLabel('Condições de cancelamento').fill('Conforme solicitação do aluno.');
  await page.getByRole('button', { name: 'Salvar oferta' }).click();
  await expect(page.getByText('Oferta salva.')).toBeVisible();
  await login('aluno', 'Luz Aluna', true);
  async function profile() {
    await page
      .locator('.desktop-sidebar')
      .getByRole('link', { name: /Encontrar.*personal/i })
      .click();
    await page.getByLabel('Nome ou especialidade').fill('trilha');
    await page.getByRole('link', { name: 'Ver perfil de Sam Particular' }).click();
    await expect(page.getByRole('heading', { name: 'Sam Particular', exact: true })).toBeVisible();
  }
  await profile();
  await page.getByRole('button', { name: 'Solicitar acompanhamento' }).click();
  await expect(
    page.getByRole('button', { name: 'Aguardando aprovação do personal' }),
  ).toBeDisabled();
  await login('personal', 'Sam Particular', false);
  await page.getByRole('button', { name: 'Aprovar vínculo' }).click();
  await login('aluno', 'Luz Aluna', false);
  await profile();
  await page.getByRole('checkbox', { name: /Li as condições/ }).check();
  await page.getByRole('button', { name: 'Ativar serviço demonstrativo' }).click();
  await page.getByRole('link', { name: 'Gerenciar serviço demonstrativo' }).click();
  await expect(
    page.locator('.desktop-sidebar').getByRole('link', { name: 'Agenda', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar serviço demonstrativo' }).click();
  await page.getByRole('button', { name: 'Confirmar cancelamento do serviço' }).click();
  await expect(page.getByText(/Assinatura demonstrativa cancelada/)).toBeVisible();
  await expect(page.getByText(/Vínculo ativo · Marketplace MOVRA/)).toBeVisible();
});
