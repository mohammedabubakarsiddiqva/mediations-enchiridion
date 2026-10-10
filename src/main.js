import './styles.css';
import med from './data/med.json';
import enc from './data/enc.json';
import * as Sync from './sync.js';
const DATA={med,enc};
const $=s=>document.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));const m=/^(med|enc):(ta|notes|fav|hl|read|ndate)$/.exec(k);if(m)Sync.markDirty(m[1],m[2]);return true}catch(e){return false}}};
const roman=n=>{let s='';[[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']].forEach(([v,c])=>{while(n>=v){s+=c;n-=v}});return s};
const BNM={1:'Debts and Lessons',2:'On the River Gran, Among the Quadi',3:'In Carnuntum'};
DATA.med.themes.forEach(t=>t.cite='Book '+t.qref);
Object.assign(DATA.med,{id:'med',pre:'med:',name:'Meditations',credit:'Marcus Aurelius, Meditations (Gregory Hays translation)',allTitle:'Complete text, all books',allBooks:'All books',ng:12,
 glabel:n=>'Book '+n,gtitle:n=>'Book '+n+(BNM[n]?': '+BNM[n]:''),special:[{id:'B1',title:'Book 1: Debts and Lessons',refs:Array.from({length:17},(_,i)=>'1.'+(i+1))}]});
Object.assign(DATA.enc,{id:'enc',pre:'enc:',name:'Enchiridion',credit:'Epictetus, Enchiridion and Fragments (George Long translation)',allTitle:'Complete text: Manual and Fragments',allBooks:'Everything',ng:2,
 glabel:n=>n===1?'Manual':'Fragments',gtitle:n=>n===1?'The Encheiridion, or Manual':'Fragments of Epictetus'});
let LB,D,K,GL,G,byRef,READ,NDATE,TA,NOTE,FAV,HL,UI,CUR=[],ALT=null,editing=null,curRef=null,only=false;
const key=r=>{if(LB.id==='enc')return[r[0]==='c'?1:2,+r.slice(1),''];const m=r.match(/(\d+)\.(\d+)([a-z]?)/);return [+m[1],+m[2],m[3]]};
const cmp=(a,b)=>{const x=key(a),y=key(b);return x[0]-y[0]||x[1]-y[1]||(x[2]<y[2]?-1:x[2]>y[2]?1:0)};
function L(r){return LB.id==='enc'?(r[0]==='c'?'Ench. ':'Frag. ')+roman(+r.slice(1)):r}
function AT(r){return LB.id==='enc'?'Epictetus, '+(r[0]==='c'?'Enchiridion ':'Fragments ')+roman(+r.slice(1)):'Marcus Aurelius, Meditations '+r}
function saveUI(){return store.set(K('ui2'),UI)}
function rebuildByRef(){byRef={};const TL=UI.idx==='r'&&D.themesR?D.themesR:D.themes;TL.forEach(t=>t.refs.forEach(r=>(byRef[r]=byRef[r]||[]).push(t.title)));if(UI.idx==='r'&&D.main)Object.keys(byRef).forEach(r=>{const m=D.main[r];byRef[r].sort((a,b)=>(b===m)-(a===m))})}
function setIdx(v){UI.idx=v;if(/^[TR]\d+$/.test(UI.view))UI.view=(v==='r'?'R':'T')+'1';saveUI();rebuildByRef();renderNav();render();$('#main').scrollTop=0}
function loadLib(id){LB=D=DATA[id];K=x=>LB.pre+x;READ=store.get(K('read'),{});NDATE=store.get(K('ndate'),{});TA=store.get(K('ta'),{});NOTE=store.get(K('notes'),{});FAV=store.get(K('fav'),{});HL=store.get(K('hl'),{});
 UI=store.get(K('ui2'),{view:'T1',mode:'en',q:''});
 GL=[...D.themes.map(t=>({id:'T'+t.n,title:t.title,refs:t.refs,quote:t.quote,cite:t.cite,theme:1,idx:'o'})),...(D.themesR||[]).map(t=>({id:'R'+t.n,title:t.title,refs:t.refs,quote:t.quote,cite:t.cite,theme:1,idx:'r'})),...D.special.map(x=>({id:x.id,title:x.title,refs:x.refs})),{id:'ALL',title:D.allTitle,refs:Object.keys(D.p).sort(cmp),all:1}];
 G={};GL.forEach(g=>G[g.id]=g);if(!D.themesR||UI.idx!=='r')UI.idx='o';rebuildByRef();
 if(!G[UI.view]&&!['fav','today','journal'].includes(UI.view))UI.view='T1';UI.fs=UI.fs||22;ALT=null;editing=null;only=false;curRef=null;CUR=[]}
loadLib(store.get('app:lib','med')==='enc'?'enc':'med');
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
const STOP=new Set('a an the of to and or but in on at by for with as is are was were be been it its this that these those i you he she we they my your his her our their me him them not no do does did have has had so if then than from into'.split(' '));
const norm=t=>t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const WRE=/[\p{L}\p{M}\p{N}]+/gu;
const stem=w=>w.length>4?w.replace(/(ingly|edly|ing|ied|ies|ed|es|s|ly)$/,''):w;
const WC=new Map();
function wordsOf(t){let r=WC.get(t);if(!r){r=[];for(const m of t.matchAll(WRE)){const w=norm(m[0]);r.push({w,s:stem(w),a:m.index,b:m.index+m[0].length})}if(WC.size>4000)WC.clear();WC.set(t,r)}return r}
function ed(a,b,max){const n=a.length,m=b.length;if(Math.abs(n-m)>max)return max+1;let p2=null,p1=Array.from({length:m+1},(_,j)=>j);
 for(let i=1;i<=n;i++){const c=[i];let mn=i;for(let j=1;j<=m;j++){let v=Math.min(p1[j]+1,c[j-1]+1,p1[j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,p2[j-2]+1);c[j]=v;if(v<mn)mn=v}if(mn>max)return max+1;p2=p1;p1=c}return p1[m]}
function sim(q,w){if(q.w===w.w)return 1;if(q.s===w.s&&q.s.length>=3)return .95;if(q.w.length>=3&&w.w.startsWith(q.w))return .85;if(q.w.length>=4&&w.w.includes(q.w))return .7;
 const L=q.w.length,mx=L<=3?0:L<=5?1:L<=8?2:3;if(!mx)return 0;const d=ed(q.w,w.w,mx);return d>mx?0:d===1?.8:d===2?.68:.6}
function parseQ(raw){const t=[...(raw||'').matchAll(WRE)].map(m=>norm(m[0])).filter(w=>w.length>=2);if(!t.length)return null;
 const allStop=t.every(w=>STOP.has(w));return{allStop,join:t.join(' '),t:t.map(w=>({w,s:stem(w),wt:(STOP.has(w)&&!allStop)?.25:1}))}}
function scoreText(text,Q){const ws=wordsOf(text);if(!ws.length)return -1;let tot=0,got=0;const pos=[];
 Q.t.forEach(q=>{let best=0,bi=-1;for(let i=0;i<ws.length;i++){const s=sim(q,ws[i]);if(s>best){best=s;bi=i;if(s===1)break}}tot+=q.wt;if(best>=.6){got+=best*q.wt;pos.push(bi)}else pos.push(-1)});
 const C=got/tot;if(Q.t.length===1?C<.65:C<.6)return -1;let bonus=0;
 if(Q.t.length>1){let adj=0;for(let i=0;i<pos.length-1;i++)if(pos[i]>=0&&pos[i+1]>=0&&pos[i+1]-pos[i]>=1&&pos[i+1]-pos[i]<=3)adj++;bonus+=.25*adj/(Q.t.length-1)}
 if((' '+ws.map(w=>w.w).join(' ')+' ').includes(' '+Q.join+' '))bonus+=.4;return C+bonus}
function marks(text,Q){const out=[];wordsOf(text).forEach(w=>{for(const q of Q.t){if(q.wt<1&&!Q.allStop)continue;if(sim(q,w)>=.65){out.push([w.a,w.b]);break}}});return out}
function fill(p,text,k,Q){const hs=HL[k]||[],n=text.length;const H=new Int16Array(n).fill(-1);hs.forEach(([a,b],i)=>{for(let j=Math.max(0,a);j<Math.min(n,b);j++)H[j]=i});
 const M=new Uint8Array(n);if(Q)marks(text,Q).forEach(([a,b])=>{for(let j=a;j<b;j++)M[j]=1});
 let i=0,cur=null,curH=-2;while(i<n){let j=i;while(j<n&&H[j]===H[i]&&M[j]===M[i])j++;const seg=text.slice(i,j);const node=M[i]?el('mark','hl',seg):document.createTextNode(seg);
  if(H[i]>=0){if(curH!==H[i]){cur=el('span','uh');cur.dataset.s=hs[H[i]][0];cur.dataset.e=hs[H[i]][1];p.append(cur);curH=H[i]}cur.append(node)}else{curH=-2;p.append(node)}i=j}}
function block(cls,paras,Q,r,lang){const d=el('div',cls+' hlable');paras.forEach((t,i)=>{const p=el('p');p.dataset.k=r+'|'+lang+'|'+i;fill(p,t,p.dataset.k,Q);d.append(p)});return d}
function anchoredRender(prefRef){const m=$('#main'),mt=m.getBoundingClientRect().top,all=[...document.querySelectorAll('article')];
 const a=(prefRef&&all.find(x=>x.dataset.ref===prefRef))||all.find(x=>x.getBoundingClientRect().bottom>mt+8);
 if(!a){render();return}const ref=a.dataset.ref,gid=a.dataset.gid,off=a.getBoundingClientRect().top-mt,oh=a.offsetHeight||1;render();
 const n=[...document.querySelectorAll('article')].find(x=>x.dataset.ref===ref&&x.dataset.gid===gid);
 if(n){const want=off<0?off*(n.offsetHeight/oh):off;m.scrollTo({top:m.scrollTop+(n.getBoundingClientRect().top-mt-want),behavior:'instant'})}}
const favCount=()=>Object.values(FAV).reduce((n,a)=>n+a.length,0);
function journalRefs(){const t=new Set(Object.keys(NOTE).filter(r=>(NOTE[r]||'').trim()));Object.keys(HL).forEach(k=>{if(HL[k]&&HL[k].length)t.add(k.split('|')[0])});Object.values(FAV).forEach(a=>a.forEach(r=>t.add(r)));return[...t].filter(r=>D.p[r])}
function renderNav(){const box=$('#themes');box.textContent='';
 if(D.themesR){const sw=el('div','seg idxsw');sw.setAttribute('role','group');sw.setAttribute('aria-label','Theme index');[['o','Original · 15'],['r','Refined · 30']].forEach(([v,l])=>{const b=el('button',null,l);b.setAttribute('aria-pressed',UI.idx===v);b.onclick=()=>setIdx(v);sw.append(b)});box.append(sw)}
 const add=(id,title,n,pct)=>{const b=el('button','th');b.setAttribute('aria-pressed',UI.view===id);b.append(title);b.append(el('small',null,n));
  b.onclick=()=>{UI.view=id;saveUI();renderNav();render();$('#main').scrollTop=0;$('#nav').classList.remove('open')};box.append(b)};
 add('today','Today','');add('journal','My journal',journalRefs().length);add('fav','My favorites',favCount());box.append(el('hr'));
 {const R=UI.idx==='r'&&D.themesR,TL=R?D.themesR:D.themes,pf=R?'R':'T';TL.forEach(t=>add(pf+t.n,t.title,G[pf+t.n].refs.length))}box.append(el('hr'));
 D.special.forEach(x=>add(x.id,x.title,x.refs.length));add('ALL',D.allTitle,G.ALL.refs.length)}
function copyBtn(r){const b=el('button','btn','Copy');b.onclick=async()=>{let t=[];const en=D.p[r].join('\n\n'),ta=TA[r]||'';
 if(UI.mode!=='ta'||!ta)t.push(en);if(UI.mode!=='en'&&ta)t.push(ta);
 const ok=await copyText(t.join('\n\n')+'\n\n— '+AT(r));b.textContent=ok?'Copied':'Copy failed';setTimeout(()=>b.textContent='Copy',1500)};return b}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){const a=el('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.append(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch(x){}a.remove();return ok}}
function render(){
 document.querySelectorAll('#langsw button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===UI.mode));
 const col=$('#col');col.textContent='';const Q=parseQ(UI.q);hideFab();const S={};CUR=[];
 if(UI.view==='today'){renderToday(col);return}
 if(UI.view==='journal'){renderJournal(col,Q);return}
 const ok=r=>{if(only&&!(NOTE[r]||'').trim())return false;if(!Q)return true;const e=scoreText(D.p[r].join(' '),Q),t=TA[r]?scoreText(TA[r],Q):-1;S[r]=Math.max(e,t);return S[r]>=0};
 const order=rs=>Q?rs.slice().sort((x,y)=>S[y]-S[x]||cmp(x,y)):rs;
 const H=(t)=>{const h=el('h2',null,t);h.style.cssText='font:600 40px/1.1 var(--serif);margin:0 0 6px';return h};
 const qs=Q?' matching “'+UI.q.trim()+'”, best matches first':'';
 if(UI.view==='fav'){col.append(H('My favorites'));let n=0;const body=document.createDocumentFragment();
  GL.forEach(g=>{const rs=order((FAV[g.id]||[]).filter(r=>D.p[r]&&ok(r)).sort(cmp));if(!rs.length)return;n+=rs.length;
   const h=el('h3',null,g.title+(g.idx==='r'?' · refined':'')+' ('+rs.length+')');h.style.cssText='font:600 28px/1.2 var(--serif);margin:34px 0 14px;border-bottom:1px solid var(--line);padding-bottom:6px';body.append(h);rs.forEach(r=>{CUR.push({r,gid:g.id});body.append(card(r,Q,g.id))})});
  col.append(el('p','sum',n+' favorite passage'+(n===1?'':'s')+qs));if(!n)col.append(el('div','empty-state',Q?'No favorites match your search.':'Nothing here yet. Choose a theme, then press Favorite on any passage you want to keep.'));col.append(body);return}
 const g=G[UI.view];const sel=g.all&&UI.books&&UI.books.length?UI.books:null;const refs=order(g.refs.filter(r=>(!sel||sel.includes(key(r)[0]))&&ok(r)));
 col.append(H(g.title));if(g.all)col.append(chips());col.append(el('p','sum',refs.length+' passage'+(refs.length===1?'':'s')+(Q?' match “'+UI.q.trim()+'”, best matches first':' shown')));
 if(g.theme&&!Q&&!only&&g.quote){const bq=el('blockquote','quote','“'+g.quote+'”');bq.append(el('cite',null,g.cite));col.append(bq)}
 if(!refs.length)col.append(el('div','empty-state','No passages match. Try fewer or different words, or clear the thoughts filter.'));
 const fr=document.createDocumentFragment();let lastB=0;
 refs.forEach(r=>{const b=key(r)[0];if(g.all&&!Q&&b!==lastB){lastB=b;const h=el('h3',null,LB.gtitle(b));h.style.cssText='font:600 28px/1.2 var(--serif);margin:34px 0 14px;border-bottom:1px solid var(--line);padding-bottom:6px';fr.append(h)}CUR.push({r,gid:g.id});fr.append(card(r,Q,g.id))});
 col.append(fr)}
function chips(){const BC={};G.ALL.refs.forEach(r=>{const b=key(r)[0];BC[b]=(BC[b]||0)+1});const w=el('div','chips');w.setAttribute('role','group');w.setAttribute('aria-label','Choose books');
 const add=(label,on,fn)=>{const b=el('button','btn chip',label);b.setAttribute('aria-pressed',on);b.onclick=()=>{fn();saveUI();render();$('#main').scrollTop=0};w.append(b)};
 add(LB.allBooks,!UI.books,()=>{UI.books=null});
 for(let n=1;n<=LB.ng;n++)add(LB.glabel(n)+' ('+BC[n]+')',!!UI.books&&UI.books.includes(n),()=>{if(LB.ng<=2){UI.books=[n];return}let c=UI.books?UI.books.slice():[];c=c.includes(n)?c.filter(x=>x!==n):[...c,n].sort((a,b)=>a-b);UI.books=(c.length&&c.length<LB.ng)?c:null});
 return w}
function notesEl(r){const n=D.notes&&D.notes[r];if(!n||!n.length)return null;const d=el('details','fn');d.append(el('summary',null,'Translator’s note'+(n.length>1?'s':'')));n.forEach(t=>d.append(el('p',null,t)));return d}
function card(r,Q,gid){
 const a=el('article');a.id='p'+r.replace('.','_')+gid;a.dataset.ref=r;a.dataset.gid=gid;
 const meta=el('div','meta');meta.append(el('span','ref',L(r)));if(D.titles[r])meta.append(el('span','ptitle',D.titles[r]));
 const other=gid==='ALL'?(byRef[r]||[]):(byRef[r]||[]).filter(t=>!(G[gid]&&G[gid].title===t));
 const mn=D.main&&UI.idx==='r'?D.main[r]:null;let tag='';if(gid!=='ALL'&&G[gid]&&G[gid].theme&&mn)tag=(G[gid].title===mn?'Main theme':'Secondary theme · main: '+mn)+(other.filter(t=>t!==mn).length?' · also in: '+other.filter(t=>t!==mn).join(', '):'');else if(other.length)tag=(gid==='ALL'?'Themes: ':'Also in: ')+other.join(', ');
 meta.append(el('span','tags',tag));a.append(meta);
 const g=el('div','grid'+(UI.mode==='both'?' both':''));
 if(UI.mode!=='ta')g.append(block('en',D.p[r],Q,r,'en'));
 if(UI.mode!=='en'){
  if(editing===r){const w=el('div');const ta=el('textarea');ta.value=TA[r]||'';ta.placeholder='Paste the Tamil translation here';
   const ac=el('div','acts');const s=el('button','btn pri','Save translation'),c=el('button','btn','Cancel');
   s.onclick=()=>{const v=ta.value.trim();if(v)TA[r]=v;else delete TA[r];store.set(K('ta'),TA);editing=null;refresh(r)};
   c.onclick=()=>{editing=null;refresh(r)};ac.append(s,c);w.append(ta,ac);g.append(w);setTimeout(()=>ta.focus(),0)}
  else if(TA[r])g.append(block('tamil',TA[r].split(/\n+/),Q,r,'ta'));
  else g.append(el('div','tamil empty','No Tamil translation yet.'))}
 a.append(g);const fn=notesEl(r);if(fn)a.append(fn);
 const ac=el('div','acts');const fv=(FAV[gid]||[]).includes(r);
 const f=el('button','btn'+(fv?' on':''),fv?'★ Favorited':'☆ Favorite');f.setAttribute('aria-pressed',fv);f.onclick=()=>toggleFav(gid,r);ac.append(f);
 const rd=el('button','btn'+(READ[r]?' on':''),READ[r]?'✓ Read':'Mark as read');rd.setAttribute('aria-pressed',!!READ[r]);rd.onclick=()=>toggleRead(r);ac.append(rd);
 if(UI.mode!=='en'&&editing!==r){const b=el('button','btn',TA[r]?'Edit Tamil':'Add Tamil');b.onclick=()=>{editing=r;refresh(r)};ac.append(b)}
 if(UI.mode==='en'&&!TA[r]){const b=el('button','btn','Add Tamil');b.onclick=()=>{UI.mode='both';saveUI();editing=r;anchoredRender(r)};ac.append(b)}
 const tb=el('button','btn','My thoughts');if((NOTE[r]||'').trim())tb.append(el('span','dot'));tb.onclick=()=>openDrawer(r);ac.append(tb);
 const im=el('button','btn','Image');im.onclick=()=>openQC(r);ac.append(im);ac.append(copyBtn(r));a.append(ac);return a}
function refresh(r){const Q=parseQ(UI.q);document.querySelectorAll('article').forEach(a=>{if(a.dataset.ref===r)a.replaceWith(card(r,Q,a.dataset.gid))})}
function toggleRead(r){if(READ[r])delete READ[r];else READ[r]=new Date().toISOString().slice(0,10);store.set(K('read'),READ);renderNav();refresh(r);if(!$('#focus').hidden)focusRender(true)}
function toggleFav(gid,r){const a=FAV[gid]||[];FAV[gid]=a.includes(r)?a.filter(x=>x!==r):[...a,r];if(!FAV[gid].length)delete FAV[gid];store.set(K('fav'),FAV);renderNav();
 if(['fav','journal'].includes(UI.view)){const y=$('#main').scrollTop;render();$('#main').scrollTop=y}else refresh(r);if(!$('#focus').hidden)focusRender(true)}
function keep(r){const e=[...document.querySelectorAll('article')].find(a=>a.dataset.ref===r);if(e)e.scrollIntoView({block:'center'})}
let tmr;
function openDrawer(r){curRef=r;$('#dref').textContent='My thoughts on '+L(r);const dq=$('#dq');dq.textContent='';D.p[r].forEach(p=>dq.append(el('p',null,p)));
 $('#dta').value=NOTE[r]||'';$('#dst').textContent='';$('#drawer').classList.add('open');setTimeout(()=>$('#dta').focus(),250)}
function closeDrawer(){$('#drawer').classList.remove('open');if(curRef){const r=curRef;curRef=null;if(UI.view==='journal'){const y=$('#main').scrollTop;render();$('#main').scrollTop=y;renderNav()}else refresh(r);if(!$('#focus').hidden)focusRender(true)}}
$('#dta').addEventListener('input',()=>{const r=curRef;clearTimeout(tmr);$('#dst').textContent='Saving…';tmr=setTimeout(()=>{const v=$('#dta').value;if(v.trim()){NOTE[r]=v;NDATE[r]=new Date().toISOString()}else{delete NOTE[r];delete NDATE[r]}store.set(K('ndate'),NDATE);$('#dst').textContent=store.set(K('notes'),NOTE)?'Saved in this browser':'Could not save: browser storage is blocked'},400)});
$('#dclose').onclick=closeDrawer;
document.addEventListener('keydown',e=>{const typing=/TEXTAREA|INPUT/.test((e.target||{}).tagName||'');
 if(e.key==='Escape'){if(curRef)closeDrawer();else if(!$('#qc').hidden)$('#qc').hidden=true;else if(!$('#auth').hidden)$('#auth').hidden=true;else if(!$('#focus').hidden)closeFocus();return}
 if(!$('#focus').hidden&&!typing&&!curRef&&$('#qc').hidden){if(e.key==='ArrowRight'){e.preventDefault();goF(1)}else if(e.key==='ArrowLeft'){e.preventDefault();goF(-1)}}});
// highlighting
const fab=$('#fab');let fabAct=null;
function hideFab(){fab.hidden=true;fabAct=null}
function showFab(label,rect,act){fab.textContent=label;fab.hidden=false;fabAct=act;const w=fab.offsetWidth;fab.style.left=Math.max(8,Math.min(innerWidth-w-8,rect.left+rect.width/2-w/2))+'px';fab.style.top=Math.min(innerHeight-50,rect.bottom+8)+'px'}
function selInfo(){const s=getSelection();if(!s.rangeCount||s.isCollapsed)return null;const r=s.getRangeAt(0);const n=r.commonAncestorContainer;const art=(n.nodeType===1?n:n.parentElement).closest('article');if(!art)return null;
 const out=[];art.querySelectorAll('.hlable p').forEach(p=>{if(!r.intersectsNode(p))return;let a=0,b=p.textContent.length;
  if(p.contains(r.startContainer)){const x=document.createRange();x.selectNodeContents(p);x.setEnd(r.startContainer,r.startOffset);a=x.toString().length}
  if(p.contains(r.endContainer)){const x=document.createRange();x.selectNodeContents(p);x.setEnd(r.endContainer,r.endOffset);b=x.toString().length}
  if(b>a)out.push([p.dataset.k,a,b])});return out.length?{out,art,rect:r.getBoundingClientRect()}:null}
function mergeR(list,[a,b]){let s=a,e=b;const keep=[];list.forEach(([x,y])=>{if(y<s||x>e)keep.push([x,y]);else{s=Math.min(s,x);e=Math.max(e,y)}});keep.push([s,e]);return keep}
let st;document.addEventListener('selectionchange',()=>{clearTimeout(st);st=setTimeout(()=>{const i=selInfo();if(i)showFab('Highlight',i.rect,()=>{i.out.forEach(([k,a,b])=>{HL[k]=mergeR(HL[k]||[],[a,b])});store.set(K('hl'),HL);getSelection().removeAllRanges();hideFab();refresh(i.art.dataset.ref)});else if(fab.dataset.mode!=='rm'&&!fab.matches(':active'))hideFab()},180)});
document.addEventListener('click',e=>{const u=e.target.closest&&e.target.closest('.uh');if(u&&getSelection().isCollapsed){const k=u.parentElement.dataset.k,a=+u.dataset.s,b=+u.dataset.e,ar=u.closest('article');if(!ar)return;const ref=ar.dataset.ref;fab.dataset.mode='rm';
  showFab('Remove highlight',u.getBoundingClientRect(),()=>{HL[k]=(HL[k]||[]).filter(([x,y])=>!(x<b&&y>a));if(!HL[k].length)delete HL[k];store.set(K('hl'),HL);hideFab();refresh(ref)});return}
 if(!e.target.closest('#fab')){fab.dataset.mode='';if(getSelection().isCollapsed)hideFab()}});
fab.addEventListener('pointerdown',e=>{e.preventDefault();const f=fabAct;fab.dataset.mode='';if(f)f()});
document.querySelectorAll('#langsw button').forEach(b=>b.onclick=()=>{UI.mode=b.dataset.m;saveUI();anchoredRender()});
$('#search').value=UI.q||'';let sdt;$('#search').oninput=e=>{UI.q=e.target.value;saveUI();clearTimeout(sdt);sdt=setTimeout(()=>{render();$('#main').scrollTop=0},150)};
$('#onlyN').onchange=e=>{only=e.target.checked;render()};
$('#menu').onclick=()=>$('#nav').classList.toggle('open');
$('#mode').onclick=()=>{const r=document.documentElement,dark=getComputedStyle(r).getPropertyValue('--bg').trim()==='#121b1c';r.dataset.theme=dark?'light':'dark';store.set('med:theme',r.dataset.theme)};
{const t=store.get('med:theme',null);if(t)document.documentElement.dataset.theme=t}
$('#exp').onclick=()=>saveFile(LB.id+'-my-data.json',JSON.stringify({tamil:TA,notes:NOTE,favorites:FAV,highlights:HL,read:READ,noteDates:NDATE},null,1));
$('#imp').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());Object.assign(TA,j.tamil||{});Object.assign(NOTE,j.notes||{});Object.assign(FAV,j.favorites||{});Object.assign(HL,j.highlights||{});Object.assign(READ,j.read||{});Object.assign(NDATE,j.noteDates||{});store.set(K('read'),READ);store.set(K('ndate'),NDATE);store.set(K('ta'),TA);store.set(K('notes'),NOTE);store.set(K('fav'),FAV);store.set(K('hl'),HL);renderNav();render();alert('Restored your translations, thoughts, favorites and highlights.')}catch(x){alert('That file could not be read.')}e.target.value=''};
const B=(t,f,c)=>{const b=el('button','btn'+(c?' '+c:''),t);b.onclick=f;return b};
async function saveFile(name,data){const u=URL.createObjectURL(data instanceof Blob?data:new Blob([data]));const a=el('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function seedPick(arr,salt){const d=new Date(),k=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()+salt;return arr[(Math.imul(k,2654435761)>>>0)%arr.length]}
const H2=t=>{const h=el('h2',null,t);h.style.cssText='font:600 40px/1.1 var(--serif);margin:0 0 6px';return h};
const H3=t=>{const h=el('h3',null,t);h.style.cssText='font:600 28px/1.2 var(--serif);margin:34px 0 14px;border-bottom:1px solid var(--line);padding-bottom:6px';return h};
function renderToday(col){const r=ALT||seedPick(G.ALL.refs,0);col.append(H2('Today'));
 col.append(el('p','sum',new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})));
 const tb=el('div','chips');tb.append(B(ALT?'Back to today’s passage':'Show another passage',()=>{ALT=ALT?null:G.ALL.refs[Math.floor(Math.random()*G.ALL.refs.length)];render()}));
 const L=UI.last;if(L&&D.p[L.ref]&&(G[L.view]||['fav','journal'].includes(L.view)))tb.append(B('Continue reading: '+L.ref,()=>{UI.view=L.view;saveUI();renderNav();render();const i=CUR.findIndex(x=>x.r===L.ref&&x.gid===L.gid);openFocus(i<0?CUR.findIndex(x=>x.r===L.ref):i)},'pri'));
 tb.append(B('Read in focus mode',()=>{if(CUR.length)openFocus(0)}));col.append(tb);
 CUR.push({r,gid:'ALL'});col.append(card(r,null,'ALL'));
 const pool=journalRefs().filter(x=>x!==r);
 if(pool.length){const p=seedPick(pool,7);CUR.push({r:p,gid:'ALL'});col.append(H3('From your own collection'));col.append(card(p,null,'ALL'))}
 const n=G.ALL.refs.filter(x=>READ[x]).length;col.append(H3('Your reading'));col.append(el('p','sum','You have marked '+n+' of '+G.ALL.refs.length+' passages as read.'));
 const bar=el('div','bar');bar.style.maxWidth='420px';const i=el('i');i.style.width=(100*n/G.ALL.refs.length)+'%';bar.append(i);col.append(bar)}
function hlTexts(r){const out=[];Object.keys(HL).filter(k=>k.startsWith(r+'|')).forEach(k=>{const p=k.split('|');const t=p[1]==='en'?D.p[r][+p[2]]:(TA[r]||'').split(/\n+/)[+p[2]];if(!t)return;HL[k].forEach(([a,b])=>out.push(t.slice(a,b)))});return out}
const favGroups=r=>GL.filter(g=>(FAV[g.id]||[]).includes(r)).map(g=>g.title+(g.idx==='r'?' (refined)':''));
const fmtD=iso=>new Date(iso).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
function jList(Q){const S={};let rs=journalRefs();const f=UI.jf||'all';
 if(f==='notes')rs=rs.filter(r=>(NOTE[r]||'').trim());if(f==='hl')rs=rs.filter(r=>hlTexts(r).length);if(f==='fav')rs=rs.filter(r=>favGroups(r).length);
 if(Q){rs=rs.filter(r=>{S[r]=scoreText(D.p[r].join(' ')+' '+(NOTE[r]||'')+' '+hlTexts(r).join(' ')+' '+(TA[r]||''),Q);return S[r]>=0});rs.sort((x,y)=>S[y]-S[x])}
 else{const d=x=>NDATE[x]||'';rs.sort((x,y)=>d(y).localeCompare(d(x))||cmp(x,y))}return rs}
function renderJournal(col,Q){col.append(H2('My journal'));const rs=jList(Q);const f=UI.jf||'all';
 const tb=el('div','chips');[['all','Everything'],['notes','Thoughts'],['hl','Highlights'],['fav','Favorites']].forEach(([v,l])=>{const b=el('button','btn chip',l);b.setAttribute('aria-pressed',f===v);b.onclick=()=>{UI.jf=v;saveUI();render()};tb.append(b)});
 tb.append(B('Download .md',()=>saveFile('my-'+LB.id+'-journal.md',jMD(rs))));tb.append(B('Download .html',()=>saveFile('my-'+LB.id+'-journal.html',jHTML(rs))));col.append(tb);
 col.append(el('p','sum',rs.length+' entr'+(rs.length===1?'y':'ies')+(Q?' matching “'+UI.q.trim()+'”':', newest thoughts first')));
 if(!rs.length)col.append(el('div','empty-state','Your journal fills as you write thoughts, highlight text or mark favorites.'));
 rs.forEach(r=>{CUR.push({r,gid:'ALL'});const e=el('section','entry');const m=el('div','meta');m.append(el('span','ref',L(r)));if(D.titles[r])m.append(el('span','ptitle',D.titles[r]));
  const fg=favGroups(r);m.append(el('span','tags',(fg.length?'★ '+fg.join(', '):'')));if(NDATE[r])m.append(el('span','tags',fmtD(NDATE[r])));e.append(m);
  const q=el('div','jq');D.p[r].forEach(t=>q.append(el('p',null,t)));e.append(q);
  const hs=hlTexts(r);if(hs.length){const w=el('div','jh');hs.forEach(t=>w.append(el('p',null,'“'+t+'”')));e.append(w)}
  if((NOTE[r]||'').trim()){const w=el('div','jn');w.append(el('strong',null,'My thoughts'));NOTE[r].split(/\n+/).forEach(t=>w.append(el('p',null,t)));e.append(w)}
  const ac=el('div','acts');ac.append(B((NOTE[r]||'').trim()?'Edit thoughts':'Write thoughts',()=>openDrawer(r)));
  const im=B('Image',()=>openQC(r));ac.append(im);ac.append(B('Copy thoughts',async function(){const ok=await copyText(((NOTE[r]||'')+'\n\n— on '+LB.name+' '+L(r)).trim());this.textContent=ok?'Copied':'Copy failed';setTimeout(()=>this.textContent='Copy thoughts',1500)}));e.append(ac);col.append(e)})}
const esc=t=>t.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function jMD(rs){let o='# My '+LB.name+' journal\n\n'+LB.credit+'\n\n';rs.forEach(r=>{o+='## '+L(r)+(D.titles[r]?' — '+D.titles[r]:'')+(NDATE[r]?'  ('+fmtD(NDATE[r])+')':'')+'\n\n'+D.p[r].map(t=>'> '+t).join('\n>\n')+'\n\n';
 const h=hlTexts(r);if(h.length)o+='**Highlights**\n\n'+h.map(t=>'- “'+t+'”').join('\n')+'\n\n';if((NOTE[r]||'').trim())o+='**My thoughts**\n\n'+NOTE[r]+'\n\n';const fg=favGroups(r);if(fg.length)o+='Favorite in: '+fg.join(', ')+'\n\n'});return o}
function jHTML(rs){let o='<!DOCTYPE html><html><head><meta charset="utf-8"><title>My '+LB.name+' journal</title><style>body{font:18px/1.7 Georgia,serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1d2a2d}blockquote{margin:0 0 12px;padding-left:14px;border-left:3px solid #b8862f;color:#456}h2{margin-bottom:4px}.n{background:#eef1ee;padding:10px 14px;border-radius:8px;white-space:pre-wrap}</style></head><body><h1>My '+LB.name+' journal</h1>';
 rs.forEach(r=>{o+='<h2>'+L(r)+(D.titles[r]?' — '+esc(D.titles[r]):'')+'</h2>'+(NDATE[r]?'<small>'+fmtD(NDATE[r])+'</small>':'')+D.p[r].map(t=>'<blockquote>'+esc(t)+'</blockquote>').join('');
  const h=hlTexts(r);if(h.length)o+='<p><b>Highlights</b></p><ul>'+h.map(t=>'<li>“'+esc(t)+'”</li>').join('')+'</ul>';if((NOTE[r]||'').trim())o+='<p><b>My thoughts</b></p><div class="n">'+esc(NOTE[r])+'</div>'});return o+'</body></html>'}
// focus mode
let FI=0;
function openFocus(i){if(!CUR.length)return;FI=Math.max(0,Math.min(i<0?0:i,CUR.length-1));$('#focus').hidden=false;focusRender();$('#fclose').focus()}
function closeFocus(){const r=(CUR[FI]||{}).r;$('#focus').hidden=true;anchoredRender(r)}
function goF(d){const n=FI+d;if(n<0||n>=CUR.length)return;FI=n;focusRender()}
function focusRender(keep){const it=CUR[FI];if(!it){closeFocus();return}const r=it.r,gid=it.gid;UI.last={view:UI.view,ref:r,gid};saveUI();
 $('#fcount').textContent=(FI+1)+' / '+CUR.length;const body=$('#fbody'),y=body.scrollTop;body.textContent='';
 document.querySelectorAll('#fmode button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===UI.mode));
 const inner=el('div','inner');inner.style.fontSize=UI.fs+'px';if(UI.mode==='both')inner.style.maxWidth='1100px';
 const meta=el('div','meta');meta.append(el('span','ref',L(r)));if(D.titles[r])meta.append(el('span','ptitle',D.titles[r]));inner.append(meta);
 const g=el('div','grid'+(UI.mode==='both'?' both':''));
 if(UI.mode!=='ta')g.append(block('en',D.p[r],null,r,'en'));
 if(UI.mode!=='en'){if(TA[r])g.append(block('tamil',TA[r].split(/\n+/),null,r,'ta'));else g.append(el('div','tamil empty','No Tamil translation yet. Add one from the list view.'))}
 inner.append(g);{const fn=notesEl(r);if(fn)inner.append(fn)}body.append(inner);body.scrollTop=keep?y:0;
 const ff=$('#ffoot');ff.textContent='';const fv=(FAV[gid]||[]).includes(r);
 const pv=B('‹ Previous',()=>goF(-1));pv.disabled=FI===0;const nx=B('Next ›',()=>goF(1),'pri');nx.disabled=FI===CUR.length-1;
 const f=B(fv?'★ Favorited':'☆ Favorite',()=>toggleFav(gid,r),fv?'on':'');const rd=B(READ[r]?'✓ Read':'Mark as read',()=>toggleRead(r),READ[r]?'on':'');
 ff.append(pv,nx,f,rd,B('My thoughts',()=>openDrawer(r)),B('Image',()=>openQC(r)),copyBtn(r))}
$('#fbtn').onclick=()=>{if(!CUR.length)return;const mt=$('#main').getBoundingClientRect().top;const a=[...document.querySelectorAll('article')].find(x=>x.getBoundingClientRect().bottom>mt+8);
 let i=a?CUR.findIndex(x=>x.r===a.dataset.ref&&x.gid===a.dataset.gid):0;openFocus(i<0?0:i)};
$('#fclose').onclick=closeFocus;
$('#fsm').onclick=()=>{UI.fs=Math.max(15,UI.fs-2);saveUI();focusRender(true)};$('#fbg').onclick=()=>{UI.fs=Math.min(40,UI.fs+2);saveUI();focusRender(true)};
document.querySelectorAll('#fmode button').forEach(b=>b.onclick=()=>{UI.mode=b.dataset.m;saveUI();focusRender(true)});
{let x0=null;const fb=$('#fbody');fb.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});fb.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>70&&!getSelection().toString())goF(dx<0?1:-1)})}
// quote cards
let QR=null,QO={lang:'en',style:0,hl:false};
const QS=[{n:'Sea',bg:'#2c5b61',fg:'#f3f6f4',ac:'#e0b25a',mu:'#c4d7d6'},{n:'Night',bg:'#121b1c',fg:'#e4ebe8',ac:'#d3a54f',mu:'#93a6a6'},{n:'Mist',bg:'#eef1ee',fg:'#1d2a2d',ac:'#8a6d3b',mu:'#5d6e70'}];
function openQC(r){QR=r;const hasT=!!TA[r];QO.lang=hasT&&UI.mode!=='en'?UI.mode:'en';QO.hl=false;$('#qc').hidden=false;qcUI();qcDraw()}
function qcUI(){const hasT=!!TA[QR];document.querySelectorAll('#qlang button').forEach(b=>{b.disabled=b.dataset.v!=='en'&&!hasT;b.setAttribute('aria-pressed',b.dataset.v===QO.lang)});
 const sw=$('#qsty');sw.textContent='';QS.forEach((s,i)=>{const b=el('button',null,s.n);b.setAttribute('aria-pressed',i===QO.style);b.onclick=()=>{QO.style=i;qcUI();qcDraw()};sw.append(b)});
 const has=Object.keys(HL).some(k=>k.startsWith(QR+'|')&&HL[k].length);$('#qhlw').hidden=!has;$('#qhl').checked=QO.hl}
