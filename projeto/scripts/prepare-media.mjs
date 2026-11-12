import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const path = fileURLToPath(new URL('../public/media/movra-hero.mp4', import.meta.url));
const exists = await fs
  .stat(path)
  .then((stat) => stat.isFile() && stat.size > 0)
  .catch(() => false);
await fs.writeFile(
  new URL('../src/features/login-media.ts', import.meta.url),
  `// Gerado pela preparação de mídia. Não indica autenticação ou integração de backend.\nexport const LOGIN_VIDEO: string | null = ${exists ? "'/media/movra-hero.mp4'" : 'null'};\nexport const LOGIN_POSTER = '/media/movra-hero-poster.webp';\n`,
);
console.log(
  exists
    ? 'Vídeo local encontrado; reprodução habilitada com fallback.'
    : 'Vídeo pendente: usando somente o poster estático.',
);
