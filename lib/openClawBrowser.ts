import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

/** Host HTTPS/WSS allowed when opening OpenClaw Control UI from the marketplace app. */
export const OPENCLAW_TRUSTED_HOST_SUFFIXES = ['aimarkets.vn'] as const;

export function isTrustedOpenClawUrl(url: string): boolean {
  try {
    const parsed = new URL(String(url || '').trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return true;
    }
    return OPENCLAW_TRUSTED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

export type OpenClawBrowserErrorCode = 'EMPTY_URL' | 'UNTRUSTED_URL' | 'CANNOT_OPEN';

export class OpenClawBrowserError extends Error {
  code: OpenClawBrowserErrorCode;

  constructor(code: OpenClawBrowserErrorCode, message?: string) {
    super(message || code);
    this.code = code;
  }
}

/**
 * Open Control UI + hash auto-login via in-app browser.
 * Prefer SFSafariViewController / Chrome Custom Tabs so system TLS applies
 * to `{userId}.openclaw.aimarkets.vn`.
 */
export async function openOpenClawUrl(url: string): Promise<void> {
  const trimmed = String(url || '').trim();
  if (!trimmed) {
    throw new OpenClawBrowserError('EMPTY_URL');
  }
  if (!isTrustedOpenClawUrl(trimmed)) {
    throw new OpenClawBrowserError('UNTRUSTED_URL', trimmed);
  }

  if (Platform.OS === 'android') {
    try {
      await WebBrowser.warmUpAsync();
    } catch {
      // optional
    }
  }

  try {
    await WebBrowser.openBrowserAsync(trimmed, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      enableBarCollapsing: true,
      showInRecents: true,
      createTask: false,
      controlsColor: '#c9a961',
    });
    return;
  } catch (browserError) {
    const canOpen = await Linking.canOpenURL(trimmed);
    if (!canOpen) {
      throw new OpenClawBrowserError(
        'CANNOT_OPEN',
        browserError instanceof Error ? browserError.message : undefined,
      );
    }
    await Linking.openURL(trimmed);
  }
}