document.querySelectorAll('#qlang button').forEach(b=>b.onclick=()=>{QO.lang=b.dataset.v;qcUI();qcDraw()});
$('#qhl').onchange=e=>{QO.hl=e.target.checked;qcDraw()};$('#qclose').onclick=()=>{$('#qc').hidden=true};
$('#qsave').onclick=()=>$('#qcv').toBlob(b=>saveFile(LB.id+'-'+QR+'.png',b),'image/png');
function qcTexts(r){const o={en:D.p[r].slice(),ta:TA[r]?TA[r].split(/\n+/):[]};if(QO.hl)['en','ta'].forEach(l=>{const res=[];o[l].forEach((t,i)=>(HL[r+'|'+l+'|'+i]||[]).slice().sort((a,b)=>a[0]-b[0]).forEach(([a,b])=>res.push(t.slice(a,b))));o[l]=res.length?[res.join(' … ')]:[]});return o}
function wrapT(x,t,w){const ls=[];let c='';t.split(/\s+/).forEach(wd=>{const u=c?c+' '+wd:wd;if(x.measureText(u).width>w&&c){ls.push(c);c=wd}else c=u});if(c)ls.push(c);return ls}
async function qcDraw(){const c=$('#qcv'),x=c.getContext('2d'),S=QS[QO.style],W=1080,PAD=96;c.width=W;c.height=W;
 try{await Promise.all([document.fonts.load('500 40px "Cormorant Garamond"'),document.fonts.load('400 30px "Noto Serif Tamil"')])}catch(e){}
 x.fillStyle=S.bg;x.fillRect(0,0,W,W);x.fillStyle=S.ac;x.fillRect(PAD,PAD,72,5);
 const T=qcTexts(QR),bl=[];if(QO.lang!=='ta'||!T.ta.length)T.en.forEach(t=>bl.push({t,l:'en'}));if(QO.lang!=='en'&&T.ta.length)T.ta.forEach(t=>bl.push({t,l:'ta'}));
 const top=PAD+64,bot=W-PAD-80,bw=W-2*PAD,bh=bot-top;
 const fnt=(l,s)=>l==='en'?'500 '+s+'px "Cormorant Garamond", Georgia, serif':'400 '+Math.round(s*.8)+'px "Noto Serif Tamil", "Latha", serif';
 const lay=s=>{const out=[];let h=0;bl.forEach((b,i)=>{x.font=fnt(b.l,s);const lh=Math.round(s*(b.l==='en'?1.28:1.6)),ls=wrapT(x,b.t,bw),gap=i<bl.length-1?Math.round(s*.5):0;out.push({l:b.l,ls,lh,gap});h+=ls.length*lh+gap});return{out,h}};
 let s=62,L=lay(s);while(L.h>bh&&s>22){s-=2;L=lay(s)}
 let used=0;const fin=[];for(const b of L.out){const n=Math.floor((bh-used)/b.lh);if(n<=0)break;if(b.ls.length>n){const ls=b.ls.slice(0,n);ls[n-1]=ls[n-1].replace(/[\s,;:.—-]*$/,'')+'…';fin.push({...b,ls});used+=n*b.lh;break}fin.push(b);used+=b.ls.length*b.lh+b.gap}
 let y=top+Math.max(0,(bh-used)/2);x.textBaseline='top';x.fillStyle=S.fg;
 fin.forEach(b=>{x.font=fnt(b.l,s);b.ls.forEach(l=>{x.fillText(l,PAD,y);y+=b.lh});y+=b.gap});
 x.font='500 34px "Cormorant Garamond", Georgia, serif';x.fillStyle=S.mu;x.fillText('— '+AT(QR),PAD,W-PAD-34)}

