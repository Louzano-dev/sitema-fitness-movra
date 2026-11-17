import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const portable = process.env.MOVRA_PORTABLE === '1';
let entry = '/entrar';
test.beforeAll(async () => {
  if (portable) {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'movra-3-'));
    await fs.copyFile('../index.html', path.join(folder, 'index.html'));
    entry = pathToFileURL(path.join(folder, 'index.html')).href + '#/entrar';
  }
});
async function enter(page: Page, role: 'personal' | 'aluno' = 'personal', student = 'ana') {
  await page.goto(entry);
  if (role === 'aluno') {
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    await page.locator('#demo-student').selectOption(student);
  }
  await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
}
async function navigate(page: Page, label: string) {
  if ((page.viewportSize()?.width ?? 1280) < 1000) {
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: label, exact: true }).click();
  } else
    await page.locator('.desktop-sidebar').getByRole('link', { name: label, exact: true }).click();
  await expect(page.locator('main h1')).toBeVisible();
}
async function switchRole(page: Page, role: 'personal' | 'aluno', student = 'ana') {
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
  if (role === 'aluno') await page.locator('#demo-student').selectOption(student);
  await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
}
async function approve(page: Page) {
  await page
    .getByLabel('Revisei aluno, contexto, dias, exercícios e parâmetros desta proposta fictícia.')
    .check();
  await page.getByRole('button', { name: 'Aprovar versão revisada', exact: true }).click();
  await page.getByRole('button', { name: 'Atribuir ficha ao aluno', exact: true }).click();
  await expect(page.locator('.review-panel')).toContainText('Ficha atribuída');
}
async function addRice(page: Page, quantity = '150') {
  await page.getByRole('button', { name: 'Adicionar alimento', exact: true }).click();
  await page.getByLabel('Buscar alimento', { exact: true }).fill('arroz');
  await page.getByLabel('Alimento da biblioteca', { exact: true }).selectOption('usda-168878');
  await page.getByLabel('Quantidade', { exact: true }).fill(quantity);
  await page.getByRole('button', { name: 'Registrar alimento', exact: true }).click();
  await expect(page.locator('.food-row')).toHaveCount(1);
}

