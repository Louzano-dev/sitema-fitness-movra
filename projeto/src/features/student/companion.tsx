'use client';
import { useEffect, useRef, useState } from 'react';
import { companionImage } from './companion-media';
import './companion.css';

const artwork = ['inicio', 'ritmo', 'firme', 'forca', 'elite'] as const;
type Pose = 'idle' | 'celebrate';

export function Companion({
  stage,
  pose = 'idle',
  className = '',
}: {
  stage: number;
  pose?: Pose;
  className?: string;
}) {
  const name = artwork[stage] ?? artwork[0];
  return <CompanionPose key={name + pose} name={name} pose={pose} className={className} />;
}

function CompanionPose({
  name,
  pose,
  className,
}: {
  name: (typeof artwork)[number];
  pose: Pose;
  className: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    let inView = true;
    const update = () => setVisible(inView && !document.hidden);
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            update();
          });
    if (observer) observer.observe(target);
    else update();
    document.addEventListener('visibilitychange', update);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  useEffect(() => {
    if (
      pose !== 'celebrate' ||
      !visible ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const timer = window.setTimeout(() => setSettled(true), 1800);
    return () => window.clearTimeout(timer);
  }, [pose, visible]);
  const celebrating = pose === 'celebrate' && !settled;
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={'companion-figure ' + className}
      data-pose={celebrating ? 'celebrate' : 'idle'}
      data-in-view={visible}
    >
      {/* Raw local WebP also works when the standalone exporter embeds its data URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={companionImage(name + (celebrating ? '-vitoria' : '') + '.webp')}
        width={284}
        height={320}
        alt=""
        draggable={false}
      />
    </span>
  );
}
