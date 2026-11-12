import { WorkoutSessionPage } from '@/features/student/workout-session';
export const metadata = { title: 'Registrar treino' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkoutSessionPage key={id} id={id} />;
}
