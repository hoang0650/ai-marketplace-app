import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Download } from 'lucide-react-native';
import type { FileAttachment } from '@/api/types';
import { absUrl, fileSize } from '@/lib/attachments';
import { useTheme } from '@/hooks/useT';

/** Image previews (tap to open full size) + file rows that download via the signed link. */
export function Attachments({ items, dark }: { items?: FileAttachment[] | null; dark?: boolean }) {
  const { colors } = useTheme();
  if (!items?.length) return null;
  const fg = dark ? '#f2efe8' : colors.text;
  return (
    <View style={{ gap: 6, marginBottom: 6 }}>
      {items.map((a) =>
        a.kind === 'image' ? (
          <Pressable key={a.id} onPress={() => void Linking.openURL(absUrl(a.url))} accessibilityRole="imagebutton" accessibilityLabel={a.name}>
            <Image source={{ uri: absUrl(a.url) }} style={{ width: 220, height: 160, borderRadius: 10 }} contentFit="cover" />
          </Pressable>
        ) : (
          <Pressable
            key={a.id}
            onPress={() => void Linking.openURL(absUrl(a.downloadUrl))}
            accessibilityRole="link"
            accessibilityLabel={a.name}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, backgroundColor: 'rgba(127,127,127,0.14)', minWidth: 200 }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{(a.name.split('.').pop() || 'file').toUpperCase().slice(0, 4)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: fg, fontWeight: '600' }} numberOfLines={1}>{a.name}</Text>
              <Text style={{ color: fg, opacity: 0.7, fontSize: 11 }}>{fileSize(a.size)}</Text>
            </View>
            <Download size={18} color={fg} />
          </Pressable>
        ),
      )}
    </View>
  );
}
