import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes = [
  '/personal',
  '/personal/alunos',
  '/personal/alunos/ana',
  '/personal/treinos',
  '/personal/treinos/novo',
  '/personal/treinos/treino-a',
  '/personal/exercicios',
  '/personal/evolucao',
  '/personal/agenda',
  '/personal/configuracoes',
  '/aluno',
  '/aluno/treinos',
  '/aluno/treinos/treino-a',
  '/aluno/historico',
  '/aluno/evolucao',
  '/aluno/perfil',
  '/admin',
  '/admin/organizacoes',
  '/admin/planos',
  '/admin/assinaturas',
];
for (const route of routes)
  test(`rota funcional: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Prévia funcional · dados em memória')).toBeVisible();
    expect(errors).toEqual([]);
  });

test('personal cria treino, aluno executa e personal vê histórico compartilhado', async ({
  page,
}) => {
  await page.goto('/personal/treinos/novo');
  await page.getByLabel('Nome do treino', { exact: true }).fill('Treino de validação');
  await page.getByLabel('Aluno', { exact: true }).selectOption('ana');
  await page.getByLabel('Adicionar exercício da biblioteca').selectOption('remada');
  await page.getByLabel('Adicionar exercício da biblioteca').selectOption('supino');
  await page.getByRole('button', { name: 'Mover exercício 2 para cima' }).click();
  await expect(page.locator('.exercise-editor').first()).toContainText('Supino');
  await page.getByRole('button', { name: 'Remover exercício 2' }).click();
  await page.getByLabel('Séries', { exact: true }).fill('2');
  await page.getByLabel('Repetições', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Salvar treino na prévia' }).click();
  await expect(page.getByRole('status')).toContainText('Treino atualizado');
  await page.getByLabel('Trocar ambiente demonstrativo').selectOption('aluno');
  await page.getByRole('link', { name: 'Meus treinos', exact: true }).click();
  const workout = page
    .locator('section.workout-card')
    .filter({ has: page.getByRole('heading', { name: 'Treino de validação' }) });
  await workout.getByRole('link', { name: 'Iniciar treino' }).click();
  await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('todas as séries');
  for (const number of [1, 2]) {
    await page
      .getByLabel(`Carga em kg, Supino com halteres, série ${number}`, { exact: true })
      .fill('15.5');
    await page.getByLabel(`Concluir Supino com halteres, série ${number}`, { exact: true }).check();
  }
  await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Seu treino foi registrado na prévia.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Revisar histórico' }).click();
  await page.getByRole('button', { name: /Ver registro de Treino de validação/ }).click();
  await expect(page.getByRole('dialog')).toContainText('15.5');
  await page.keyboard.press('Escape');
  await page.getByLabel('Trocar ambiente demonstrativo').selectOption('personal');
  await page.getByRole('link', { name: 'Alunos', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir perfil de Ana Costa' }).click();
  await expect(page.getByRole('heading', { name: 'Treino de validação' }).last()).toBeVisible();
});

test('alunos: criar, buscar, editar e estado vazio', async ({ page }) => {
  await page.goto('/personal/alunos');
  await page.getByRole('button', { name: 'Adicionar aluno', exact: true }).click();
  await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa de Validação');
  await page.getByLabel('E-mail fictício').fill('pessoa@example.com');
  await page.getByLabel('Objetivo do acompanhamento').fill('Testar o fluxo completo');
  await page.getByRole('button', { name: 'Adicionar aluno na prévia' }).click();
  await page.getByLabel('Buscar aluno', { exact: true }).fill('validação');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: 'Abrir perfil de Pessoa de Validação' }).click();
  await page.getByRole('button', { name: 'Editar aluno' }).click();
  await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa Atualizada');
  await page.getByRole('button', { name: 'Atualizar aluno na prévia' }).click();
  await expect(page.getByRole('heading', { name: 'Pessoa Atualizada', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar aos alunos' }).click();
  await page.getByLabel('Buscar aluno', { exact: true }).fill('zzzzz');
  await expect(page.getByRole('heading', { name: 'Nenhum resultado por aqui.' })).toBeVisible();
});

test('agenda: conflito, criação e cancelamento confirmado', async ({ page }) => {
  await page.goto('/personal/agenda');
  await page.getByRole('button', { name: 'Agendar encontro' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Aluno', { exact: true }).selectOption('ana');
  await dialog.getByLabel('Horário', { exact: true }).fill('09:30');
  await dialog.getByRole('button', { name: 'Agendar na prévia' }).click();
  await expect(dialog.getByRole('alert')).toContainText('conflita');
  await dialog.getByLabel('Horário', { exact: true }).fill('16:00');
  await dialog.getByRole('button', { name: 'Agendar na prévia' }).click();
  const row = page.locator('.agenda-entry').filter({ hasText: '16:00' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Cancelar sessão' }).click();
  await page.getByRole('button', { name: 'Confirmar cancelamento' }).click();
  await expect(row).toHaveCount(0);
  await page.getByLabel('Mostrar cancelados').check();
  await expect(page.locator('.agenda-entry').filter({ hasText: '16:00' })).toContainText(
    'Cancelado',
  );
});

test('admin: alteração de organização reflete na assinatura', async ({ page }) => {
  await page.goto('/admin/organizacoes');
  await page.getByRole('button', { name: 'Gerenciar Estúdio Horizonte' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Plano', { exact: true }).selectOption('essencial');
  await dialog.getByLabel('Situação', { exact: true }).selectOption('Pausada');
  await dialog.getByRole('button', { name: 'Confirmar alteração simulada' }).click();
  await expect(dialog.getByRole('status')).toContainText('Nenhuma cobrança');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Assinaturas', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: 'Estúdio Horizonte' });
  await expect(row).toContainText('Essencial');
  await expect(row).toContainText('Pausada');
});

test('responsividade: sem transbordamento nos três ambientes', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/personal',
      '/personal/treinos/novo',
      '/aluno',
      '/aluno/treinos/treino-a',
      '/admin/organizacoes',
    ]) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        content: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      expect(dimensions.content, `${route} em ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
    }
  }
});

