import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test('rotina independente registra conclusão manual, descanso e preferência de visibilidade', async ({
  page,
}) => {
  const entry =
    process.env.MOVRA_PORTABLE === '1'
      ? pathToFileURL(path.resolve('../index.html')).href + '#/entrar'
      : '/entrar';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date('2026-11-02T15:00:00Z'));
  await page.goto(entry);
  await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar na demonstração' }).click();
  await page.getByText('Definir meus dias de treino', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Segunda', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar dias de treino' }).click();
  await expect(page.getByText('0 de 1 nesta semana')).toBeVisible();
  await page.getByRole('link', { name: 'Começar meu treino' }).click();
  await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar que concluí sem registrar séries' }).click();
  await expect(
    page.getByText('Conclusão declarada por você, sem séries registradas.'),
  ).toBeVisible();
  await expect(page.locator('.habit-celebration')).toContainText('1 de 1');
  expect(
    await page
      .locator('.habit-celebration .habit-fire svg')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.getByRole('link', { name: 'Voltar ao início' }).click();
  await expect(page.locator('.habit-banner h2')).toHaveText(
    '1 treino programado concluído em sequência',
  );
  await page.getByRole('link', { name: 'Começar meu treino' }).click();
  await page.getByRole('button', { name: 'Concluir treino', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar que concluí sem registrar séries' }).click();
  await expect(
    page.getByText('Conclusão declarada por você, sem séries registradas.'),
  ).toBeVisible();
  await expect(page.locator('.habit-celebration')).toHaveCount(0);
  await page.getByRole('link', { name: 'Voltar ao início' }).click();
  await page.getByText('Registrar treino sem ficha', { exact: true }).click();
  await page.getByLabel('Atividade realizada').fill('Mobilidade');
  await page.getByLabel('Duração em minutos').fill('10');
  await page.getByRole('checkbox', { name: 'Treino extra, fora da meta' }).check();
  await page.getByRole('button', { name: 'Registrar atividade de hoje' }).click();
  await expect(page.getByText('Treino declarado no histórico de hoje.')).toBeVisible();
  await expect(page.getByText('1 de 1 nesta semana')).toBeVisible();
  await expect(page.locator('.habit-celebration')).toContainText(
    'Atividade salva no seu histórico.',
  );
  await expect(page.locator('.habit-celebration .habit-unlock')).toHaveCount(0);
  await page
    .locator('.desktop-sidebar')
    .getByRole('link', { name: /perfil/i })
    .click();
  await page.getByRole('checkbox', { name: 'Mostrar sequência e mascote' }).uncheck();
  await page.locator('.desktop-sidebar').getByRole('link', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha rotina' })).toBeVisible();
  await expect(page.locator('.habit-banner')).toHaveCount(0);
});

test('acende a chama sem pontuar a entrada e reconhece uma evolução após semana encerrada uma única vez', async ({
  page,
}) => {
  const entry =
    process.env.MOVRA_PORTABLE === '1'
      ? pathToFileURL(path.resolve('../index.html')).href + '#/entrar'
      : '/entrar';
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.setFixedTime(new Date('2026-11-02T15:00:00Z'));
  async function enter() {
    await page.goto(entry);
    await page.getByRole('button', { name: 'Aluno / atleta', exact: true }).click();
    await page.getByRole('button', { name: 'Entrar na demonstração' }).click();
  }
  await enter();
  const banner = page.locator('.habit-banner');
  await banner.scrollIntoViewIfNeeded();
  await expect(banner).toHaveAttribute('data-onscreen', 'true');
  await expect(banner.locator('.habit-fire svg')).toHaveCSS('animation-name', 'habit-ignite');
  await expect(banner.locator('.habit-fire svg')).toHaveCSS('animation-iteration-count', '1');
  await expect(banner.locator('h2 strong')).toHaveText('0');
  await page.getByText('Definir meus dias de treino', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Segunda', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar dias de treino' }).click();
  await page.getByText('Registrar treino sem ficha', { exact: true }).click();
  await page.getByLabel('Atividade realizada').fill('Treino de força');
  await page.getByLabel('Duração em minutos').fill('20');
  await page.getByRole('button', { name: 'Registrar atividade de hoje' }).click();
  await expect(page.locator('.habit-celebration')).toContainText('Primeiro treino');
  await page.clock.setFixedTime(new Date('2026-11-09T15:00:00Z'));
  await page.reload();
  await enter();
  await banner.scrollIntoViewIfNeeded();
  await expect(banner.getByRole('status')).toContainText('Você evoluiu! Início → Ritmo');
  await expect(banner.locator('h2 strong')).toHaveText('1');
  await expect(page.locator('.habit-celebration')).toHaveCount(0);
  await page.getByText('Evolução e conquistas', { exact: true }).click();
  await expect(page.locator('.habit-awards')).toContainText('Primeira semana com meta alcançada');
  await page.getByRole('button', { name: 'Ver pose do estágio Início' }).click();
  await expect(page.locator('.habit-pose-preview figcaption')).toHaveText(
    'Pose desbloqueada · Início',
  );
  await page.reload();
  await enter();
  await banner.scrollIntoViewIfNeeded();
  await expect(banner).toHaveAttribute('data-onscreen', 'true');
  await expect(banner.locator('.habit-stage-label')).toContainText('Ritmo');
  await expect(banner.getByRole('status')).toHaveCount(0);
});
