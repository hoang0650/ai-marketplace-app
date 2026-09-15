import React, { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  uri: string;
  terminal?: boolean;
  onLoad?: () => void;
  onError?: (message: string) => void;
};

export function GpuStreamPlayer({ uri, onLoad }: Props) {
  return (
    <View style={styles.fill}>
      {createElement('iframe', {
        src: uri,
        title: 'GPU stream',
        allow: 'fullscreen; autoplay; encrypted-media',
        allowFullScreen: true,
        style: {
          border: 0,
          width: '100%',
          height: '100%',
          background: '#000',
        },
        onLoad: () => onLoad?.(),
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
});
