// No "undefined", "null", "[object Object]" or raw key on any page, in any language.
//
// An empty Weekly review list showed the word "undefined": the list block read
// `t.emptyMap` from a copy group only one module (mensio-the-day) supplies, so
// in any booklet without that module the words were not there. That was one
// symptom of a general gap, so this is an audit rather than a one-off check.
//
//   A. THE AUDIT, from the source. Every place the renderer's script reads its
//      interface tables is found without running it (so a view nobody drew
//      still counts): T[..].a.b, T.en.a.b, the one-group accessors libT(),
//      MW(), PG(), RT(), anything bound to one of those in an enclosing scope
//      (including a function's parameter when a call hands it a table), and
//      the copy references copyTree/copyLayer/copyAt/copyText/copyPair/
//      copyBag("a.b") and copyFor(lg).a, which look in the installed modules'
//      copy first and the tables second.
//        - A table read must be defined in every language. None may be
//          defined in no language (a raw `undefined`).
//        - A copy reference no table defines is one a module supplies; each
//          such path must be listed below with the table words the code falls
//          back to, and those must exist.
//        - A read that indexes with [..] is resolved to the keys the code can
//          pass there, and each must be defined.
//        - Parity: every key English defines, French and Spanish define, with
//          the same kind of value (words, a list of the same length, a
//          function), and no language defines a key English does not.
//   B. THE PAGES. Every view of every shipped module, alone and all together,
//      and the empty states (no booklets, an empty booklet, an empty Weekly
//      review with and without a board, empty boards, an empty history, an
//      activity with nothing kept, a tick-list with nothing picked), each in
//      en, fr, es and es-AR, read the way final.test.js reads them: text and
//      the attributes a screen reader speaks. None may say undefined, null,
//      NaN or [object Object], show a raw key, or leave a button unnamed.
//
// Run: node test/undefined.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
const {R,src,LS,PREF,boot,wipe,byId,main,find,hasClass,texts,collect,click}=P;

let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const section=t=>console.log("\n# "+t);
const LANGS=["en","fr","es","es-AR"];

/* ========================= A. the audit ========================= */

/* Blank out everything that is not code (comments, string and regex bodies,
   template text), keeping every offset, so brackets can be matched and the
   original read at the same place. */