test('menu mobile: foco, escape e navegação', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/personal');
  const trigger = page.getByRole('button', { name: 'Abrir menu' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('dialog').getByRole('link', { name: 'Agenda', exact: true }).click();
  await expect(page).toHaveURL(/\/personal\/agenda$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('acessibilidade automatizada WCAG A/AA nas telas e formulário', async ({ page }) => {
  for (const route of [
    '/personal',
    '/personal/alunos',
    '/personal/treinos/novo',
    '/aluno',
    '/aluno/treinos/treino-a',
    '/admin/organizacoes',
  ]) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations, route).toEqual([]);
  }
  await page.goto('/personal/alunos');
  await page.getByRole('button', { name: 'Adicionar aluno', exact: true }).click();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('movimento reduzido mantém treino utilizável', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/aluno/treinos/treino-a');
  await page.getByLabel('Concluir Agachamento livre, série 1', { exact: true }).check();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByRole('button', { name: 'Concluir treino', exact: true })).toBeVisible();
});

test('avaliação registrada pelo personal aparece para o aluno', async ({ page }) => {
  await page.goto('/personal/evolucao');
  await page.getByRole('button', { name: 'Registrar avaliação' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Peso (kg)', { exact: true }).fill('68.3');
  await dialog.getByLabel('Cintura (cm)', { exact: true }).fill('75.5');
  await dialog.getByRole('button', { name: 'Registrar na prévia' }).click();
  await expect(page.locator('main').getByRole('status')).toContainText('Avaliação registrada');
  await page.getByLabel('Trocar ambiente demonstrativo').selectOption('aluno');
  await page.getByRole('link', { name: 'Evolução', exact: true }).first().click();
  await expect(page.getByText('68,3 kg', { exact: true })).toBeVisible();
});

test('perfil do aluno atualiza também sua ficha', async ({ page }) => {
  await page.goto('/aluno/perfil');
  await page.getByLabel('Nome completo', { exact: true }).fill('Ana Perfil');
  await page.getByRole('button', { name: 'Salvar perfil na prévia' }).click();
  await expect(page.locator('main').getByRole('status')).toContainText('Perfil atualizado');
  await page.getByLabel('Trocar ambiente demonstrativo').selectOption('personal');
  await page.getByRole('link', { name: 'Alunos', exact: true }).click();
  await expect(page).toHaveURL(/\/personal\/alunos$/);
  await expect(
    page.getByRole('region', { name: 'Lista de alunos' }).getByText('Ana Perfil', { exact: true }),
  ).toBeVisible();
});

test('planos e exercícios possuem edição e filtros funcionais', async ({ page }) => {
  await page.goto('/admin/planos');
  await page.getByRole('button', { name: 'Editar plano demonstrativo' }).nth(1).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome do plano').fill('Profissional Revisado');
  await dialog.getByRole('button', { name: 'Salvar plano na prévia' }).click();
  await page.getByRole('link', { name: 'Organizações', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Estúdio Horizonte' })).toContainText(
    'Profissional Revisado',
  );
  await page.getByLabel('Trocar ambiente demonstrativo').selectOption('personal');
  await page.getByRole('link', { name: 'Exercícios', exact: true }).click();
  await page.getByLabel('Equipamento', { exact: true }).selectOption('Halteres');
  await expect(page.locator('.exercise-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Ver instruções' }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Siga a trajetória');
});

test('capturas para revisão visual em desktop e celular', async ({ page }) => {
  for (const [name, route, width, height] of [
    ['personal-desktop', '/personal', 1440, 1000],
    ['personal-mobile', '/personal', 390, 844],
    ['aluno-mobile', '/aluno', 390, 844],
    ['admin-desktop', '/admin', 1440, 1000],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('main h1')).toBeVisible();
    await page.screenshot({ path: `test-results/visual-${name}.png`, fullPage: width > 1000 });
  }
});
