import React, { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/hooks/useT';

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

const TERMINAL_INJECT = `
(function(){
  var bar=document.getElementById('bar');
  var input=document.getElementById('cmd');
  var term=document.getElementById('term');
  if(bar) bar.style.setProperty('display','none','important');
  if(term){ term.style.bottom='0'; term.style.inset='0'; }
  if(input){ input.setAttribute('readonly','readonly'); input.blur(); }
  function fallbackRun(raw){
    if(!term) return;
    var cmd=String(raw||'').trim();
    term.textContent+='$ '+cmd+'\\n';
    if(!cmd){ term.scrollTop=term.scrollHeight; return; }
    var out='';
    if(cmd==='help') out='Commands: help, hostname, nvidia-smi, ls, date, python --version, python train.py, clear\\n';
    else if(cmd==='clear'||cmd==='cls'){ term.textContent=''; return; }
    else if(cmd==='hostname') out='gpu-lab\\n';
    else if(cmd==='whoami') out='buyer\\n';
    else if(cmd==='pwd') out='/workspace\\n';
    else if(cmd==='nvidia-smi'||cmd==='nvidia-smi -L') out='NVIDIA GPU\\n(sandbox nvidia-smi)\\n';
    else if(cmd==='ls'||cmd==='ls -la') out='checkpoints/  datasets/  models/  train.py  README.md\\n';
    else if(cmd==='python --version'||cmd==='python3 --version') out='Python 3.11.9\\n';
    else if(cmd==='python train.py'||cmd==='python3 train.py'||cmd==='train') out='Epoch 1/3  loss=2.41\\nEpoch 2/3  loss=1.88\\nEpoch 3/3  loss=1.52\\nSaved ./checkpoints/last.ckpt\\n';
    else if(cmd==='date') out=new Date().toISOString()+'\\n';
    else if(cmd.indexOf('echo ')===0) out=cmd.slice(5)+'\\n';
    else out='sandbox: command not found: '+cmd+'\\n';
    term.textContent+=out;
    term.scrollTop=term.scrollHeight;
  }
  window.__gpuRunCmd=function(cmd){
    cmd=String(cmd==null?'':cmd);
    if(typeof window.__gpuRun==='function'){ window.__gpuRun(cmd); return true; }
    if(input){
      input.removeAttribute('readonly');
      input.value=cmd;
      try{
        var ev=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true});
        Object.defineProperty(ev,'key',{get:function(){return 'Enter';}});
        Object.defineProperty(ev,'keyCode',{get:function(){return 13;}});
        input.dispatchEvent(ev);
      }catch(e){}
      var consumed=!String(input.value||'');
      input.value='';
      input.setAttribute('readonly','readonly');
      if(consumed) return true;
    }
    fallbackRun(cmd);
    return true;
  };
  true;
})();
`;

type Props = {
  uri: string;
  terminal?: boolean;
  onLoad?: () => void;
  onError?: (message: string) => void;
};

export function GpuStreamPlayer({ uri, terminal, onLoad, onError }: Props) {
  const source = useMemo(() => ({ uri }), [uri]);
  const webRef = useRef<WebView>(null);
  const [line, setLine] = useState('');
  const insets = useSafeAreaInsets();
  const { t } = useT();

  const send = () => {
    const cmd = line;
    setLine('');
    const payload = JSON.stringify(cmd);
    webRef.current?.injectJavaScript(
      `try{window.__gpuRunCmd(${payload})}catch(e){};true;`,
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <WebView
        ref={webRef}
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
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={!!terminal}
        automaticallyAdjustKeyboardInsets={!terminal}
        mixedContentMode="always"
        androidLayerType="hardware"
        overScrollMode="never"
        nestedScrollEnabled
        bounces={false}
        scrollEnabled={!!terminal}
        setSupportMultipleWindows={false}
        setBuiltInZoomControls={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={!!terminal}
        injectedJavaScript={terminal ? `${INJECT}${TERMINAL_INJECT}` : INJECT}
        injectedJavaScriptBeforeContentLoaded={INJECT}
        onLoadEnd={() => {
          if (terminal) webRef.current?.injectJavaScript(`${TERMINAL_INJECT}true;`);
          onLoad?.();
        }}
        onError={(e) => onError?.(e.nativeEvent.description || 'WEBVIEW_ERROR')}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 400) onError?.(`HTTP ${e.nativeEvent.statusCode}`);
        }}
      />
      {terminal ? (
        <View style={[styles.cmdBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Text style={styles.prompt}>$</Text>
          <TextInput
            value={line}
            onChangeText={setLine}
            placeholder="nvidia-smi"
            placeholderTextColor="rgba(232,255,242,0.35)"
            style={styles.cmdInput}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            keyboardType="ascii-capable"
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={send}
            enablesReturnKeyAutomatically
          />
          <Pressable onPress={send} style={styles.send} accessibilityRole="button" accessibilityLabel={t('compute.play.send')}>
            <Text style={styles.sendText}>{t('compute.play.send')}</Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  cmdBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#0c121c',
    borderTopWidth: 1,
    borderTopColor: '#1c2a3a',
  },
  prompt: { color: '#3dffb0', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14, fontWeight: '700' },
  cmdInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    color: '#e8fff2',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 15,
    paddingVertical: 8,
  },
  send: {
    backgroundColor: '#3dffb0',
    borderRadius: 8,
    paddingHorizontal: 14,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#071018', fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
});
