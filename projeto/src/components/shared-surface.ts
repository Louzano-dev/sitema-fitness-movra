import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
gsap.registerPlugin(Flip);
let active: {
  overlay: HTMLElement;
  observer: MutationObserver;
  timer: ReturnType<typeof setTimeout>;
  frame: number;
  tween?: gsap.core.Tween;
} | null = null;
export function clearSharedSurface() {
  if (!active) return;
  active.observer.disconnect();
  clearTimeout(active.timer);
  cancelAnimationFrame(active.frame);
  active.tween?.kill();
  gsap.killTweensOf(active.overlay);
  active.overlay.remove();
  active = null;
  delete document.documentElement.dataset.sharedSurface;
}
/** Visual-only, inert snapshot: real controls and focus stay in the destination. */
export function beginSharedSurface(
  source: HTMLElement | null,
  selector: string,
  waitForUnmount = false,
) {
  clearSharedSurface();
  if (!source || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = source.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const overlay = source.cloneNode(true) as HTMLElement;
  overlay.removeAttribute('id');
  overlay.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  overlay.querySelectorAll('button,input,select,textarea,a').forEach((n) => {
    n.removeAttribute('name');
    n.setAttribute('tabindex', '-1');
  });
  overlay.setAttribute('aria-hidden', 'true');
  overlay.inert = true;
  overlay.classList.add('shared-surface-clone');
  const computed = getComputedStyle(source);
  Object.assign(overlay.style, {
    position: 'fixed',
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    margin: '0',
    zIndex: '150',
    pointerEvents: 'none',
    overflow: 'hidden',
    background:
      computed.backgroundColor === 'rgba(0, 0, 0, 0)'
        ? 'var(--popover, #fff)'
        : computed.backgroundColor,
    borderRadius: '16px',
    color: computed.color,
    transform: 'none',
    animation: 'none',
    viewTransitionName: 'none',
  });
  document.body.append(overlay);
  document.documentElement.dataset.sharedSurface = 'active';
  const observer = new MutationObserver(findTarget);
  function findTarget() {
    if (waitForUnmount && source?.isConnected) return;
    const target = document.querySelector<HTMLElement>(selector);
    if (!target || target === source || !active) return;
    observer.disconnect();
    active.frame = requestAnimationFrame(() => {
      if (!active) return;
      const destination = target.getBoundingClientRect();
      if (!destination.width || !destination.height) {
        clearSharedSurface();
        return;
      }
      active.tween = Flip.fit(overlay, target, {
        scale: true,
        duration: 0.28,
        ease: 'power3.inOut',
        onComplete: clearSharedSurface,
      }) as gsap.core.Tween;
      gsap.to(overlay, { opacity: 0, delay: 0.14, duration: 0.14, overwrite: 'auto' });
    });
  }
  active = { overlay, observer, frame: 0, timer: setTimeout(clearSharedSurface, 800) };
  observer.observe(document.body, { childList: true, subtree: true });
  findTarget();
}
