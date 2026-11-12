import { WorkoutEditor } from '@/features/personal/workout-editor';
export const metadata = { title: 'Criar treino' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string }>;
}) {
  const { aluno } = await searchParams;
  return <WorkoutEditor initialStudent={aluno} />;
}
