'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <h1>Não foi possível abrir esta tela.</h1>
      <p>Os dados de demonstração continuam disponíveis enquanto a página não for recarregada.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