function mask(s){
  const o=s.split("");const n=s.length;let i=0;
  const blank=(a,b)=>{for(let k=a;k<b;k++) if(o[k]!=="\n") o[k]=" ";};
  const tstack=[];let last="";
  const KW=/^(return|typeof|case|in|of|new|delete|void|throw|else|do|yield|await)$/;
  const regexOk=()=>last===""||/[(,=:[!&|?{};+\-*%<>~^]$/.test(last)||KW.test(last);
  function template(){while(i<n){const c=s[i];
      if(c==="\\"){blank(i,i+2);i+=2;continue;}
      if(c==="`"){i++;last="`";return;}
      if(c==="$"&&s[i+1]==="{"){i+=2;tstack.push(0);last="{";return;}
      blank(i,i+1);i++;}}
  while(i<n){const c=s[i],d=s[i+1];
    if(c==="/"&&d==="/"){const e=s.indexOf("\n",i);const end=e<0?n:e;blank(i,end);i=end;continue;}
    if(c==="/"&&d==="*"){const e=s.indexOf("*/",i+2);const end=e<0?n:e+2;blank(i,end);i=end;continue;}
    if(c==="'"||c==='"'){let j=i+1;while(j<n&&s[j]!==c){if(s[j]==="\\")j++;j++;}blank(i+1,j);i=j+1;last="str";continue;}
    if(c==="`"){i++;template();continue;}
    if(c==="/"&&regexOk()){let j=i+1,cls=false;
      while(j<n){const x=s[j];if(x==="\\"){j+=2;continue;}if(x==="[")cls=true;else if(x==="]")cls=false;else if(x==="/"&&!cls)break;else if(x==="\n")break;j++;}
      blank(i+1,j);i=j+1;while(/[a-z]/.test(s[i]||""))i++;last="re";continue;}
    if(tstack.length){if(c==="{")tstack[tstack.length-1]++;
      else if(c==="}"){if(tstack[tstack.length-1]===0){tstack.pop();i++;template();continue;}tstack[tstack.length-1]--;}}
    if(/\s/.test(c)){i++;continue;}
    if(/[A-Za-z_$0-9]/.test(c)){let j=i;while(j<n&&/[A-Za-z_$0-9]/.test(s[j]))j++;last=s.slice(i,j);i=j;continue;}
    last=c;i++;}
  return o.join("");}

/* Every read of the interface tables: {kind: "T"|"copy", path, dyn, idx,
   fallback, line, text}. `idx` is the index expression of a [..] read, and
   `fallback` says the read is written `x || …`. */
function tableReads(src){
  const M=mask(src);
  const starts=[0];for(let i=0;i<src.length;i++) if(src[i]==="\n") starts.push(i+1);
  const lineOf=p=>{let lo=0,hi=starts.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(starts[m]<=p)lo=m;else hi=m-1;}return lo+1;};
  const match=new Map();{const st=[];for(let i=0;i<M.length;i++){const c=M[i];
    if(c==="{"||c==="("||c==="[") st.push(i);else if(c==="}"||c===")"||c==="]"){const o=st.pop();match.set(o,i);match.set(i,o);}}}
  const encl=new Int32Array(M.length+1).fill(-1);{const st=[];for(let i=0;i<M.length;i++){const c=M[i];
      if(c==="{") st.push(i);encl[i]=st.length?st[st.length-1]:-1;if(c==="}") st.pop();}}
  const enclosing=p=>{const o=encl[p];return o<0?[0,M.length]:[o,match.get(o)];};
  const exprEnd=p=>{for(let i=p;i<M.length;i++){const c=M[i];if(c==="("||c==="["||c==="{"){i=match.get(i);continue;}
    if(c===","||c===";"||c===")"||c==="]"||c==="}") return i;}return M.length;};
  const ID="[A-Za-z_$][\\w$]*";
  const segsOf=s=>s.split(".").map(x=>x.replace("?","").trim()).filter(Boolean);
  const CHAIN="((?:\\s*\\??\\.\\s*"+ID+")*)";
  /* const X=()=>(T[lang]&&T[lang].g)||T.en.g — an accessor of one group */
  const GETTERS={};
  for(const g of M.matchAll(new RegExp("\\bconst\\s+("+ID+")\\s*=\\s*\\(\\)\\s*=>\\s*\\(T\\s*\\[\\s*lang\\s*\\]\\s*&&\\s*T\\s*\\[\\s*lang\\s*\\]\\.("+ID+")\\)\\s*\\|\\|\\s*T\\.en\\.("+ID+")","g")))
    if(g[2]===g[3]) GETTERS[g[1]]=[g[2]];
  const COPYFN="copyTree|copyLayer|copyAt|copyText|copyPair|copyBag";
  const literal=q=>{const e=src.indexOf('"',q);return {lit:src.slice(q,e),end:e+1};};
  function refAt(p){const m=M.slice(p,p+400);let r;
    if((r=m.match(/^\s*T\s*\[/))){const o=p+r[0].length-1,c=match.get(o);const ch=M.slice(c+1).match(new RegExp("^"+CHAIN));
      return {kind:"T",path:segsOf(ch[1]),end:c+1+ch[0].length};}
    if((r=m.match(new RegExp("^\\s*T\\s*\\.\\s*(?:en|fr|es)\\b"+CHAIN)))) return {kind:"T",path:segsOf(r[1]),end:p+r[0].length};
    if((r=m.match(new RegExp("^\\s*("+ID+")\\s*\\(\\s*\\)"+CHAIN)))&&GETTERS[r[1]]) return {kind:"T",path:[...GETTERS[r[1]],...segsOf(r[2])],end:p+r[0].length};
    if((r=m.match(new RegExp("^\\s*("+COPYFN+")\\s*\\(\\s*\"")))){const {lit,end}=literal(p+r[0].length);const o=p+r[0].indexOf("(");const c=match.get(o);
      if(!/^\s*[,)]/.test(M.slice(end,end+4))) return null;           // "a."+k: not one path
      const ch=M.slice(c+1).match(new RegExp("^"+CHAIN));return {kind:"copy",path:[...lit.split("."),...segsOf(ch[1])],end:c+1+ch[0].length};}
    if((r=m.match(/^\s*copyFor\s*\(/))){const o=p+r[0].length-1,c=match.get(o);const ch=M.slice(c+1).match(new RegExp("^"+CHAIN));
      return {kind:"copy",path:segsOf(ch[1]),end:c+1+ch[0].length};}
    if((r=m.match(new RegExp("^\\s*("+ID+")"+CHAIN+"\\s*(?=[;,)}\\n]|\\|\\||$)")))) return {kind:"alias",name:r[1],path:segsOf(r[2]),end:p+r[0].length};
    return null;}
  /* bindings: declarations, and function and arrow parameters (which shadow) */
  const binds=[];const byName=new Map();
  const add=(name,scope,at,val)=>{const b={name,scope,at,val};binds.push(b);(byName.get(name)||byName.set(name,[]).get(name)).push(b);return b;};
  for(const d of M.matchAll(/\b(const|let|var)\s+/g)){let p=d.index+d[0].length;const scope=enclosing(d.index);
    for(let guard=0;guard<60;guard++){const rest=M.slice(p,p+200);let r,name=null;
      if((r=rest.match(/^\s*[{[]/))){const o=p+r[0].length-1,c=match.get(o);
        for(const nm of M.slice(o+1,c).matchAll(new RegExp("(?:^|[,{\\s:])\\s*("+ID+")\\s*(?=[,}=\\]]|$)","g"))) add(nm[1],scope,d.index,null);
        p=c+1;}
      else if((r=rest.match(new RegExp("^\\s*("+ID+")")))){p+=r[0].length;name=r[1];}
      else break;
      const eq=M.slice(p,p+20).match(/^\s*=(?![=>])/);
      if(eq){const rs=p+eq[0].length;if(name) add(name,scope,d.index,refAt(rs));p=exprEnd(rs);}
      else{if(name) add(name,scope,d.index,null);p=exprEnd(p);}
      if(M[p]===","){p++;continue;}
      break;}}
  const PARAMS=new RegExp("(?:^|[,({\\s])\\s*(?:\\.\\.\\.)?("+ID+")\\s*(?=[,)}=]|$)","g");
  const fns=[];
  for(const f of M.matchAll(new RegExp("\\bfunction\\s*\\*?\\s*("+ID+")?\\s*\\(","g"))){const o=f.index+f[0].length-1,c=match.get(o);
    const bo=M.indexOf("{",c);const body=[bo,match.get(bo)];const ps=[...M.slice(o+1,c).matchAll(PARAMS)].map(x=>x[1]);
    const bs=ps.map(n=>add(n,body,o,null));if(f[1]) fns.push({name:f[1],binds:bs,at:o});}
  for(const a of M.matchAll(/=>/g)){const at=a.index;let q=at-1;while(/\s/.test(M[q]))q--;let names=[],owner=null;
    if(M[q]===")"){const o=match.get(q);names=[...M.slice(o+1,q).matchAll(PARAMS)].map(x=>x[1]);
      const nm=M.slice(Math.max(0,o-80),o).match(new RegExp("\\b("+ID+")\\s*=\\s*(?:async\\s*)?$"));owner=nm?nm[1]:null;}
    else{const r=M.slice(Math.max(0,q-80),q+1).match(new RegExp("("+ID+")$"));if(r) names=[r[1]];
      const nm=M.slice(Math.max(0,q-160),q+1-(r?r[1].length:0)).match(new RegExp("\\b("+ID+")\\s*=\\s*(?:async\\s*)?$"));owner=nm?nm[1]:null;}
    let b=at+2;while(/\s/.test(M[b]))b++;
    const scope=M[b]==="{"?[b,match.get(b)]:[b,exprEnd(b)];
    const bs=names.map(n=>add(n,scope,at,null));if(owner) fns.push({name:owner,binds:bs,at});}
  function lookup(name,pos,depth){depth=depth||0;let best=null;
    for(const b of byName.get(name)||[]) if(b.scope[0]<=pos&&pos<=b.scope[1]){
      const w=b.scope[1]-b.scope[0],bw=best?best.scope[1]-best.scope[0]:Infinity;
      if(w<bw||(w===bw&&b.at<=pos&&b.at>best.at)) best=b;}
    if(!best||!best.val) return null;
    if(best.val.kind==="alias"){if(depth>6) return null;const up=lookup(best.val.name,best.at,depth+1);
      return up?{kind:up.kind,path:[...up.path,...best.val.path]}:null;}
    return best.val;}
  /* a call that hands a table to a function binds that function's parameter */
  const calls=new Map();for(const c of M.matchAll(new RegExp("(?<![\\w$.])("+ID+")\\s*\\(","g"))){
    (calls.get(c[1])||calls.set(c[1],[]).get(c[1])).push(c.index+c[0].length-1);}
  for(let pass=0;pass<2;pass++) for(const f of fns) for(const o of calls.get(f.name)||[]){
    if(o===f.at) continue;const cl=match.get(o);if(cl===undefined) continue;
    let p=o+1,i=0;while(p<cl&&i<f.binds.length){const e=exprEnd(p);const v=refAt(p);
      if(v&&!/\S/.test(M.slice(v.end,e))){const val=v.kind==="alias"?lookup(v.name,p):v;
        const full=val&&v.kind==="alias"?{kind:val.kind,path:[...val.path,...v.path]}:val;
        if(full&&(full.kind==="T"||full.kind==="copy")&&!f.binds[i].val) f.binds[i].val=full;}
      p=e+1;i++;}}
  /* the reads */
  const reads=[];
  const chainAt=p=>{const r=M.slice(p,p+300).match(new RegExp("^"+CHAIN+"(\\s*\\[)?"));return {segs:segsOf(r[1]),dyn:!!r[2],len:r[1].length};};
  const isWrite=p=>/^\s*(=(?![=>])|\+=|-=)/.test(M.slice(p,p+4));
  const push=(r,start,p,ch)=>{if(isWrite(p+ch.len)) return;
    let idx=null,after=p+ch.len;
    if(ch.dyn){const o=M.indexOf("[",after),c=match.get(o);idx=src.slice(o+1,c).replace(/\s+/g,"");after=c+1;}
    const rest=M.slice(after,after+300).match(new RegExp("^"+CHAIN+"(?:\\s*\\[[^\\]]*\\])*\\s*(\\|\\||\\?\\?)?"));
    reads.push({...r,path:[...r.path,...ch.segs],dyn:ch.dyn,idx,fallback:!!(rest&&rest[2]),line:lineOf(start),
      text:src.slice(start,after).replace(/\s+/g," ")});};
  for(const t of M.matchAll(/(?<![\w$.])T\s*\[/g)){const o=t.index+t[0].length-1,c=match.get(o);push({kind:"T",path:[]},t.index,c+1,chainAt(c+1));}
  for(const t of M.matchAll(/(?<![\w$.])T\s*\.\s*(?:en|fr|es)\b/g)) push({kind:"T",path:[]},t.index,t.index+t[0].length,chainAt(t.index+t[0].length));
  for(const g of Object.keys(GETTERS)) for(const t of M.matchAll(new RegExp("(?<![\\w$.])"+g+"\\s*\\(\\s*\\)","g")))
    push({kind:"T",path:GETTERS[g]},t.index,t.index+t[0].length,chainAt(t.index+t[0].length));
  for(const t of M.matchAll(new RegExp("(?<![\\w$.])("+COPYFN+")\\s*\\(\\s*\"","g"))){const {lit,end}=literal(t.index+t[0].length);
    const o=t.index+t[0].indexOf("(");const c=match.get(o);
    if(!/^\s*[,)]/.test(M.slice(end,end+4))){reads.push({kind:"copy",path:[lit+"…"],dyn:true,idx:"…",line:lineOf(t.index),text:src.slice(t.index,c+1).replace(/\s+/g," ")});continue;}
    push({kind:"copy",path:lit.split(".")},t.index,c+1,chainAt(c+1));}
  for(const t of M.matchAll(/(?<![\w$.])copyFor\s*\(/g)){const o=t.index+t[0].length-1,c=match.get(o);push({kind:"copy",path:[]},t.index,c+1,chainAt(c+1));}
  for(const nm of new Set(binds.filter(b=>b.val).map(b=>b.name)))
    for(const r of M.matchAll(new RegExp("(?<![\\w$.])"+nm.replace(/\$/g,"\\$")+"(?=\\s*\\??\\.\\s*[A-Za-z_$]|\\s*\\[)","g"))){
      const val=lookup(nm,r.index);if(!val||(val.kind!=="T"&&val.kind!=="copy")) continue;
      push({kind:val.kind,path:val.path,via:nm},r.index,r.index+nm.length,chainAt(r.index+nm.length));}
  return {reads,GETTERS};}

const A0=boot();const T=A0.T,TSRC=A0.TSRC;
const isPlain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
/* where a path leads in one table: to a value, past a leaf (a method or an
   index on words, a list or a function), or to nothing (the missing prefix) */
function walk(root,path){let o=root;for(let i=0;i<path.length;i++){if(!isPlain(o)) return {ok:true};
  if(!Object.prototype.hasOwnProperty.call(o,path[i])) return {ok:false,miss:path.slice(0,i+1).join(".")};o=o[path[i]];}
  return {ok:true,value:o};}
const inEvery=path=>LANGS.every(l=>walk(T[l],path).ok);
const inNone=path=>LANGS.every(l=>!walk(T[l],path).ok);

section("A. every read of the interface tables is found");
const {reads,GETTERS}=tableReads(src);
const tReads=reads.filter(r=>r.kind==="T"),cReads=reads.filter(r=>r.kind==="copy");
console.log(`  ${reads.length} reads: ${tReads.length} of the tables (${tReads.filter(r=>r.via).length} through a name bound to one, `+
  `${tReads.filter(r=>r.dyn).length} indexed), ${cReads.length} copy references; group accessors ${Object.keys(GETTERS).join(", ")}`);
chk("the audit sees the reads it must see (a floor, so a broken scan cannot pass as a clean one)",
  tReads.length>500&&reads.some(r=>r.via&&r.path.join(".")==="ui.noEarlier")&&reads.some(r=>r.path.join(".")==="library.title")
  &&reads.some(r=>r.path.join(".")==="labels.big.s3notes")&&Object.keys(GETTERS).length>=4,
  tReads.length);

section("A. no table read is defined in no language");
{const undef=new Map();
 for(const r of tReads){if(inEvery(r.path)) continue;
   const miss=LANGS.map(l=>walk(T[l],r.path)).find(x=>!x.ok).miss;(undef.get(miss)||undef.set(miss,[]).get(miss)).push("line "+r.line+": "+r.text);}
 chk(`every one of the ${tReads.length} table reads is defined in en, fr, es and es-AR`,undef.size===0,
   [...undef].map(([k,v])=>k+" ("+v.slice(0,2).join("; ")+")").join(" | "));}

section("A. copy references no table defines are a module's, with the tables' words under them");
/* A copy reference is looked up in the installed modules' copy first. Where no
   table defines it, only a module can, so the code must fall back to words a
   table does define. Each such reference, and the words under it: */
const MODULE_ONLY={
  "today":"labels.today",          // qDefault: a legacy `today` activity's questions, named by labels.today without one
  "today.carry":"labels.today.carry",
  "today.extra":"labels.today.extra",
  "today.…":"list",                // listWord(k): a list's own words, list.<k> when no module words them
  "today.f":"labels.today",        // qDefault and the reader of the readable half: a question's words, else its field's name
  "today.lists":"labels.today",    // the reader of the readable half: a list's words, else its field's name
  "today.did":"list.did",          // a tick-list's words: its own, a module's, else list.did
  "gd.earlier":"big.earlier"       // the notes kept from the old six-step guide
};
{const found=new Map();
 for(const r of cReads){if(!r.path.length) continue;
   if(!(r.dyn&&r.idx==="…")&&inEvery(r.path)) continue;
   const key=r.path.join(".");(found.get(key)||found.set(key,[]).get(key)).push(r.line);}
 const got=[...found.keys()].sort(),want=Object.keys(MODULE_ONLY).sort();
 chk("the copy references only a module supplies are exactly the reviewed ones",JSON.stringify(got)===JSON.stringify(want),
   "found "+got.join(", ")+" | reviewed "+want.join(", "));
 for(const [ref,under] of Object.entries(MODULE_ONLY))
   chk(`"${ref}": the words under it, ${under}, are defined in every language`,inEvery(under.split(".")));}
chk("listWord reads each of its words through a module's `today` copy, then list.<word>",
  /const listWord=k=>\{const v=copyAt\("today\."\+k,undefined\);return isText\(v\)&&nonEmpty\(v\)\?v:T\[lang\]\.list\[k\];\};/.test(src));

section("A. every indexed read resolves to keys the tables define");
/* The keys the code can pass at each indexed read, from the renderer's own
   vocabulary. `open` marks a read written with a fallback (`x[k] || …`)
   whose keys are the booklet's own, not the renderer's. */
const fromSrc=(re,g=1)=>[...src.matchAll(re)].map(m=>m[g]);
const barPairs=(()=>{const m=src.match(/for\(const \[id,key\] of (\[\[[\s\S]*?\]\])\) document\.getElementById\(id\)\.textContent=t\[key\];/);
  return m?JSON.parse(m[1]).map(p=>p[1]):[];})();
const KEYS={
  "ui.types[q.rawType]":Object.keys(T.en.ui.types), "ui.types[nq.rawType]":Object.keys(T.en.ui.types),  // Q() admits no other
  "blockEdit.kinds[b.type]":A0.BLOCK_KINDS, "blockEdit.kinds[k]":A0.BLOCK_KINDS,
  "ui.contact[v]":A0.CONTACTS, "ui.contact[c]":A0.CONTACTS,
  "list[k]":fromSrc(/listWord\(\s*"(\w+)"\s*\)/g).concat(fromSrc(/listWord\(\s*\w+\s*\?\s*"(\w+)"\s*:\s*"(\w+)"\s*\)/g,1),fromSrc(/listWord\(\s*\w+\s*\?\s*"(\w+)"\s*:\s*"(\w+)"\s*\)/g,2)),
  "ui.kinds[a.type]":A0.KINDS, "ui.kinds[it.kind]":A0.KINDS, "ui.kinds[r.kind]":A0.KINDS,
  "ui.itemPh[it.kind]":A0.KINDS, "ui.add[k]":A0.KINDS,
  "ui.outcomes[o]":["done","dropped","replaced"], "labels.outcomes[r.outcome]":["done","dropped","replaced"],
  "ui.nameLbl[0]":["0"], "checkin.emo.other[0]":["0"], "checkin.emo.other[1]":["1"],
  "checkin.body.f[key]":A0.BODY_KEYS, "checkin.body.f[k]":A0.BODY_KEYS, "labels.checkin[k]":A0.BODY_KEYS,
  "big.areas.f[key]":A0.AREA_KEYS,
  "labels.today[key]":A0.TODAY_KEYS, "labels.today[k]":[...A0.TODAY_LISTS,...A0.TODAY_KEYS],
  "labels.big[k]":fromSrc(/const map=\{s1:\[([^\]]*)\],\s*s2:\[([^\]]*)\],\s*s4:\[([^\]]*)\],\s*s6:\[([^\]]*)\]\};/g,1)
    .concat(...[2,3,4].map(g=>fromSrc(/const map=\{s1:\[([^\]]*)\],\s*s2:\[([^\]]*)\],\s*s4:\[([^\]]*)\],\s*s6:\[([^\]]*)\]\};/g,g)))
    .flatMap(x=>x.split(",").map(y=>y.trim().replace(/"/g,""))).filter(Boolean),
  "ui[key]":barPairs,
  "blockEdit.axis[k]":["top","bottom","left","right"],
  "reading.kind[b.kind]":A0.CALLOUT_KINDS, "reading.kind[k]":A0.CALLOUT_KINDS, "reading.show[k]":A0.CALLOUT_KINDS,
  "reading.kindOf[s.kind]":A0.SOURCE_KINDS, "reading.kindOf[k]":A0.SOURCE_KINDS,
  "labels.h[k]":Object.keys(T.en.labels.h)                 // Object.keys(L.h): the table's own keys
};
const OPEN={"history.filters[m.id]":"an activity's filter falls back to its own name"};
/* two helpers walk any table by the path they are handed; their paths are the
   copy references above */
const WALKERS={"[s]":"pick() walks a copy reference's path","[k]":"mergeDeep() copies a table into another"};
{const dyn=reads.filter(r=>r.dyn&&!(r.kind==="copy"&&r.idx==="…"));const unknown=[],missing=[];
 for(const r of dyn){const sig=r.path.join(".")+"["+r.idx+"]";
   if(WALKERS[sig]||OPEN[sig]) continue;
   const keys=KEYS[sig];if(!keys){unknown.push(sig+" (line "+r.line+")");continue;}
   if(!keys.length){missing.push(sig+": no keys found");continue;}
   for(const k of keys) if(!inEvery([...r.path,k])) missing.push(sig+" → "+k);}
 chk(`${dyn.length} indexed reads: every one has its keys resolved here`,unknown.length===0,unknown.join(", "));
 chk("and every key it can be handed is defined in every language",missing.length===0,[...new Set(missing)].join(", "));
 chk("the renderer's own list of ids is where the dialog words come from (12 of them)",barPairs.length===12,barPairs.length);}

section("A. parity: French and Spanish define what English defines, in the same shape");
{const get=(o,p)=>p.split(".").reduce((a,k)=>a==null?a:a[k],o);
 const shape=v=>Array.isArray(v)?"list of "+v.length:typeof v;
 const en=A0.leafPaths(TSRC.en);
 for(const l of ["fr","es"]){const p=A0.langParity(l);
   chk(`${l}: every one of the ${en.length} keys English defines is written in ${l}`,p.missing.length===0,p.missing.slice(0,10).join(", "));
   chk(`${l}: and ${l} defines nothing English does not`,p.extra.length===0,p.extra.join(", "));
   const off=en.filter(k=>shape(get(TSRC.en,k))!==shape(get(TSRC[l],k)));
   chk(`${l}: each has the same shape as the English (words, a list of the same length, a function)`,off.length===0,
     off.slice(0,8).map(k=>k+": "+shape(get(TSRC.en,k))+" vs "+shape(get(TSRC[l],k))).join(", "));
   const fnOff=en.filter(k=>typeof get(TSRC.en,k)==="function"&&get(TSRC.en,k).length!==get(TSRC[l],k).length);
   chk(`${l}: each function takes what the English one takes`,fnOff.length===0,fnOff.join(", "));}
 const ar=A0.langParity("es-AR");
 chk("es-AR, a layer of differences, overrides only keys English defines",ar.extra.length===0,ar.extra.join(", "));
 const arOff=A0.leafPaths(TSRC["es-AR"]).filter(k=>shape(get(TSRC["es-AR"],k))!==shape(get(TSRC.en,k)));
 chk("and in the same shape",arOff.length===0,arOff.join(", "));}

/* ========================= B. the pages ========================= */
(async()=>{
const modFiles=fs.readdirSync(R+"/modules").filter(f=>f.endsWith(".md")).sort();
/* modules/ is version 2 markdown now; moduleFromText() (v1 only) returns
   nothing for it, so a real module object is read the way the renderer
   itself reads one. */
const mod=(A,f)=>{const t=fs.readFileSync(R+"/modules/"+f,"utf8");
  return A.moduleFromText(t)||(A.parseFile(t).template||{}).modules?.[0];};
/* what a raw key looks like: a table's own key (a camelCase or numbered name,
   or a dotted path), a module's copy reference, or the id of one of the
   modules' activities, blocks or fields */
const RAW=(()=>{const s=new Set();
  for(const l of LANGS) for(const p of A0.leafPaths(TSRC[l]||{})){s.add(p);const last=p.split(".").pop();if(/[A-Z0-9_]/.test(last)&&!/^\d+$/.test(last)) s.add(last);}
  const A=boot();
  for(const f of modFiles){const m=mod(A,f);if(!m) continue;
    const walk=(o,path)=>{if(!o||typeof o!=="object") return;
      if(Array.isArray(o)) return o.forEach(x=>walk(x,path));
      for(const [k,v] of Object.entries(o)){
        if(k==="id"&&typeof v==="string"&&!v.includes("/")&&!/^\d+$/.test(v)) s.add(v);   // a number shows as itself
        if((k==="field"||k==="copy"||k==="h"||k==="lead"||k==="title")&&typeof v==="string"&&/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+$/.test(v)) s.add(v);
        if(k==="q"&&Array.isArray(v)&&v.length===2) s.add(v.join("."));
        if((k==="reads"||k==="source"||k==="of"||k==="keys")&&Array.isArray(v)) v.forEach(x=>typeof x==="string"&&s.add(x));
        walk(v,k);}};
    walk(m);}
  return s;})();
const BAD=/\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]/;
const problems=(got)=>{const out=[];
  for(const [s,w] of got){if(BAD.test(s)) out.push(`"${s.slice(0,60)}" (${w})`);else if(RAW.has(s)) out.push(`raw key "${s}" (${w})`);}
  return [...new Set(out)];};
/* a button or a disclosure's summary that says nothing is a control nobody can find */
const unnamed=(n,where)=>find(n,x=>x.tagName==="button"||x.tagName==="summary").filter(x=>!texts(x)&&!(x.attrs["aria-label"]||"").trim()&&!(x.attrs.title||"").trim())
  .map(x=>`an unnamed ${x.tagName} (${where}${x.attrs.class?" ."+x.attrs.class:""})`);

/* every view of the booklet A holds, in and out of editing, every card of every board opened */
function views(A,tag,out,bad){
  const take=(where)=>{collect(main(),out,where);bad.push(...unnamed(main(),where));};
  for(const ed of [false,true]){A.editing=ed;const e=ed?"+edit":"";
    A.view="home";A.render();take(tag+" home"+e);
    for(const m of A.tplModes()){A.view=m.id;A.render();take(tag+" "+m.id+e);
      /* a board: open each of its cards in turn */
      const cards=()=>find(main(),x=>x.tagName==="button"&&hasClass("mapcard")(x));
      for(let i=0;i<cards().length;i++){const c=cards()[i];if(c.attrs["aria-selected"]!=="true") click(c);take(tag+" "+m.id+e+" card "+(i+1));}}
    for(const m of A.tplModules().filter(A.isMulti)){A.view=A.moduleView(m.id);A.render();take(tag+" "+m.id+e);}}
  A.editing=false;}
async function page(l,build){wipe();LS[PREF]=l;const A=boot();A.lang=l;A.render();if(build) await build(A);return A;}

for(const l of LANGS){
  section(`B. ${l}: every view, every shipped module, and the empty states`);
  let read=0;const report=(name,got,bad)=>{read+=got.length;const p=[...problems(got),...new Set(bad)];
    chk(`${l}: ${name}: ${got.length} strings, none undefined, null, [object Object] or a raw key, no unnamed control`,p.length===0,p.slice(0,6).join("; "));};

  /* the list of booklets, with none, and a booklet with nothing in it */
  {const out=[],bad=[];const A=await page(l);collect(main(),out,"list");bad.push(...unnamed(main(),"list"));
   await A.createBooklet();A.view="home";A.render();collect(main(),out,"empty booklet");bad.push(...unnamed(main(),"empty booklet"));
   A.editing=true;A.render();collect(main(),out,"empty booklet +edit");A.editing=false;
   A.view="history";A.render();collect(main(),out,"empty history");
   report("no booklets, an empty booklet and an empty history",out,bad);}

  /* each shipped module alone: every view, nothing written, nothing kept */
  for(const f of modFiles){const out=[],bad=[];
    const A=await page(l,async A=>{await A.createBooklet();A.addModule(mod(A,f));});
    views(A,f,out,bad);A.view="history";A.render();collect(main(),out,f+" history");
    report(`${f} alone, nothing kept`,out,bad);}

  /* The empty states the original bug lived in ("weekly-review" installed
     without "the-board", so its `list` blocks read a field nobody supplied)
     no longer exist to test: weekly-review is a second activity inside
     the-board's own module now, version 2 has no `list`/`didlog` kind at
     all yet (see modules/the-board.md's own note), and the synthetic
     `bare` module just below already covers a tick-list/list with no words
     of their own — the actual mechanism this section used to guard. */

  /* a tick-list and a list with no words of their own, in a module that brings none */
  {const out=[],bad=[];
   const bare={id:"test/bare",version:"0.1",title:{en:"Bare",fr:"Nu",es:"Pelado"},mode:{id:"bare",kind:"entry",blocks:[
     {id:"picks",type:"list",source:["inflight"],label:{en:"Picks",fr:"Choix",es:"Opciones"}},{id:"ticks",type:"didlog",of:["picks"]}]}};
   const A=await page(l,async A=>{await A.createBooklet();A.addModule(bare);});
   A.view="bare";A.render();collect(main(),out,"bare");bad.push(...unnamed(main(),"bare"));
   const said=texts(main());
   chk(`${l}: a tick-list with no words of its own is headed, and says there is nothing to tick yet`,
     said.includes(((A.T[l].list||{}).did||{}).h)&&said.includes(((A.T[l].list||{}).did||{}).none),said.slice(0,300));
   report("a list and a tick-list that bring no words",out,bad);}

  /* every shipped module together, then with something written and kept */
  {const out=[],bad=[];
   const A=await page(l,async A=>{await A.createBooklet();for(const f of modFiles) A.addModule(mod(A,f));});
   views(A,"all",out,bad);A.view="history";A.render();collect(main(),out,"all history");
   report("every shipped module together, nothing kept",out,bad);}
  console.log(`  (${read} strings read in ${l})`);
}

P.closePages();
console.log(fails?"\n"+fails+" FAILURES":"\nundefined checks passed");
process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
