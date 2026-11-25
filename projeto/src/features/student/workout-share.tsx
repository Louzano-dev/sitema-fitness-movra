'use client';

import { lazy, Suspense, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useDemoSession } from '@/components/demo-session';
import { useRepository } from '@/components/providers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { workoutShare, type ShareSource } from '@/domain/workout-share';

const ShareEditor = lazy(() => import('./workout-share-editor'));

export function WorkoutShareButton({
  source,
  compact = false,
  primary = false,
  label,
}: {
  source: ShareSource;
  compact?: boolean;
  primary?: boolean;
  label?: string;
}) {
  const { session, studentId } = useDemoSession();
  const repository = useRepository();
  const [open, setOpen] = useState(false);
  if (
    session?.role !== 'aluno' ||
    (source.kind === 'workout' ? source.session : source.record).studentId !== studentId
  )
    return null;
  const share = open ? workoutShare(repository.getSnapshot(), studentId, source) : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="share-workout-trigger"
          variant={primary ? 'default' : 'outline'}
          size={compact ? 'sm' : 'default'}
          aria-label={label}
        >
          <Share2 aria-hidden="true" /> Compartilhar treino
        </Button>
      </DialogTrigger>
      <DialogContent className="share-editor-window">
        <DialogHeader>
          <DialogTitle>Compartilhar treino</DialogTitle>
          <DialogDescription>Sua foto é processada neste dispositivo.</DialogDescription>
        </DialogHeader>
        {open &&
          (share ? (
            <Suspense fallback={<p role="status">Abrindo editor…</p>}>
              <ShareEditor data={share} />
            </Suspense>
          ) : (
            <p role="status">Registro indisponível para compartilhar.</p>
          ))}
      </DialogContent>
    </Dialog>
  );
}
