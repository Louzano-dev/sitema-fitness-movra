'use client';
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import gsap from 'gsap';
export function usePremiumShell(path: string, navigate: (href: string) => void) {
  const sidebar = useRef<HTMLElement>(null),
    pending = useRef<(() => void) | null>(null),
    shared = useRef(false);
  const [compact, setCompact] = useState(false),
    [theme, setTheme] = useState<'light' | 'dark'>('light'),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const value = JSON.parse(localStorage.getItem('movra:appearance:1') ?? '{}');
        setCompact(value.compact === true);
        setTheme(value.theme === 'dark' ? 'dark' : 'light');
      } catch {}
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.movraTheme = theme;
    try {
      localStorage.setItem('movra:appearance:1', JSON.stringify({ compact, theme }));
    } catch {}
    return () => {
      delete document.documentElement.dataset.movraTheme;
    };
  }, [compact, theme, ready]);
  useLayoutEffect(() => {
    const root = sidebar.current;
    if (!root) return;
    const indicator = root.querySelector<HTMLElement>('.sidebar-active-track'),
      nav = root.querySelector<HTMLElement>('.sidebar-nav');
    if (!indicator || !nav) return;
    const position = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) return;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const first = !indicator.style.opacity;
      gsap.set(indicator, { height: active.offsetHeight, opacity: 1 });
      gsap.to(indicator, {
        y: active.offsetTop,
        duration: reduced || first ? 0 : 0.24,
        ease: 'power3.out',
        overwrite: true,
      });
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(nav);
    return () => {
      observer.disconnect();
      gsap.killTweensOf(indicator);
    };
  }, [path, compact, ready]);
  useLayoutEffect(() => {
    if (!pending.current) return;
    const header = document.querySelector<HTMLElement>('main .page-heading');
    if (shared.current && header) header.style.viewTransitionName = 'movra-focus';
    pending.current();
    pending.current = null;
  }, [path]);
  useEffect(
    () => () => {
      pending.current?.();
    },
    [],
  );
  function onNavigate(event: MouseEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.defaultPrevented
    )
      return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (
      !link ||
      link.target === '_blank' ||
      link.download ||
      link.closest('[role="dialog"]') ||
      innerWidth < 1000 ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !document.startViewTransition
    )
      return;
    const url = new URL(link.href, location.href);
    if (
      url.origin !== location.origin ||
      (url.pathname !== location.pathname && location.protocol === 'file:')
    )
      return;
    const target = url.hash.startsWith('#/') ? url.hash.slice(1) : url.pathname + url.search;
    if (!target.startsWith('/') || target === path || target.startsWith('/entrar')) return;
    event.preventDefault();
    const source = link.closest<HTMLElement>('.student-row,.workout-card,tr');
    shared.current = !!source;
    if (source) source.style.viewTransitionName = 'movra-focus';
    const transition = document.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          pending.current = resolve;
          navigate(target);
          setTimeout(() => {
            if (pending.current === resolve) {
              pending.current = null;
              resolve();
            }
          }, 700);
        }),
    );
    void transition.finished
      .catch(() => {})
      .finally(() => {
        document.querySelectorAll<HTMLElement>('[style*="view-transition-name"]').forEach((el) => {
          el.style.viewTransitionName = '';
        });
        shared.current = false;
      });
  }
  return { sidebar, compact, setCompact, theme, setTheme, ready, onNavigate };
}
