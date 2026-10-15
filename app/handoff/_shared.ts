import type { HandoffTarget } from '@/api/handoff';

/** Web paths in a claimed target → this app's routes. */
export function appPathFor(t: HandoffTarget): string {
  if (t.kind === 'builder') return `/builder/${t.id}`;
  return `/hire-agent/${t.id}`;
}
