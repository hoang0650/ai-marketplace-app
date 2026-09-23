import { Linking } from 'react-native';
import type { Href } from 'expo-router';
import type { Banner } from '@/api/types';
import { href } from '@/lib/href';

type AppRouter = { push: (path: Href) => void };

/** Resolve banner tap to an in-app route (or open URL for external links). */
export function bannerHref(banner: Banner): string {
  const value = (banner.linkValue || '').trim();
  switch (banner.linkType) {
    case 'product':
      return value ? `/product/${value}` : '/(tabs)/explore';
    case 'category':
      return value ? `/category/${value}` : '/(tabs)/explore';
    case 'seller':
      return value ? `/seller/${value}` : '/(tabs)/explore';
    case 'agents':
      return '/agents';
    case 'explore':
      return '/(tabs)/explore';
    case 'url':
      return value || '/(tabs)/explore';
    default:
      return '/(tabs)/explore';
  }
}

export function openBanner(router: AppRouter, banner: Banner): void {
  const path = bannerHref(banner);
  if (banner.linkType === 'url' && /^https?:\/\//i.test(path)) {
    void Linking.openURL(path);
    return;
  }
  router.push(href(path));
}
