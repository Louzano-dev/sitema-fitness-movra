import { spawnSync } from 'node:child_process';
const result = spawnSync(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.portable.config.ts'],
  { stdio: 'inherit', env: { ...process.env, MOVRA_PORTABLE: '1' } },
);
process.exitCode = result.status ?? 1;
