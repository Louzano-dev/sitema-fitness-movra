import { WorkoutEditor } from '@/features/personal/workout-editor';
export const metadata = { title: 'Editar treino' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkoutEditor key={id} id={id} />;
}
