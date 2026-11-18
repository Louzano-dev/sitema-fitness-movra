import { StudioPage } from '@/features/studio';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ revisao?: string }>;
}) {
  const { revisao } = await searchParams;
  return <StudioPage reviewQueue={revisao === '1'} />;
}
