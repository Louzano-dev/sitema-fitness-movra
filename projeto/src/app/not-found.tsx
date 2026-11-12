import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="standalone">
      <p className="eyebrow">MOVRA · 404</p>
      <h1>Este caminho não foi encontrado.</h1>
      <p>Volte ao seu espaço de acompanhamento.</p>
      <Link className="button-link" href="/personal">
        Ir para o dashboard
      </Link>
    </main>
  );
}
