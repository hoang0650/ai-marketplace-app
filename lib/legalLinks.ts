import * as WebBrowser from 'expo-web-browser';
import { WEB_ORIGIN } from '@/api/legalCms';
import { resolveLegalPolicy } from '@/constants/legal';

type Lang = 'vi' | 'en' | 'zh' | string | undefined;

function langParam(lang: Lang): string {
  return lang === 'en' || lang === 'zh' ? lang : 'vi';
}

/** Website URL (with `?lang=`) for a path such as `/account/delete`. */
export function webUrl(path: string, lang?: Lang): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${WEB_ORIGIN}${p}${p.includes('?') ? '&' : '?'}lang=${langParam(lang)}`;
}

/** https://aimarkets.vn/legal/<web slug>?lang=… — aliases (terms, privacy, seller-agreement…) resolve to the web slug. */
export function legalWebUrl(slugOrAlias?: string | null, lang?: Lang): string {
  const slug = resolveLegalPolicy(slugOrAlias)?.slug;
  return webUrl(slug ? `/legal/${slug}` : '/legal', lang);
}

/** Opens a page of the website in the in-app browser (SFSafariViewController / Custom Tabs). */
export async function openWeb(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    dismissButtonStyle: 'close',
  });
}

export function openLegal(slugOrAlias?: string | null, lang?: Lang): Promise<void> {
  return openWeb(legalWebUrl(slugOrAlias, lang));
}
