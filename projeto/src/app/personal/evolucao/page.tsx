import { ProgressPage } from '@/features/progress';
export const metadata = { title: 'Evolução física' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string }>;
}) {
  const { aluno } = await searchParams;
  return <ProgressPage initialStudent={aluno} />;
}
