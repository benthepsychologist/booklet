/* THE SUBMIT BUILD'S SCRIPT (submit/submit.js, version below). It is never part of the published booklet.html.
   submit/build.js puts it, as a script element with the id booklet-submit, directly after the main script of a copy of the
   one-file build, writes the registry's endpoints (name, address, owner, description) in a meta tag named booklet-submit, and adds
   this script's sha256 and the origin of each of those addresses to the copy's Content-Security-Policy. The copy is a different file
   with its own checksum: booklet-submit.html.
   What it adds, and nothing else:
   - a Submit button in the bar, shown only while a booklet is open whose front matter says `submit: <name>` (format 0.21) and the
     name is one of the endpoints the file declares. A booklet that names no endpoint has no button and nothing is said; one that
     names an endpoint the file does not list, or writes something that is not a name, has no button and one line in the bar that
     says why;
   - on the reader's press, a screen that shows where the answers would go (the registry's own name, owner and address for the
     endpoint, never anything the booklet supplied but the name), their answers as they gave them (each answered question's words
     and the answer's, by module, in the booklet's own words), the exact text that would be sent one tap away, and a Send button;
   - on the reader's press of Send, one request: a POST of that text, as JSON, to that endpoint's address, with no cookies, no
     referrer and no redirect. The body is {"recipe", "answers", "booklet", "seen"} (recepture's payload contract; it keeps
     extra top-level keys): the recipe the host named with BookletSubmit.recipe(), else the booklet's own id; the answers are
     every module's once-answered questions in one map, keyed by question id exactly as the file writes it; "booklet" is the
     file's id, version and language; "seen" says, for each answered question, what the reader was shown (its words, the options
     in the order shown, the words picked). Kept entries and drafts are not sent. Two modules that answer
     the same id stop the send rather than lose one of them;
   - after the address answers 201, nothing the reader wrote is removed: the booklet stays open, kept in this browser as it
     was before, and can be downloaded as any booklet. Submit then reads Sent and sends nothing more until an answer
     changes (in this page: a reload forgets what was sent). Any other answer, or none, says so and keeps every answer, so
     the reader can try again.
   It reads the renderer's own top-level state and helpers by name (BOOK, STATE, currentId, screen, lang, bookOpen, frontMatter,
   kvLine, fieldSummary, ...): the main script is a classic script with no wrapper, so a later classic script on the page sees its
   bindings. The booklet's `submit` line is read from its front matter by the renderer's own frontMatter and kvLine, the pair its
   own parse reads the front matter with, and not by a pattern of this script's. It wraps renderBar and markDirty to keep its
   button in step. It is built from the same release as the renderer it sits in, and test/submit-build.test.js and
   test/submit-browser.js check the two still fit.
   Nothing in a booklet, a link or the browser's storage can name an address: only the file's own meta tag holds addresses, a
   booklet can only pick one of its endpoints by name, and the file's policy allows no other origin. */
