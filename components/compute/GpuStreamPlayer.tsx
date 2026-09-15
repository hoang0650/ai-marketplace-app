import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const INJECT = `
(function(){
  var m=document.querySelector('meta[name=viewport]');
  if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m);}
  m.setAttribute('content','width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
  document.documentElement.style.touchAction='manipulation';
  document.body&&(document.body.style.touchAction='manipulation');
  true;
})();
`;

type Props = {
  uri: string;
  onLoad?: () => void;
  onError?: (message: string) => void;
};

export function GpuStreamPlayer({ uri, onLoad, onError }: Props) {
  const source = useMemo(() => ({ uri }), [uri]);
  return (
    <View style={styles.fill}>
      <WebView
        source={source}
        style={styles.fill}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        cacheEnabled
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        androidLayerType="hardware"
        overScrollMode="never"
        nestedScrollEnabled
        bounces={false}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        setBuiltInZoomControls={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        injectedJavaScript={INJECT}
        injectedJavaScriptBeforeContentLoaded={INJECT}
        onLoadEnd={onLoad}
        onError={(e) => onError?.(e.nativeEvent.description || 'WEBVIEW_ERROR')}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 400) onError?.(`HTTP ${e.nativeEvent.statusCode}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
});
