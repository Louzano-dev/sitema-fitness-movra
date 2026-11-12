import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import './prepare-media.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const resolve = (...parts) => path.join(root, ...parts);
const input = await fs.readFile(resolve('src/app/globals.css'), 'utf8');
const scopedInput = input.replace(
  /@import ['"]tailwindcss['"];/,
  '@import "tailwindcss" source(none);\n@source "../../src";\n@source "../../standalone";',
);
const compiled = await postcss([tailwind({ base: root, optimize: true })]).process(scopedInput, {
  from: resolve('src/app/globals.css'),
  map: false,
});
const result = await build({
  absWorkingDir: root,
  entryPoints: [resolve('standalone/main.tsx')],
  tsconfig: resolve('tsconfig.json'),
  outfile: 'portable-output/app.js',
  bundle: true,
  write: false,
  minify: true,
  sourcemap: false,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100', 'firefox100', 'safari15.4'],
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'inline',
  loader: { '.woff2': 'dataurl', '.woff': 'dataurl', '.ttf': 'dataurl' },
  plugins: [
    {
      name: 'movra-portable',
      setup(builder) {
        builder.onLoad({ filter: /login-media\.ts$/ }, async () => ({
          contents: `export const LOGIN_VIDEO = ${JSON.stringify(
            await fs
              .readFile(resolve('public/media/movra-hero.mp4'))
              .then((buffer) => 'data:video/mp4;base64,' + buffer.toString('base64'))
              .catch(() => null),
          )}; export const LOGIN_POSTER = ${JSON.stringify('data:image/webp;base64,' + (await fs.readFile(resolve('public/media/movra-hero-poster.webp'))).toString('base64'))};`,
          loader: 'ts',
        }));
        builder.onResolve({ filter: /^next\/(link|navigation)$/ }, () => ({
          path: resolve('standalone/router.tsx'),
        }));
        builder.onResolve({ filter: /^movra:styles$/ }, () => ({
          path: 'styles',
          namespace: 'movra-css',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'movra-css' }, () => ({
          contents: compiled.css,
          loader: 'css',
          resolveDir: root,
        }));
      },
    },
  ],
});
const js = result.outputFiles.find((file) => file.path.endsWith('.js'))?.text;
const css = result.outputFiles.find((file) => file.path.endsWith('.css'))?.text;
if (!js || !css) throw new Error('O empacotamento não gerou scripts e estilos.');
if (/@import\s|url\(\s*["']?(?!data:)[^)]/i.test(css))
  throw new Error('O CSS ainda possui uma dependência externa.');
const licenses = await Promise.all(
  ['inter', 'space-grotesk'].map(
    async (font) =>
      `Fonte ${font}\n${await fs.readFile(resolve('node_modules/@fontsource', font, 'LICENSE'), 'utf8')}`,
  ),
);
const runtime =
  'data:application/javascript;charset=utf-8;base64,' + Buffer.from(js).toString('base64');
const fontLicense =
  'data:text/plain;charset=utf-8;base64,' + Buffer.from(licenses.join('\n\n')).toString('base64');
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#172C29"><meta name="robots" content="noindex,nofollow"><meta name="movra-distribution" content="standalone"><title>MOVRA · Seu próximo movimento</title><link rel="license" href="${fontLicense}"><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head><body><div id="root"></div><noscript><main style="padding:32px;font:16px system-ui"><h1>MOVRA</h1><p>Ative JavaScript para usar a demonstração.</p></main></noscript><script id="movra-runtime" src="${runtime}"></script>
</body></html>`;
const archive = resolve('reference/index.presentation.html');
await fs.mkdir(path.dirname(archive), { recursive: true });
try {
  await fs.access(archive);
} catch {
  const previous = await fs.readFile(resolve('../index.html'), 'utf8');
  if (previous.includes('name="movra-distribution"'))
    throw new Error(
      'Arquivo de referência ausente; não substituir a cópia anterior automaticamente.',
    );
  await fs.writeFile(archive, previous, { flag: 'wx' });
}
await fs.writeFile(resolve('../index.html'), html, 'utf8');
console.log(
  `index.html portátil gerado: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB. Sem arquivos externos.`,
);
