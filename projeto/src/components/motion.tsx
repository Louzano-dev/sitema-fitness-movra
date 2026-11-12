'use client';
import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
export const motion = {
  quick: 0.12,
  feedback: 0.18,
  surface: 0.24,
  entrance: 0.5,
  ease: 'power2.out',
};
gsap.registerPlugin(useGSAP);
export function PageMotion({ children, route }: { children: ReactNode; route: string }) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(scope.current, { y: 8 }, { y: 0, duration: motion.surface, ease: motion.ease });
      });
      return () => media.revert();
    },
    { scope, dependencies: [route], revertOnUpdate: true },
  );
  return (
    <div ref={scope} className="page-motion">
      {children}
    </div>
  );
}
