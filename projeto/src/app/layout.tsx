import type { Metadata } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import './globals.css';
import { DemoProvider } from '@/components/providers';
export const metadata: Metadata = {
  title: { default: 'MOVRA · Seu acompanhamento, de perto', template: '%s · MOVRA' },
  description: 'Frontend demonstrativo MOVRA para personal trainers, alunos e operação do SaaS.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
