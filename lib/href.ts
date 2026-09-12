import type { Href } from 'expo-router';

/** Typed routes lag behind new files; keep navigation as strings. */
export function href(path: string): Href {
  return path as unknown as Href;
}