function switchLib(id){if(LB.id===id)return;closeDrawerQuiet();$('#focus').hidden=true;$('#qc').hidden=true;store.set('app:lib',id);loadLib(id);$('#search').value=UI.q||'';$('#onlyN').checked=false;syncLib();renderNav();render();$('#main').scrollTop=0;$('#nav').classList.remove('open')}
function closeDrawerQuiet(){$('#drawer').classList.remove('open');curRef=null}
function syncLib(){document.querySelectorAll('#libsw button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.l===LB.id));document.title=LB.name+' by Theme'}
document.querySelectorAll('#libsw button').forEach(b=>b.onclick=()=>switchLib(b.dataset.l));
syncLib();

renderNav();render();

// ---- account and cloud sync ----
{
  const acct=$('#acct'),st=$('#syncst'),box=$('#auth'),msg=$('#amsg');
  const say=(t,err)=>{msg.textContent=t||'';msg.classList.toggle('err',!!err)};
  const showUser=u=>{acct.textContent=u?(u.email||'Account'):(Sync.enabled?'Sign in':'Cloud sync off');$('#aform').hidden=!!u;$('#aout').hidden=!u;$('#atitle').textContent=u?'Your account':'Sign in to sync';$('#auser').textContent=u?('Signed in as '+(u.email||'')+'. Your Tamil text, notes, favorites, highlights and read marks sync across your devices.'):''};
  let retry=null;
  const applyRemote=()=>{if(curRef||editing||!$('#focus').hidden){clearTimeout(retry);retry=setTimeout(applyRemote,4000);return}const y=$('#main').scrollTop;loadLib(LB.id);syncLib();renderNav();render();$('#main').scrollTop=y};
  Sync.init({onUser:showUser,onStatus:t=>{st.textContent=t},onChange:applyRemote});
  showUser(null);
  acct.onclick=()=>{if(!Sync.enabled){say('Cloud sync is not set up for this site yet. Everything still works and is saved in this browser.');$('#aform').hidden=true}else say('');box.hidden=false;if(!$('#aform').hidden)$('#aemail').focus()};
  $('#aclose').onclick=()=>{box.hidden=true};
  const creds=()=>({e:$('#aemail').value.trim(),p:$('#apass').value});
  const run=async(fn,ok)=>{say('Working…');try{const {data,error}=await fn();if(error)say(error.message,true);else{say(typeof ok==='function'?ok(data):ok);}}catch(x){say('Something went wrong. Please try again.',true)}};
  $('#asignin').onclick=()=>{const c=creds();if(!c.e||!c.p)return say('Enter your email and password.',true);run(()=>Sync.signIn(c.e,c.p),()=>{box.hidden=true;return ''})};
  $('#asignup').onclick=()=>{const c=creds();if(!c.e||c.p.length<6)return say('Enter an email and a password of at least 6 characters.',true);run(()=>Sync.signUp(c.e,c.p),d=>{if(d&&d.session){box.hidden=true;return ''}return 'Almost there. Check your email and click the confirmation link, then sign in.'})};
  $('#amagic').onclick=()=>{const c=creds();if(!c.e)return say('Enter your email first.',true);run(()=>Sync.magicLink(c.e),'Check your email for a sign-in link.')};
  $('#asyncnow').onclick=async()=>{await Sync.pull();say('Synced.')};
  $('#asignout').onclick=async()=>{await Sync.signOut(false);box.hidden=true};
  $('#awipe').onclick=()=>{if(confirm('This removes your saved data from this device (it stays in your account). Continue?'))Sync.signOut(true)};
}

{const h=document.querySelector('header'),m=$('#main'),mo=$('#more');
 mo.onclick=()=>{const o=h.classList.toggle('hopen');mo.setAttribute('aria-expanded',o);if(h.style.marginTop){h.style.marginTop=''}};
 const sp=()=>{$('#search').placeholder=innerWidth<=860?'Search':'Search (typos are fine)'};sp();addEventListener('resize',sp);
 let last=0,hid=false;
 m.addEventListener('scroll',()=>{if(innerWidth>860){if(hid){h.style.marginTop='';hid=false}return}
  const y=m.scrollTop,d=y-last;last=y;if(h.classList.contains('hopen'))return;
  if(d>10&&y>120&&!hid){h.style.marginTop=-h.offsetHeight+'px';hid=true}else if((d<-10||y<60)&&hid){h.style.marginTop='';hid=false}},{passive:true});
 document.addEventListener('click',e=>{if(h.classList.contains('hopen')&&!h.contains(e.target)){h.classList.remove('hopen');mo.setAttribute('aria-expanded','false')}})}
