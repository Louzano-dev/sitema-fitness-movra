'use client';
import { useRef, useLayoutEffect, type ReactNode } from 'react';
import { Flip } from 'gsap/Flip';
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
gsap.registerPlugin(Flip);
export function useExerciseReorder() {
  const retiring = useRef(new Set<HTMLElement>());
  const pending = useRef<ReturnType<typeof Flip.getState> | null>(null),
    tween = useRef<gsap.core.Timeline | null>(null);
  useLayoutEffect(() => {
    if (!pending.current) return;
    tween.current?.kill();
    tween.current = Flip.from(pending.current, {
      duration: motion.surface,
      ease: motion.ease,
      targets: '.studio-exercise',
      prune: true,
      onEnter: (elements) =>
        gsap.fromTo(
          elements,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.2, clearProps: 'opacity,transform' },
        ),
    });
    pending.current = null;
  });
  useLayoutEffect(
    () => () => {
      tween.current?.kill();
      pending.current = null;
      retiring.current.forEach((el) => {
        gsap.killTweensOf(el);
        el.remove();
      });
      retiring.current.clear();
    },
    [],
  );
  return (nextIds?: string[]) => {
    if (nextIds && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll<HTMLElement>('.studio-exercise').forEach((el) => {
        if (nextIds.includes(el.dataset.flipId ?? '')) return;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) return;
        const clone = el.cloneNode(true) as HTMLElement;
        clone.className = 'retiring-surface';
        clone.removeAttribute('data-flip-id');
        clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
        clone.inert = true;
        clone.setAttribute('aria-hidden', 'true');
        const style = getComputedStyle(el);
        Object.assign(clone.style, {
          position: 'fixed',
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          overflow: 'hidden',
          background: style.backgroundColor,
          color: style.color,
          padding: style.padding,
          border: style.border,
          borderRadius: style.borderRadius,
          pointerEvents: 'none',
          zIndex: '45',
        });
        document.body.append(clone);
        retiring.current.add(clone);
        gsap.to(clone, {
          opacity: 0,
          y: -8,
          scale: 0.98,
          duration: 0.16,
          onComplete: () => {
            clone.remove();
            retiring.current.delete(clone);
          },
        });
      });
    }
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
      pending.current = Flip.getState('.studio-exercise');
  };
}
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
        if (document.documentElement.dataset.sharedSurface) return;
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