for (const width of [390, 1280])
  test(`Studio gera, preserva, aprova, atribui e executa em ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await enter(page);
    await page.setViewportSize({ width, height: 900 });
    await navigate(page, 'MOVRA Studio');
    await page.getByRole('button', { name: 'Gerar treino personalizado', exact: true }).click();
    for (let step = 0; step < 5; step++)
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Gerar proposta de treino', exact: true }).click();
    await expect(page.locator('.studio-editor')).toBeVisible();
    await expect(page.locator('.day-tab')).toHaveCount(3);
    await page.getByLabel('Nome da ficha', { exact: true }).fill('Ficha Studio validada');
    const row = page.locator('.studio-exercise').first();
    await row.getByLabel('Séries', { exact: true }).fill('3');
    await row.getByLabel('Preservar', { exact: true }).check();
    await page.getByRole('button', { name: 'Gerar novamente este dia', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Comparar antes');
    await page
      .getByRole('button', { name: 'Confirmar substituição no rascunho', exact: true })
      .click();
    await expect(
      page.locator('.studio-exercise').first().getByLabel('Séries', { exact: true }),
    ).toHaveValue('3');
    await approve(page);
    await switchRole(page, 'aluno');
    await navigate(page, 'Meus treinos');
    const card = page.locator('.workout-card').filter({ hasText: 'Ficha Studio validada' }).first();
    await card.getByRole('link', { name: 'Iniciar treino', exact: true }).click();
    await page.getByRole('button', { name: 'Pausar sessão', exact: true }).click();
    await expect(page.locator('.set-check input').first()).toBeDisabled();
    await page.getByRole('button', { name: 'Retomar sessão', exact: true }).click();
    for (const check of await page.locator('.set-check input').all()) await check.check();
    await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Seu treino foi registrado na prévia.' }),
    ).toBeVisible();
    await page.getByLabel('Feedback ao personal (opcional)').fill('Registro fictício de execução.');
    await page.getByRole('button', { name: 'Salvar feedback da sessão' }).click();
    await expect(page.locator('.form-success')).toContainText('Feedback registrado');
    await page.reload();
    await expect(page.locator('#entry-form')).toBeVisible();
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
    await navigate(page, 'Histórico');
    await expect(
      page.locator('.history-row').filter({ hasText: 'Ficha Studio validada' }),
    ).toHaveCount(1);
    await switchRole(page, 'personal');
    await navigate(page, 'Alunos');
    await page.getByRole('link', { name: 'Abrir perfil de Ana Costa', exact: true }).click();
    await expect(
      page.getByText('Feedback do aluno: Registro fictício de execução.', { exact: true }),
    ).toBeVisible();
    await navigate(page, 'MOVRA Studio');
    await page.getByRole('button', { name: 'Abrir ficha', exact: true }).click();
    await page.getByLabel('Nome da ficha', { exact: true }).fill('Nova versão Studio');
    await approve(page);
    await switchRole(page, 'aluno');
    await navigate(page, 'Histórico');
    await expect(
      page.locator('.history-row').filter({ hasText: 'Ficha Studio validada' }),
    ).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });

test('Studio bloqueia geração automática de menores e contexto especial', async ({ page }) => {
  await enter(page);
  await navigate(page, 'MOVRA Studio');
  await page.getByRole('button', { name: 'Gerar treino personalizado', exact: true }).click();
  await page.getByLabel('Idade fictícia').fill('16');
  for (let step = 0; step < 5; step++)
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Gerar proposta de treino', exact: true }).click();
  await expect(page.locator('.studio-editor')).toHaveCount(0);
  await expect(page.locator('.review-required')).toContainText('Menor de idade');
  await page.getByRole('button', { name: 'Abrir planejamento supervisionado' }).click();
  await expect(page.locator('.studio-exercise')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Atribuir ficha ao aluno' })).toBeDisabled();
});

for (const width of [390, 1280])
  test(`Fuel calcula, edita, copia e preserva diário em ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await enter(page, 'aluno');
    await page.setViewportSize({ width, height: 900 });
    await navigate(page, 'Alimentação');
    await page.getByLabel('Mostrar estimativas nutricionais').check();
    await addRice(page);
    await expect(page.locator('.stats-grid')).toContainText('195 kcal');
    await page
      .getByRole('button', { name: 'Editar Arroz branco cozido, grão longo', exact: true })
      .click();
    await page.getByLabel('Quantidade', { exact: true }).fill('200');
    await page.getByRole('button', { name: 'Atualizar alimento', exact: true }).click();
    await expect(page.locator('.stats-grid')).toContainText('260 kcal');
    await page.getByRole('button', { name: 'Duplicar refeição', exact: true }).click();
    await expect(page.locator('.meal-card')).toHaveCount(2);
    await expect(page.locator('.stats-grid')).toContainText('520 kcal');
    await page
      .getByRole('button', { name: /^Excluir Arroz/ })
      .first()
      .click();
    await expect(page.locator('.stats-grid')).toContainText('260 kcal');
    await page.getByLabel('Data do diário').fill('2026-11-11');
    await expect(page.locator('.food-row')).toHaveCount(0);
    await addRice(page, '100');
    await expect(page.locator('.stats-grid')).toContainText('130 kcal');
    await page.reload();
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
    await navigate(page, 'Alimentação');
    await expect(page.locator('.stats-grid')).toContainText('260 kcal');
    await page.getByLabel('Data do diário').fill('2026-11-11');
    await expect(page.locator('.stats-grid')).toContainText('130 kcal');
    await page.screenshot({ path: `test-results/fuel-${width}.png`, fullPage: true });
  });

test('Fuel privacidade entre alunos, compartilhamento e revogação', async ({ page }) => {
  test.setTimeout(120000);
  await enter(page, 'aluno');
  await navigate(page, 'Alimentação');
  await addRice(page);
  await switchRole(page, 'personal');
  await navigate(page, 'Alimentação');
  await expect(
    page.getByRole('heading', { name: 'Este diário não foi compartilhado.' }),
  ).toBeVisible();
  await expect(page.locator('.meal-card')).toHaveCount(0);
  await switchRole(page, 'aluno');
  await navigate(page, 'Alimentação');
  await page.getByLabel('Compartilhar com o personal').check();
  await switchRole(page, 'personal');
  await navigate(page, 'Alimentação');
  await expect(page.locator('.food-row')).toHaveCount(1);
  await switchRole(page, 'aluno', 'bruno');
  await navigate(page, 'Alimentação');
  await expect(page.locator('.food-row')).toHaveCount(0);
  await switchRole(page, 'aluno', 'ana');
  await navigate(page, 'Alimentação');
  await page.getByLabel('Compartilhar com o personal').uncheck();
  await switchRole(page, 'personal');
  await navigate(page, 'Alimentação');
  await expect(page.locator('.meal-card')).toHaveCount(0);
});

