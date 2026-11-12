import { StudentDetail } from '@/features/personal/student-detail';
export const metadata = { title: 'Perfil do aluno' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentDetail key={id} id={id} />;
}
