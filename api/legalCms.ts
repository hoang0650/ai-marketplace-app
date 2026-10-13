/** Public website origin. Legal pages are not bundled in the app; they open from here. */
export const WEB_ORIGIN = (process.env.EXPO_PUBLIC_WEB_URL || 'https://aimarkets.vn').replace(/\/$/, '');