(function(){
"use strict";
const SUBMIT_VERSION="0.4.0";
/* ---- the endpoints the file declares, and the one a booklet names ---- */
const NAME=/^[a-z0-9-]{1,40}$/;
/* the registry's endpoints from the file's meta tag: {name, address, owner, description}, four strings each. An entry that does
   not fit (a name that is not a name, an address that does not parse or is not http or https, which the build never writes) is left
   out, and a tag that cannot be read declares none, so nothing can be sent. A Map, so that a name like "constructor" is only a name. */
const ENDPOINTS=new Map();
(function(){const tag=document.querySelector('meta[name="booklet-submit"]');let j=null;
  try{j=tag?JSON.parse(String(tag.getAttribute("content")||"")):null;}catch(e){j=null;}
  for(const e of (j&&Array.isArray(j.endpoints)?j.endpoints:[])){
    if(!e||typeof e!=="object"||typeof e.name!=="string"||!NAME.test(e.name)||ENDPOINTS.has(e.name)) continue;
    if(typeof e.address!=="string"||typeof e.owner!=="string"||typeof e.description!=="string") continue;
    let u=null;try{u=new URL(e.address);}catch(x){u=null;}
    if(!u||(u.protocol!=="https:"&&u.protocol!=="http:")) continue;
    ENDPOINTS.set(e.name,Object.freeze({name:e.name,address:e.address,owner:e.owner,description:e.description}));}})();
/* the recipe the host named for the booklets it gives; null means the booklet's own id */
let RECIPE=null;
const T={
  en:{submit:"Submit",title:"Send your answers?",
    help:"Pressing Send sends the answers below to the address shown here, with the questions and options as you saw them, and nothing else. Nothing has been sent yet.",
    toName:"Name",toOwner:"Owner",toAddress:"Address",
    unlisted:n=>"Submit is not available: this booklet asks for the endpoint “"+n+"”, which this page does not list.",
    badName:"Submit is not available: the submit line in this booklet is not an endpoint name.",
    exact:"Show exactly what is sent",other:"Other answers in this booklet",
    send:"Send",cancel:"Cancel",sending:"Sending…",close:"Close",sentTitle:"Sent",
    sent:r=>"Your answers were received"+(r?" (reference "+r+")":"")+". They are still here in your booklet.",
    refused:(s,c)=>"Not sent: the address answered "+s+(c?" ("+c+")":"")+". Your answers are still here, and you can try again.",
    unreachable:"Not sent: the address could not be reached. Your answers are still here, and you can try again.",
    clash:id=>"These answers cannot be sent: two parts of this booklet use the same question id, “"+id+"”.",
    nothing:"There are no answers to send yet."},
  /* es and fr checked by /localize (2026-10-22; `help`, changed in 0.3.0, again 2026-10-24, for 0.3.1): "booklet" is
     cuadernillo and carnet, as in the renderer's own tables. NOT yet checked (new or changed in 0.4.0, written beside the English and
     not run through /localize): `help` (changed again), `toName`, `toOwner`, `toAddress`, `unlisted` and `badName`, in es and fr. */
  es:{submit:"Enviar",title:"¿Enviar tus respuestas?",
    help:"Al presionar Enviar, las respuestas de abajo se envían a la dirección que se indica aquí, con las preguntas y las opciones tal como las viste, y nada más. Todavía no se ha enviado nada.",
    toName:"Nombre",toOwner:"Responsable",toAddress:"Dirección",
    unlisted:n=>"Enviar no está disponible: este cuadernillo pide el destino “"+n+"”, que esta página no incluye en su lista.",
    badName:"Enviar no está disponible: la línea submit de este cuadernillo no es un nombre de destino.",
    exact:"Mostrar exactamente lo que se envía",other:"Otras respuestas en este cuadernillo",
    send:"Enviar",cancel:"Cancelar",sending:"Enviando…",close:"Cerrar",sentTitle:"Enviado",
    sent:r=>"Tus respuestas se recibieron"+(r?" (referencia "+r+")":"")+". Siguen aquí, en tu cuadernillo.",
    refused:(s,c)=>"No se envió: la dirección respondió "+s+(c?" ("+c+")":"")+". Tus respuestas siguen aquí y puedes intentarlo de nuevo.",
    unreachable:"No se envió: no se pudo conectar con la dirección. Tus respuestas siguen aquí y puedes intentarlo de nuevo.",
    clash:id=>"No se pueden enviar estas respuestas: dos partes de este cuadernillo usan el mismo identificador de pregunta, “"+id+"”.",
    nothing:"Todavía no hay respuestas para enviar."},
  fr:{submit:"Envoyer",title:"Envoyer vos réponses ?",
    help:"Si vous appuyez sur Envoyer, vos réponses ci-dessous sont envoyées à l’adresse indiquée ici, avec les questions et les options telles que vous les avez vues, et rien d’autre. Rien n’a encore été envoyé.",
    toName:"Nom",toOwner:"Responsable",toAddress:"Adresse",
    unlisted:n=>"Envoyer n’est pas disponible : ce carnet demande le destinataire « "+n+" », que cette page ne liste pas.",
    badName:"Envoyer n’est pas disponible : la ligne submit de ce carnet n’est pas un nom de destinataire.",
    exact:"Afficher exactement ce qui est envoyé",other:"Autres réponses de ce carnet",
    send:"Envoyer",cancel:"Annuler",sending:"Envoi en cours…",close:"Fermer",sentTitle:"Envoyé",
    sent:r=>"Vos réponses ont été reçues"+(r?" (référence "+r+")":"")+". Elles sont toujours là, dans votre carnet.",
    refused:(s,c)=>"Non envoyé : l’adresse a répondu "+s+(c?" ("+c+")":"")+". Vos réponses sont toujours là, et vous pouvez réessayer.",
    unreachable:"Non envoyé : l’adresse n’a pas pu être atteinte. Vos réponses sont toujours là, et vous pouvez réessayer.",
    clash:id=>"Ces réponses ne peuvent pas être envoyées : deux parties de ce carnet utilisent le même identifiant de question, « "+id+" ».",
    nothing:"Il n’y a pas encore de réponses à envoyer."}};
/* the renderer's language, or its primary language (es-AR reads es), else English */
const S=()=>T[lang]||T[primaryOf(lang)]||T.en;

/* ---- what would be sent ---- */
/* {ok, text} with the exact body, or {ok:false, why} */
function payload(){
  const answers=Object.create(null),all=STATE&&STATE.answers?STATE.answers:{};
  for(const scope of Object.keys(all)){const m=all[scope]||{};
    for(const id of Object.keys(m)){const v=m[id];if(!holdsSomething(v)) continue;
      if(Object.prototype.hasOwnProperty.call(answers,id)) return {ok:false,why:S().clash(id)};
      answers[id]=v;}}
  if(!Object.keys(answers).length) return {ok:false,why:S().nothing};
  const recipe=RECIPE!==null?RECIPE:(BOOK&&BOOK.id)||"";
  const body={recipe,answers:{...answers}},bk=bookletOf(),sn=seenAnswers();
  if(bk) body.booklet=bk;
  if(Object.keys(sn).length) body.seen=sn;
  return {ok:true,text:JSON.stringify(body,null,2)};}
/* What the reader was shown, sent beside `answers` and never instead of it. A stored position (a choice's, a scale's) cannot be
   read later without the file the reader had, and the body names a recipe, not the file's text. So for each answered question,
   by its id as in `answers`: `question` (its words), and for a question with options the words of the options in the order
   shown (`options`, or `anchors` with their numbers, and `items` for a matrix) and the words picked (`picked`). Words are
   plain text, in the booklet's own language. `booklet` says which file: its id, its version and its language. */
const plain=s=>plainText(s==null?"":s);
function bookletOf(){if(!BOOK) return null;
  const o={id:BOOK.id},v=BOOK.version,l=BOOK.raw&&BOOK.raw.lang;
  if(typeof v==="string"&&v!=="") o.version=v;
  if(typeof l==="string"&&l!=="") o.lang=l;
  return o;}
function seenOf(b,v,text){
  const o={question:plain(fieldLabel(b))||keysOf(b)[0]};
  const anchors=()=>(b.anchors||[]).map(a=>({n:a.n,text:plain(a.text)}));
  const wordsOfAnchor=n=>{const a=(b.anchors||[]).find(x=>x.n===n);return a?plain(a.text):String(n);};
  if(b.type==="choice"||b.type==="multi"){const listed=b.options||[];
    o.options=listed.map(plain);
    o.picked=picksOf(v).filter(x=>typeof x==="string"?x.trim()!=="":x!==null&&x!==undefined)
      .map(n=>typeof n==="string"?n:(listed[n-1]!==undefined?plain(listed[n-1]):"#"+n));}
  else if(b.type==="scale"){o.anchors=anchors();o.picked=wordsOfAnchor(v);}
  else if(b.type==="matrix"){o.items=(b.items||[]).map(plain);o.anchors=anchors();
    o.picked=(b.items||[]).map((_,i)=>typeof v[i]==="number"?wordsOfAnchor(v[i]):null);}
  else if(b.type==="widget"){o.picked=text;}
  return o;}
/* the same walk as readable(): every module's questions that hold an answer, repeating activities skipped */
function seenAnswers(){const out=Object.create(null);
  for(const m of (BOOK&&BOOK.modules)||[]){const ans=peekAnswers(scopeOfModule(m));
    for(const a of m.activities||[]){if(a.kind==="entry") continue;
      for(const b of allBlocksOf(a)){if(!QUESTION_KINDS.has(b.type)) continue;
        const k=keysOf(b)[0];if(k===undefined||!holdsSomething(ans[k])||hasOwn(out,k)) continue;
        out[k]=seenOf(b,ans[k],b.type==="widget"?answerText(b,ans,k):"");}}}
  return {...out};}
/* the same answers as the reader gave them, for the confirm screen: one group per module, each answered question's words and
   the answer's, read by the renderer's own fieldSummary (as its kept-entry cards read them). An answer no question names is
   listed by its id under "other", so the list holds everything payload() sends. Repeating activities keep entries, not
   answers, and are skipped, as the file's records skip them. */
const asText=v=>typeof v==="string"?v.trim():Array.isArray(v)?v.filter(holdsSomething).map(asText).join(", ")
  :v&&typeof v==="object"?JSON.stringify(v):String(v);
function answerText(b,ans,k){let r=null;try{r=fieldSummary(b,ans);}catch(e){r=null;}
  if(!r) return asText(ans[k]);
  if(b.type==="date") return longDate(ans[k]);
  const n=r[1];
  return n&&n.nodeType===1&&n.tagName==="UL"?Array.from(n.children).map(nodeText).join("\n"):nodeText(n);}
function readable(){const groups=[],all=STATE&&STATE.answers?STATE.answers:{},seen=Object.create(null);
  for(const m of (BOOK&&BOOK.modules)||[]){const scope=scopeOfModule(m),ans=peekAnswers(scope),rows=[];
    for(const a of m.activities||[]){if(a.kind==="entry") continue;
      for(const b of allBlocksOf(a)){if(!QUESTION_KINDS.has(b.type)) continue;
        const k=keysOf(b)[0];if(k===undefined||!holdsSomething(ans[k])) continue;
        (seen[scope]||(seen[scope]=Object.create(null)))[k]=true;
        rows.push([plainText(fieldLabel(b))||k,answerText(b,ans,k)]);}}
    if(rows.length) groups.push({title:plainText(tx(m.title,m.id))||m.id,rows});}
  const other=[];
  for(const scope of Object.keys(all)){const m=all[scope]||{};
    for(const id of Object.keys(m)) if(holdsSomething(m[id])&&!(seen[scope]&&seen[scope][id])) other.push([id,asText(m[id])]);}
  if(other.length) groups.push({title:S().other,rows:other});
  return groups;}
/* ---- which endpoint the open booklet names ---- */
/* The booklet's `submit` value, read from its front matter by the renderer's own frontMatter and kvLine (the last such line wins, as in
   its parse): null when the booklet has no such line, else the text after the colon, quotes off. Kept for as long as the booklet's
   source text is the same text, since this is asked after every answer. */
let FM=null;
function submitLine(){const src=BOOK&&BOOK.raw?BOOK.raw.source:"";
  if(typeof src!=="string") return null;
  if(FM&&FM.src===src) return FM.v;
  let v=null;
  for(const l of frontMatter(src,true).head||[]){const kv=kvLine(l);if(kv&&kv[0]==="submit") v=kv[1];}
  FM={src,v};return v;}
/* what the open booklet asks of Submit: {ep} an endpoint of this file, or {why} a line saying why there is none, or {} (nothing to say:
   no booklet open, "Your booklets" on screen, or a booklet that names no endpoint at all) */
function resolve(){
  if(!bookOpen()||screen===LIB_SCREEN) return {};
  const v=submitLine();if(v===null) return {};
  if(!NAME.test(v)) return {why:S().badName};
  const ep=ENDPOINTS.get(v);
  return ep?{ep}:{why:S().unlisted(v)};}
/* whether the open booklet is one Submit is for: it names one of this file's endpoints */
const forHost=()=>!!resolve().ep;
/* the body the endpoint last accepted for the open booklet, in this page; Submit reads Sent while nothing has changed since */
let LAST=null;
const sentAlready=()=>{if(!LAST||LAST.id!==currentId) return false;const p=payload();return p.ok&&p.text===LAST.text;};

/* ---- the button and the screen ---- */
const el=(name,attrs,text)=>{const n=document.createElement(name);
  for(const k of Object.keys(attrs||{})) n.setAttribute(k,attrs[k]);
  if(text!=null) n.textContent=text;return n;};
const btn=el("button",{type:"button",class:"navb",id:"btnSubmit",hidden:""});
const tools=document.querySelector(".bar .tools");
if(tools) tools.insertBefore(btn,document.getElementById("btnExport"));
/* the reason there is no Submit for a booklet that asks for one: one quiet line in the bar, after the save line */
const why=el("span",{class:"saveline",id:"submitWhy",role:"status",hidden:""});
const barEnd=document.getElementById("saveLine");
if(barEnd&&barEnd.parentNode) barEnd.parentNode.insertBefore(why,barEnd.nextSibling);
const veil=el("div",{class:"veil",id:"veilSubmit",role:"dialog","aria-modal":"true","aria-labelledby":"submitTitle"});
const panel=el("div",{class:"panel"});
const title=el("h3",{id:"submitTitle"}),help=el("p",{id:"submitHelp"});
/* where the answers would go: the registry's name, owner and address, which the booklet does not supply */
const dest=el("dl",{id:"submitTo",style:"display:none;grid-template-columns:auto minmax(0,1fr);gap:.2rem .8rem;margin:.6rem 0 0;font-size:.9rem"});
const list=el("div",{id:"submitList",tabindex:"0",style:"max-height:50vh;overflow:auto;margin:.75rem 0 0"});
const fold=el("details",{class:"about",id:"submitExact",style:"margin:.75rem 0 0"}),foldLabel=el("summary",{});
const body=el("pre",{id:"submitBody",tabindex:"0",style:"max-height:35vh;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:.8rem;background:var(--field);border:var(--bw) solid var(--rule);border-radius:8px;padding:.6rem .75rem;margin:0 .9rem .8rem"});
fold.append(foldLabel,body);
const msg=el("div",{class:"msg",id:"submitMsg",role:"status"});
const actions=el("div",{class:"actions"});
const cancel=el("button",{type:"button",id:"submitCancel"}),send=el("button",{type:"button",id:"submitSend",class:"primary"});
actions.append(cancel,send);panel.append(title,help,dest,list,fold,msg,actions);veil.append(panel);
document.body.appendChild(veil);

let SHOWN=null,SENDING=false;
function sync(){const t=S(),r=resolve(),here=!!r.ep,done=here&&sentAlready();
  why.textContent=r.why||"";why.hidden=!r.why;
  btn.textContent=done?t.sentTitle:t.submit;btn.hidden=!here;btn.disabled=SENDING;
  btn.setAttribute("aria-disabled",done?"true":"false");btn.style.opacity=done?".6":"";btn.style.cursor=done?"default":"";}
function say(text,err){msg.textContent=text||"";msg.classList.toggle("err",!!err);}
/* the answers, one card per module, question above answer */
function drawList(groups){list.textContent="";
  for(const g of groups){const card=el("div",{class:"entry",style:"margin:0 0 .6rem;padding:.7rem .9rem"});
    const dl=el("dl",{style:"grid-template-columns:minmax(0,1fr)"});
    for(const [q,a] of g.rows) dl.append(el("dt",{},q),el("dd",{},a));
    card.append(el("h4",{style:"margin:0 0 .4rem;font-size:.95rem;color:var(--ink)"},g.title),dl);list.append(card);}}
const showBody=on=>{list.hidden=!on;fold.hidden=!on;if(!on){list.textContent="";body.textContent="";}};
/* the endpoint the screen is for: the one the answers go to if Send is pressed, taken from the file's own list */
let TARGET=null;
function drawDest(ep){dest.textContent="";const t=S();
  for(const [k,v] of [[t.toName,ep.name],[t.toOwner,ep.owner],[t.toAddress,ep.address]])
    dest.append(el("dt",{style:"color:var(--muted)"},k),el("dd",{style:"margin:0;word-break:break-word"},v));}
function show(){const t=S(),p=payload(),ep=resolve().ep;if(!ep) return;
  TARGET=ep;drawDest(ep);dest.style.display="grid";
  title.textContent=t.title;help.textContent=t.help;cancel.textContent=t.cancel;send.textContent=t.send;
  foldLabel.textContent=t.exact;fold.open=false;cancel.hidden=false;send.hidden=false;
  if(p.ok){SHOWN=p.text;showBody(true);body.textContent=p.text;drawList(readable());send.disabled=false;say("");}
  else{SHOWN=null;showBody(false);send.disabled=true;say(p.why,true);}
  veil.setAttribute("open","");(p.ok?send:cancel).focus();}
function hide(){if(SENDING) return;veil.removeAttribute("open");SHOWN=null;TARGET=null;
  if(!btn.hidden) btn.focus();}
async function post(){const ep=resolve().ep;
  if(SENDING||SHOWN===null||!ep||!TARGET||ep.name!==TARGET.name) return;
  const t=S(),text=SHOWN,id=currentId;SENDING=true;send.disabled=true;cancel.disabled=true;sync();say(t.sending);
  const stop=new AbortController(),timer=setTimeout(()=>stop.abort(),20000);
  let res=null;
  try{res=await fetch(ep.address,{method:"POST",headers:{"Content-Type":"application/json"},body:text,
    credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer",signal:stop.signal});}
  catch(e){res=null;}
  clearTimeout(timer);
  let data=null;
  if(res){try{data=await res.json();}catch(e){data=null;}}
  SENDING=false;cancel.disabled=false;
  if(res&&res.status===201){LAST={id,text};SHOWN=null;
    const ref=data&&typeof data.response_id==="string"?data.response_id.slice(0,8):"";
    title.textContent=t.sentTitle;help.textContent=t.sent(ref);showBody(false);
    send.hidden=true;cancel.textContent=t.close;say("");cancel.focus();sync();return;}
  send.disabled=false;sync();
  if(!res) return say(t.unreachable,true);
  const code=data&&data.error&&typeof data.error.code==="string"?data.error.code:"";
  say(t.refused(res.status,code),true);}

btn.addEventListener("click",e=>{if(!e||e.isTrusted!==true||!forHost()||sentAlready()) return;show();});
send.addEventListener("click",e=>{if(!e||e.isTrusted!==true) return;post();});
cancel.addEventListener("click",()=>hide());
veil.addEventListener("click",e=>{if(e.target===veil) hide();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&veil.hasAttribute("open")) hide();});

/* the bar is drawn again on every screen, and an answer changes without a redraw; the button follows both */
const drawBar=renderBar;
renderBar=function(){const r=drawBar.apply(this,arguments);try{sync();}catch(e){}return r;};
const changed=markDirty;
markDirty=function(){const r=changed.apply(this,arguments);try{sync();}catch(e){}return r;};
sync();

/* what a host's script may call: name the recipe its booklets are sent with */
Object.defineProperty(window,"BookletSubmit",{value:Object.freeze({version:SUBMIT_VERSION,endpoints:Object.freeze([...ENDPOINTS.values()]),
  recipe(r){if(typeof r==="string"&&r.trim()!==""){RECIPE=r;return true;}
    if(r&&typeof r==="object"&&!Array.isArray(r)){try{RECIPE=JSON.parse(JSON.stringify(r));return true;}catch(e){return false;}}
    return false;}}),writable:false,configurable:false,enumerable:true});
})();
