import { resolveLegalPolicy, type LegalPolicyMeta } from '@/constants/legal';

export const WEB_ORIGIN = (process.env.EXPO_PUBLIC_WEB_URL || 'https://aimarkets.vn').replace(/\/$/, '');

function looksLikeHtmlShell(text: string): boolean {
  const head = text.trimStart().slice(0, 200).toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html') || (head.includes('<head>') && head.includes('<meta'));
}

export function parseLegalDocMeta(markdown: string): { version?: string; effective?: string } {
  const version = /\*\*Phiên bản:\*\*\s*(.+)/i.exec(markdown)?.[1]?.trim();
  const effective =
    /\*\*Ngày hiệu lực:\*\*\s*(.+)/i.exec(markdown)?.[1]?.trim() ||
    /\*\*Effective date:\*\*\s*(.+)/i.exec(markdown)?.[1]?.trim();
  return { version, effective };
}

export async function fetchLegalMarkdown(file: string): Promise<string> {
  const res = await fetch(`${WEB_ORIGIN}/assets/legal/${file}`, {
    headers: { Accept: 'text/markdown, text/plain, */*' },
  });
  const text = (await res.text()).trim();
  if (!res.ok || !text || looksLikeHtmlShell(text)) {
    throw new Error('LEGAL_NOT_FOUND');
  }
  return text;
}

export async function loadLegalPolicy(slugOrAlias: string): Promise<{ meta: LegalPolicyMeta; markdown: string } | null> {
  const meta = resolveLegalPolicy(slugOrAlias);
  if (!meta) return null;
  const markdown = await fetchLegalMarkdown(meta.file);
  return { meta, markdown };
}
