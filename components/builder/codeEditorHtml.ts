/**
 * Self-contained VS Code–style mobile editor page (CodeMirror 6 from esm.sh) rendered inside a
 * WebView (native) or an iframe (Expo web). Talks to the host via postMessage:
 *   host → page: { type: 'init' | 'files', files, path?, generating?, labels? }
 *   page → host: { type: 'ready' } | { type: 'save', path, content } | { type: 'dirty', dirty } | { type: 'preview' }
 */
export const CODE_EDITOR_HTML = String.raw`<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#1e1e1e;color:#ccc;font:14px system-ui,-apple-system,sans-serif;overflow:hidden;-webkit-tap-highlight-color:transparent}
#app{position:fixed;left:0;right:0;top:0;height:100%;display:flex;flex-direction:column}
button{font:inherit;color:inherit;background:none;border:0;padding:0;touch-action:manipulation}
.top{display:flex;min-height:44px;background:#181818;border-bottom:1px solid #2b2b2b}
.ib{flex:none;width:44px;min-height:44px;font-size:17px;display:flex;align-items:center;justify-content:center}.ib:disabled{opacity:.35}
.tabs{display:flex;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}
.tab{flex:none;display:flex;align-items:center;max-width:11rem;background:#2d2d2d;color:#969696;border-right:1px solid #2b2b2b}
.tab.on{background:#1e1e1e;color:#fff;box-shadow:inset 0 2px 0 #0078d4}
.tn{min-height:44px;padding:0 4px 0 12px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;gap:6px;align-items:center}
.tx{width:32px;min-height:44px;font-size:12px;opacity:.7}.dot{color:#e2c08d;font-size:10px}
.fi{display:inline-block;min-width:1.2em;text-align:center;font:700 10px ui-monospace,monospace;color:#519aba}
.crumb{padding:3px 12px;font-size:12px;color:#8b8b8b;border-bottom:1px solid #2b2b2b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ed{flex:1;min-height:0;position:relative}#ed .cm-editor{position:absolute;inset:0;font-size:13.5px}#ed .cm-gutters{background:#1e1e1e}
#ed textarea{position:absolute;inset:0;width:100%;height:100%;background:#1e1e1e;color:#d4d4d4;border:0;padding:8px;font:13px ui-monospace,monospace;resize:none}
.cm-panel.cm-search input,.cm-panel.cm-search button{min-height:36px;font-size:14px}
.keys{display:flex;gap:4px;padding:4px;overflow-x:auto;background:#252526;border-top:1px solid #2b2b2b;scrollbar-width:none}.keys::-webkit-scrollbar{display:none}
.keys button{flex:none;min-width:44px;min-height:44px;padding:0 8px;border:1px solid #3c3c3c;border-radius:8px;background:#333;color:#e7e7e7;font:600 15px ui-monospace,monospace}.keys button:active{background:#0078d4}
.st{display:flex;gap:10px;align-items:center;min-height:26px;padding:0 10px;background:#0078d4;color:#fff;font-size:12px;white-space:nowrap;overflow:hidden}.grow{flex:1}
.probs{max-height:30%;overflow:auto;background:#1e1e1e;border-top:1px solid #2b2b2b;font:12px ui-monospace,monospace;display:none}.probs.open{display:block}
.probs button{display:block;width:100%;text-align:left;padding:8px 12px;min-height:36px}
.bd{position:absolute;inset:0;background:rgba(0,0,0,.5);z-index:5;display:none}.dr{position:absolute;top:0;bottom:0;left:0;width:min(85%,320px);z-index:6;background:#181818;border-right:1px solid #2b2b2b;overflow-y:auto;transform:translateX(-100%);transition:transform .18s ease-out}
.open .bd{display:block}.open .dr{transform:none}
.hd{display:flex;align-items:center;justify-content:space-between;min-height:44px;padding-left:12px;font:700 11px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#bbb}
.row{display:flex;align-items:center;gap:4px;width:100%;min-height:44px;padding-right:12px;text-align:left;color:#ccc}.row.on{background:#37373d;color:#fff}
.chev{width:14px;font-size:11px;color:#8b8b8b}.nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.empty{flex:1;display:flex;align-items:center;justify-content:center;color:#8b8b8b;padding:24px;text-align:center}
</style></head><body><div id="app">
<div class="top"><button class="ib" id="exp" aria-label="Explorer">☰</button><div class="tabs" id="tabs"></div><button class="ib" id="save" aria-label="Save" disabled>💾</button><button class="ib" id="pv" aria-label="Preview">▶</button></div>
<div class="crumb" id="crumb"></div><div id="ed"></div><div class="probs" id="probs"></div>
<div class="keys" id="keys"></div>
<div class="st"><span id="ver">⎇</span><button id="pb">⛔ 0 ⚠ 0</button><span class="grow"></span><span id="pos">Ln 1, Col 1</span><span id="lang"></span><span id="state"></span></div>
<div class="bd" id="bd"></div><aside class="dr" id="dr"><div class="hd"><span id="exl">Explorer</span><button class="ib" id="dx">✕</button></div><div id="tree"></div></aside>
</div>
<script type="module">
const $=(id)=>document.getElementById(id);
const S={files:[],tabs:[],path:'',drafts:{},gen:false,collapsed:new Set(),L:{saved:'Saved',unsaved:'Unsaved',ai:'AI writing…',explorer:'Explorer',pick:'Pick a file'}};
const post=(m)=>{const s=JSON.stringify(m);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else parent.postMessage({__aimEditor:1,...m},'*')};
const icon=(p)=>({tsx:'⚛',jsx:'⚛',ts:'TS',js:'JS',json:'{}',html:'<>',css:'#',md:'M↓'})[(p.split('.').pop()||'').toLowerCase()]||'·';
const base=(p)=>p.split('/').pop();
const langName=(p)=>({tsx:'TypeScript JSX',ts:'TypeScript',jsx:'JavaScript JSX',js:'JavaScript',json:'JSON',md:'Markdown',html:'HTML',css:'CSS'})[(p.split('.').pop()||'').toLowerCase()]||'Text';
const content=(p)=>S.drafts[p]??(S.files.find(f=>f.path===p)||{}).content??'';
const dirty=(p)=>p in S.drafts&&S.drafts[p]!==((S.files.find(f=>f.path===p)||{}).content??'');
let CM=null,view=null,ta=null,silent=false;
try{
  const v='?target=es2020';
  const [cm,st,vw,js,jn,ht,cs,od,cmd,sr,lint,lng]=await Promise.all(['codemirror@6.0.2','@codemirror/state@6','@codemirror/view@6','@codemirror/lang-javascript@6','@codemirror/lang-json@6','@codemirror/lang-html@6','@codemirror/lang-css@6','@codemirror/theme-one-dark@6','@codemirror/commands@6','@codemirror/search@6','@codemirror/lint@6','@codemirror/language@6'].map(m=>import('https://esm.sh/'+m+v)));
  CM={cm,st,vw,js,jn,ht,cs,od,cmd,sr,lint,lng};
}catch(e){CM=null}
function langExt(p){if(!CM)return[];const e=(p.split('.').pop()||'').toLowerCase();
  if(e==='json')return CM.jn.json();if(e==='html')return CM.ht.html();if(e==='css')return CM.cs.css();
  if(['ts','tsx','js','jsx','mjs'].includes(e))return CM.js.javascript({typescript:e.startsWith('t'),jsx:e.endsWith('x')||e==='js'});return[]}
function linter(p){if(!CM)return[];const e=(p.split('.').pop()||'').toLowerCase();
  if(e==='json')return CM.lint.linter(v=>{const t=v.state.doc.toString();if(!t.trim())return[];try{JSON.parse(t);return[]}catch(x){const m=/position (\d+)/.exec(String(x.message));const pos=Math.min(m?+m[1]:0,t.length);return[{from:pos,to:Math.min(pos+1,t.length),severity:'error',message:x.message}]}},{delay:300});
  if(!['ts','tsx','js','jsx','mjs'].includes(e))return[];
  return CM.lint.linter(v=>{const out=[],len=v.state.doc.length;CM.lng.syntaxTree(v.state).cursor().iterate(n=>{if(!n.type.isError||out.length>=100)return;const f=Math.min(n.from,len);out.push({from:f,to:Math.min(Math.max(n.to,f+1),len),severity:'error',message:'Syntax error near “'+v.state.sliceDoc(f,Math.min(f+12,len)).split('\n')[0]+'”'})});return out},{delay:300})}
let comp={};
function mount(){
  const host=$('ed');host.innerHTML='';
  if(!CM){ta=document.createElement('textarea');ta.spellcheck=false;ta.oninput=()=>{S.drafts[S.path]=ta.value;refresh()};host.appendChild(ta);return}
  const {EditorState,Compartment}=CM.st;comp={lang:new Compartment(),lint:new Compartment(),ro:new Compartment()};
  view=new CM.vw.EditorView({parent:host,state:EditorState.create({doc:'',extensions:[CM.cm.basicSetup,CM.lint.lintGutter(),CM.od.oneDark,comp.lang.of([]),comp.lint.of([]),comp.ro.of(EditorState.readOnly.of(false)),
    CM.vw.keymap.of([{key:'Mod-s',preventDefault:true,run:()=>{doSave();return true}}]),
    CM.vw.EditorView.updateListener.of(u=>{
      if(u.docChanged&&!silent){S.drafts[S.path]=u.state.doc.toString();refresh()}
      if(u.selectionSet||u.docChanged){const h=u.state.selection.main.head,l=u.state.doc.lineAt(h);$('pos').textContent='Ln '+l.number+', Col '+(h-l.from+1)}
      if(u.transactions.length){const list=[];CM.lint.forEachDiagnostic(u.state,(d,from)=>{const l=u.state.doc.lineAt(from);list.push({sev:d.severity,msg:d.message,line:l.number,col:from-l.from+1,from})});probs(list)}
    })]})});
}
function probs(list){const e=list.filter(x=>x.sev==='error').length;$('pb').textContent='⛔ '+e+' ⚠ '+(list.length-e);$('pb').style.fontWeight=list.length?'700':'400';
  const box=$('probs');box.innerHTML='';list.forEach(p=>{const b=document.createElement('button');b.textContent=(p.sev==='error'?'⛔ ':'⚠️ ')+p.msg+' ['+p.line+':'+p.col+']';b.onclick=()=>{view.dispatch({selection:{anchor:p.from},scrollIntoView:true});view.focus()};box.appendChild(b)})}
function load(p){
  S.path=p;if(p&&!S.tabs.includes(p))S.tabs.push(p);
  const doc=content(p);
  if(view){silent=true;view.dispatch({changes:{from:0,to:view.state.doc.length,insert:doc},effects:[comp.lang.reconfigure(langExt(p)),comp.lint.reconfigure(linter(p))]});silent=false}
  else if(ta)ta.value=doc;
  $('ed').style.display=p?'':'none';$('crumb').textContent=p?p.split('/').join(' › '):S.L.pick;$('lang').textContent=p?langName(p):'';
  refresh();
}
function setRO(r){if(view)view.dispatch({effects:comp.ro.reconfigure(CM.st.EditorState.readOnly.of(r))});if(ta)ta.readOnly=r}
function refresh(){
  const t=$('tabs');t.innerHTML='';
  S.tabs.forEach(p=>{const d=document.createElement('div');d.className='tab'+(p===S.path?' on':'');
    const n=document.createElement('button');n.className='tn';n.innerHTML='<span class="fi"></span><span></span>'+(dirty(p)?'<span class="dot">●</span>':'');n.children[0].textContent=icon(p);n.children[1].textContent=base(p);n.onclick=()=>load(p);
    const x=document.createElement('button');x.className='tx';x.textContent='✕';x.onclick=()=>closeTab(p);d.append(n,x);t.appendChild(d)});
  const dd=dirty(S.path);$('save').disabled=!dd||S.gen;$('state').textContent=S.path?(S.gen?S.L.ai:dd?S.L.unsaved:S.L.saved):'';
  post({type:'dirty',dirty:S.tabs.some(dirty)});
}
function closeTab(p){const i=S.tabs.indexOf(p);S.tabs.splice(i,1);delete S.drafts[p];if(p===S.path)load(S.tabs[Math.min(i,S.tabs.length-1)]||'');else refresh()}
function doSave(){if(!S.path||!dirty(S.path)||S.gen)return;post({type:'save',path:S.path,content:S.drafts[S.path]})}
function tree(){
  const dirs=new Set();S.files.forEach(f=>{const a=f.path.split('/');for(let i=1;i<a.length;i++)dirs.add(a.slice(0,i).join('/'))});
  const all=[...dirs].map(d=>({k:'d',p:d})).concat(S.files.map(f=>({k:'f',p:f.path})));
  const key=r=>r.p.split('/').map((s,i,a)=>(i===a.length-1&&r.k==='f'?'1':'0')+s.toLowerCase()).join('/');all.sort((a,b)=>key(a)<key(b)?-1:1);
  const box=$('tree');box.innerHTML='';
  all.filter(r=>{const a=r.p.split('/');for(let i=1;i<a.length;i++)if(S.collapsed.has(a.slice(0,i).join('/')))return false;return true}).forEach(r=>{
    const b=document.createElement('button');b.className='row'+(r.k==='f'&&r.p===S.path?' on':'');b.style.paddingLeft=(12+(r.p.split('/').length-1)*14)+'px';
    b.innerHTML='<span class="chev"></span><span class="fi"></span><span class="nm"></span>';b.children[0].textContent=r.k==='d'?(S.collapsed.has(r.p)?'▸':'▾'):'';b.children[1].textContent=r.k==='d'?'📁':icon(r.p);b.children[2].textContent=base(r.p);
    b.onclick=()=>{if(r.k==='d'){S.collapsed.has(r.p)?S.collapsed.delete(r.p):S.collapsed.add(r.p);tree()}else{drawer(false);load(r.p)}};box.appendChild(b)})}
function drawer(o){$('app').classList.toggle('open',o);if(o)tree()}
$('exp').onclick=()=>drawer(true);$('bd').onclick=()=>drawer(false);$('dx').onclick=()=>drawer(false);$('save').onclick=doSave;$('pv').onclick=()=>post({type:'preview'});
$('pb').onclick=()=>$('probs').classList.toggle('open');
const keys=$('keys');
const K=[['⇥','tab'],['{}'],['()'],['[]'],['<>'],['""'],["''"],[';'],[':'],['='],['=>'],['/'],['.'],[','],['↶','undo'],['↷','redo'],['🔍','find']];
K.forEach(([label,cmd])=>{const b=document.createElement('button');b.textContent=label;b.addEventListener('pointerdown',e=>e.preventDefault());b.onclick=()=>key(cmd||label);keys.appendChild(b)});
function key(k){
  if(!view){if(ta){const s=ta.selectionStart;ta.setRangeText(k==='tab'?'  ':k.length===2&&!['=>'].includes(k)?k[0]+k[1]:k,s,ta.selectionEnd,'end');ta.dispatchEvent(new Event('input'));ta.focus()}return}
  const sel=view.state.selection.main;
  if(k==='tab'){if(sel.empty)view.dispatch({changes:{from:sel.from,insert:'  '},selection:{anchor:sel.from+2},userEvent:'input'});else CM.cmd.indentMore(view)}
  else if(k==='undo')CM.cmd.undo(view);else if(k==='redo')CM.cmd.redo(view);else if(k==='find'){CM.sr.openSearchPanel(view);return}
  else if(['{}','()','[]','<>','""',"''"].includes(k)){const inner=view.state.sliceDoc(sel.from,sel.to);view.dispatch({changes:{from:sel.from,to:sel.to,insert:k[0]+inner+k[1]},selection:{anchor:sel.from+1,head:sel.from+1+inner.length},scrollIntoView:true,userEvent:'input'})}
  else view.dispatch({changes:{from:sel.from,to:sel.to,insert:k},selection:{anchor:sel.from+k.length},scrollIntoView:true,userEvent:'input'});
  view.focus();
}
function onMsg(m){
  if(!m||typeof m!=='object')return;
  if(m.labels)Object.assign(S.L,m.labels);if(m.labels&&m.labels.explorer)$('exl').textContent=m.labels.explorer;
  if(m.version!=null)$('ver').textContent='⎇ v'+m.version;
  if('generating' in m){S.gen=!!m.generating;setRO(S.gen)}
  if(m.files){S.files=m.files;
    if(m.saved)delete S.drafts[m.saved];
    S.tabs=S.tabs.filter(p=>S.files.some(f=>f.path===p)||p in S.drafts);
    const keep=S.path&&(S.files.some(f=>f.path===S.path)||S.path in S.drafts);
    const target=m.path||(keep?S.path:'');
    if(m.type==='init'||target!==S.path||!dirty(S.path))load(target||'');else refresh();
    if($('app').classList.contains('open'))tree()}
}
window.__aim=onMsg;
window.addEventListener('message',e=>{let d=e.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch{return}}if(d&&d.__aimHost)onMsg(d)});
document.addEventListener('message',e=>{try{const d=JSON.parse(e.data);if(d.__aimHost)onMsg(d)}catch{}});
mount();load('');post({type:'ready'});
</script></body></html>`;
