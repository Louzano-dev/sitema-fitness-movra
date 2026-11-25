import { PublicProfilePage } from '@/features/marketplace';
export default async function Page({params}:{params:Promise<{id:string}>}) {
  return <PublicProfilePage id={(await params).id}/>;
}
