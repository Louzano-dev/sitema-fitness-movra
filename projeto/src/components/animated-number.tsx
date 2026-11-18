'use client';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
const format = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export function AnimatedNumber({ value, suffix = '' }: { value: number | null; suffix?: string }) {
  const node = useRef<HTMLSpanElement>(null),
    previous = useRef<number | null>(null);
  useLayoutEffect(() => {
    const target = node.current;
    if (!target) return;
    const final = value === null ? 'Não disponível' : format(value);
    const from = previous.current;
    previous.current = value;
    if (value === null || from === null || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      target.textContent = final;
      return;
    }
    const proxy = { value: from };
    const tween = gsap.to(proxy, {
      value,
      duration: 0.22,
      ease: 'power2.out',
      onUpdate: () => {
        target.textContent = format(proxy.value);
      },
      onComplete: () => {
        target.textContent = final;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value]);
  return (
    <>
      <span className="sr-only">
        {value === null ? 'Não disponível' : format(value)}
        {value === null ? '' : suffix}
      </span>
      <span aria-hidden="true">
        <span ref={node}>{value === null ? 'Não disponível' : format(value)}</span>
        {value === null ? '' : suffix}
      </span>
    </>
  );
}
