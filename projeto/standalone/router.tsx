import {
  forwardRef,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type MouseEvent,
} from 'react';

const subscribe = (listener: () => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};
const snapshot = () => window.location.hash.slice(1) || '/entrar';

export function useLocation() {
  return useSyncExternalStore(subscribe, snapshot, () => '/personal');
}

export function usePathname() {
  return useLocation().split('?')[0];
}

function navigate(href: string, replace = false) {
  if (!href.startsWith('/') || href.startsWith('//')) return;
  if (replace) {
    window.history.replaceState(null, '', `#${href}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else window.location.hash = href;
}

export function useRouter() {
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, true),
    back: () => window.history.back(),
  };
}

const Link = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<'a'>>(function PortableLink(
  { href = '/personal', onClick, ...props },
  ref,
) {
  const internal = href.startsWith('/') && !href.startsWith('//');
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      !internal ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target === '_blank'
    )
      return;
    event.preventDefault();
    navigate(href);
  }
  return <a {...props} ref={ref} href={internal ? `#${href}` : href} onClick={handleClick} />;
});
export default Link;
