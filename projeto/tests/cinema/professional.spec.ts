import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('perfil restrito ao vínculo e agenda opcional com histórico', async ({ page }) => {
  test.setTimeout(120000);
  const entry =
    process.env.MOVRA_PORTABLE === '1'
      ? pathToFileURL(path.resolve('../index.html')).href + '#/entrar'
      : '/entrar';
  const nav = page.locator('.desktop-sidebar');
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

  await login('personal', 'Sam Personal', true);
  const code = await page.getByLabel('Código público do personal').inputValue();
  await nav.getByRole('link', { name: 'Perfil profissional' }).click();
  await page.getByLabel('Especialidades', { exact: true }).fill('Corrida em trilha');
  await page.getByLabel('Registro profissional').fill('CREF 00000/MG');
  await page.getByLabel('WhatsApp profissional (opcional)').fill('+55 11 91234-5678');
  await page.getByRole('button', { name: 'Salvar currículo' }).click();
  await expect(page.getByText('Currículo salvo neste navegador.')).toBeVisible();

  await login('aluno', 'Luz Aluna', true);
  await expect(nav.getByRole('link', { name: 'Agenda', exact: true })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Meu personal', exact: true }).click();
  await page.getByLabel('Código ou link do personal').fill(code);
  await page.getByRole('button', { name: 'Consultar convite' }).click();
  await expect(page.getByText('Corrida em trilha', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'WhatsApp profissional' })).toHaveCount(0);
  await expect(page.getByText('CREF 00000/MG')).toHaveCount(0);
  await page.getByRole('button', { name: 'Conectar com este personal' }).click();
  await expect(page.getByText(/Aguardando aprovação de Sam Personal/)).toBeVisible();

  await login('personal', 'Sam Personal', false);
  await page.getByRole('button', { name: 'Aprovar vínculo' }).click();
  await nav.getByRole('link', { name: 'Agenda', exact: true }).click();
  await expect(page.locator('.agenda-entry')).toHaveCount(0);
  const today = await page.evaluate(() => new Date().toLocaleDateString('sv-SE'));
  await expect(page.getByLabel('Dia da agenda')).toHaveValue(today);
  await page.getByText(/Disponibilidade e bloqueios/).click();
  await page.getByLabel('Início', { exact: true }).fill('09:00');
  await page.getByLabel('Fim', { exact: true }).fill('12:00');
  await page.getByRole('button', { name: 'Salvar faixa' }).click();
  await expect(page.getByText('Faixa de horário salva.')).toBeVisible();
  const dialog = page.getByRole('dialog');
  await page.getByRole('button', { name: 'Agendar encontro', exact: true }).click();
  await dialog.getByLabel('Aluno', { exact: true }).selectOption({ label: 'Luz Aluna' });
  await dialog.getByLabel('Horário').fill('09:30');
  await dialog.getByRole('button', { name: 'Salvar agendamento' }).click();
  await expect(page.locator('.agenda-entry')).toContainText('09:30');
  await page.getByRole('button', { name: 'Reagendar', exact: true }).click();
  await dialog.getByLabel('Horário').fill('10:30');
  await dialog.getByRole('button', { name: 'Salvar novo horário' }).click();
  await expect(page.locator('.agenda-entry')).toContainText('Horários anteriores');
  await page.getByRole('button', { name: 'Cancelar sessão' }).click();
  await dialog.getByRole('button', { name: 'Confirmar cancelamento' }).click();
  await expect(page.locator('.agenda-entry')).toHaveCount(0);

  await login('aluno', 'Luz Aluna', false);
  await nav.getByRole('link', { name: 'Meu personal', exact: true }).click();
  await expect(page.getByText('Vínculo ativo', { exact: true })).toBeVisible();
  await expect(page.getByText('CREF 00000/MG')).toBeVisible();
  await expect(page.getByRole('link', { name: 'WhatsApp profissional' })).toHaveAttribute(
    'href',
    'https://wa.me/5511912345678',
  );
  await expect(page.getByLabel('Código ou link do personal')).toBeHidden();
  await page.getByRole('link', { name: 'Meus encontros' }).click();
  await expect(page.locator('.agenda-entry')).toContainText('Cancelado');
  await expect(page.locator('.agenda-entry')).toContainText('10:30');
});
