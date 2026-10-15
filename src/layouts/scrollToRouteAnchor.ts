// Shared by route navigation to avoid post-mount scroll-to-top timers
// overriding explicit deep links. No scroll is attempted for unknown targets.
export function scrollToRouteAnchor(
  hash: string,
  findTarget: (id: string) => Pick<HTMLElement, 'scrollIntoView'> | null =
    (id) => document.getElementById(id),
): boolean {
  if (!hash.startsWith('#') || hash.length <= 1) return false;
  let id: string;
  try { id = decodeURIComponent(hash.slice(1)); } catch { return false; }
  if (!id) return false;
  const target = findTarget(id);
  if (!target) return false;
  target.scrollIntoView({ block: 'start', behavior: 'auto' });
  return true;
}
