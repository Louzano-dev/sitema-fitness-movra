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
export function PageMotion({
  children,
  route,
  focusPage = true,
}: {
  children: ReactNode;
  route: string;
  focusPage?: boolean;
}) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          scope.current,
          { opacity: 0.85, y: 8 },
          { opacity: 1, y: 0, duration: motion.surface, ease: motion.ease },
        );
        gsap.fromTo(
          scope.current!.querySelectorAll('.stat,.welcome-banner,.student-welcome'),
          { y: 8 },
          { y: 0, stagger: 0.035, duration: motion.surface, ease: motion.ease },
        );
      });
      const heading = focusPage ? scope.current?.querySelector('h1') : null;
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      if (focusPage) window.scrollTo({ top: 0, behavior: 'instant' });
      return () => media.revert();
    },
    { scope, dependencies: [route, focusPage], revertOnUpdate: true },
  );
  return (
    <div ref={scope} className="page-motion">
      {children}
    </div>
  );
}
