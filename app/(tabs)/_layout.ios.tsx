import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme, useT } from '@/hooks/useT';

// UIKit places the navigation in the system rail when iPhone Duo changes pose.
export default function IOSTabLayout() {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <NativeTabs tintColor={colors.tint} backgroundColor={colors.surface}>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('nav.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('nav.explore')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="safari" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('nav.orders')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="receipt" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('nav.messages')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('nav.profile')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