test('Fuel alimento personalizado, estimativa parcial e receita', async ({ page }) => {
  await enter(page, 'aluno');
  await navigate(page, 'Alimentação');
  await page.getByLabel('Mostrar estimativas nutricionais').check();
  await page.getByRole('button', { name: 'Cadastrar alimento', exact: true }).click();
  await page.getByLabel('Nome do alimento', { exact: true }).fill('Produto fictício');
  await page.getByLabel('Porção de referência em gramas').fill('50');
  await page.getByLabel('Energia (kcal)', { exact: true }).fill('100');
  await page.getByRole('button', { name: 'Salvar alimento personalizado' }).click();
  await page.getByRole('button', { name: 'Adicionar alimento', exact: true }).click();
  await page.getByLabel('Buscar alimento', { exact: true }).fill('Produto fictício');
  await page
    .getByLabel('Alimento da biblioteca')
    .selectOption({ label: 'Produto fictício · personalizado' });
  await page.getByRole('button', { name: 'Registrar alimento', exact: true }).click();
  await expect(page.locator('.stats-grid')).toContainText('200 kcal');
  await expect(page.getByText('Estimativa parcial:', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Criar receita', exact: true }).click();
  await page.getByLabel('Nome da receita').fill('Arroz de exemplo');
  await page.getByLabel('Adicionar ingrediente').selectOption('usda-168878');
  await page.getByLabel('Peso final da receita pronta (g)').fill('200');
  await page.getByRole('button', { name: 'Salvar receita', exact: true }).click();
  await expect(page.locator('.form-success')).toContainText('Receita salva');
});

test('Studio manual: biblioteca, parâmetros, duplicação, ordem e modelo', async ({ page }) => {
  await enter(page);
  await navigate(page, 'MOVRA Studio');
  await page.getByRole('button', { name: 'Criar treino do zero', exact: true }).click();
  await page.getByLabel('Nome da ficha', { exact: true }).fill('Modelo manual validado');
  await page.getByLabel('Pesquisar exercício para adicionar').fill('abdominal');
  await page.getByLabel('Adicionar exercício', { exact: true }).selectOption('abdominal');
  const rows = page.locator('.studio-exercise');
  await expect(rows).toHaveCount(1);
  await rows.first().getByLabel('Repetições iniciais', { exact: true }).fill('8');
  await rows.first().getByLabel('Repetições finais (opcional)', { exact: true }).fill('12');
  await rows.first().getByLabel('Descanso (s)', { exact: true }).fill('90');
  await rows.first().getByRole('button', { name: 'Duplicar exercício', exact: true }).click();
  await expect(rows).toHaveCount(2);
  await rows.nth(1).getByLabel('Séries', { exact: true }).fill('4');
  await rows.nth(1).getByRole('button', { name: 'Mover item 2 para cima', exact: true }).click();
  await expect(rows.first().getByLabel('Séries', { exact: true })).toHaveValue('4');
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(rows.first().getByLabel('Séries', { exact: true })).not.toHaveValue('4');
  await page.getByLabel('Instruções da sessão').fill('Instrução fictícia revisável.');
  await page.getByRole('button', { name: 'Salvar como modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Prévia do aluno', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Modelo manual validado');
  await expect(page.getByRole('dialog')).toContainText('Instrução fictícia revisável.');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Explorar modelos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Usar modelo', exact: true })).toHaveCount(1);
});

test('Fuel menores: diário descritivo e números bloqueados', async ({ page }) => {
  await enter(page, 'aluno', 'clara');
  await navigate(page, 'Alimentação');
  await expect(page.getByLabel('Mostrar estimativas nutricionais')).toBeDisabled();
  await addRice(page);
  await expect(page.locator('.nutrition-numbers')).toHaveCount(0);
  await expect(page.locator('.stats-grid')).not.toContainText('kcal');
  await expect(page.locator('.review-required')).toContainText('menor de idade');
  await page.getByRole('button', { name: 'Cadastrar alimento', exact: true }).click();
  await expect(page.getByLabel('Energia (kcal)', { exact: true })).toHaveCount(0);
});

test('Studio e Fuel: acessibilidade, redução de movimento e redefinição', async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page);
  await navigate(page, 'MOVRA Studio');
  let result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole('button', { name: 'Gerar treino personalizado', exact: true }).click();
  result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await switchRole(page, 'aluno');
  await navigate(page, 'Alimentação');
  await addRice(page);
  result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await navigate(page, 'Meu perfil');
  await page.getByRole('button', { name: 'Redefinir dados demonstrativos' }).click();
  await page.getByRole('button', { name: 'Confirmar redefinição dos dados' }).click();
  await expect(page.locator('#entry-form')).toBeVisible();
  await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar na demonstração', exact: true }).click();
  await navigate(page, 'Alimentação');
  await expect(page.locator('.food-row')).toHaveCount(0);
});
