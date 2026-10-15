import * as Crypto from 'expo-crypto';

/** Same checks as the web form / API: http(s) URL, https-only where the buyer's player or our webhook call needs it. */
export function urlError(raw: string, httpsOnly: boolean): 'scn.err.https' | 'scn.err.url' | null {
  const v = raw.trim();
  if (!v) return null;
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^/?#\s]+)/i.exec(v);
  if (!m) return 'scn.err.url';
  const proto = m[1].toLowerCase();
  if (httpsOnly && proto !== 'https') return 'scn.err.https';
  if (proto !== 'http' && proto !== 'https') return 'scn.err.url';
  return null;
}

/** `whsec_` + 48 hex chars from the OS CSPRNG (shown once, never returned by the API). */
export function generateWebhookSecret(): string {
  const bytes = Crypto.getRandomBytes(24);
  return `whsec_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
