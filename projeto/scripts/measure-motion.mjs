import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    offline: true,
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(path.resolve(root, '../index.html')).href + '#/entrar');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.pin-spacer')).toHaveCount(1);
  const frames = await page.evaluate(async () => {
    const intervals = [];
    const tasks = [];
    const observer = new PerformanceObserver((list) =>
      tasks.push(...list.getEntries().map((entry) => entry.duration)),
    );
    observer.observe({ entryTypes: ['longtask'] });
    let previous = performance.now();
    await new Promise((resolve) => {
      let frame = 0;
      function next(now) {
        intervals.push(now - previous);
        previous = now;
        window.scrollTo(
          0,
          (Math.min(3000, document.documentElement.scrollHeight - innerHeight) * frame) / 179,
        );
        if (++frame < 180) requestAnimationFrame(next);
        else resolve();
      }
      requestAnimationFrame(next);
    });
    observer.disconnect();
    const sorted = intervals.slice(1).sort((a, b) => a - b);
    return {
      sampleFrames: sorted.length,
      medianMs: Number(sorted[Math.floor(sorted.length * 0.5)].toFixed(2)),
      p95Ms: Number(sorted[Math.floor(sorted.length * 0.95)].toFixed(2)),
      framesAbove50Ms: sorted.filter((ms) => ms > 50).length,
      longTasks: tasks.map((ms) => Number(ms.toFixed(2))),
    };
  });
  const lifecycle = [];
  for (let cycle = 1; cycle <= 3; cycle++) {
    await page.getByRole('button', { name: 'Experimentar a MOVRA' }).click();
    await page.getByRole('button', { name: 'Experimentar sem preencher' }).click();
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await expect(page.locator('video')).toHaveCount(0);
    await page.getByRole('button', { name: 'Conta de Alex Personal', exact: true }).click();
    await page.getByRole('button', { name: 'Sair da demonstração' }).click();
    await expect(page.locator('.pin-spacer')).toHaveCount(1);
    await expect(page.locator('video')).toHaveCount(1);
    lifecycle.push({ cycle, entryPins: 1, entryVideos: 1, appPins: 0, appVideos: 0 });
  }
  const result = {
    browser: browser.version(),
    viewport: '1280x900',
    scope:
      'Headless Chrome desktop, arquivo local offline; amostra indicativa, sem garantia para dispositivos físicos.',
    frames,
    lifecycle,
  };
  await fs.writeFile(
    path.join(root, 'docs/evidence/motion-observations.json'),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
  await context.close();
} finally {
  await browser.close();
}
