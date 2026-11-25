'use client';
import { useDemoSession } from '@/components/demo-session';
import { TrainerConnect, StudentConnect } from './connect';
import { InviteQr } from './connect-qr';
export function ConnectPanel({ studentPage = false }: { studentPage?: boolean }) {
  const { session } = useDemoSession();
  const account = session?.account;
  if (!account && !studentPage) return null;
  if (account?.role === 'personal')
    return <TrainerConnect account={account} renderQr={(url) => <InviteQr url={url} />} />;
  return (
    <StudentConnect
      key={account?.id ?? 'guest'}
      account={account}
      initialCredential={session?.invitation}
    />
  );
}
