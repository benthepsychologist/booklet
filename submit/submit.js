/* THE SUBMIT BUILD'S SCRIPT (submit/submit.js, version below). It is never part of the published booklet.html.
   submit/build.js puts it, as a script element with the id booklet-submit, directly after the main script of a copy of the
   one-file build, writes the address it sends to in a meta tag named booklet-submit, and adds this script's sha256 and that address's origin to
   the copy's Content-Security-Policy. The copy is a different file with its own checksum: booklet-submit.html.
   What it adds, and nothing else:
   - a Submit button in the bar, shown only while a booklet the host gave is open (one handed over by Booklet.open with a
     name, or opened by a #/open/<name> link), and only when the file declares an address;
   - on the reader's press, a screen showing exactly the text that would be sent, and a Send button;
   - on the reader's press of Send, one request: a POST of that text, as JSON, to the declared address, with no cookies, no
     referrer and no redirect. The body is {"recipe", "answers"} (recepture's payload contract): the recipe the host named
     with BookletSubmit.recipe(), else the booklet's own id; the answers are every module's once-answered questions in one
     map, keyed by question id exactly as the file writes it. Kept entries and drafts are not sent. Two modules that answer
     the same id stop the send rather than lose one of them;
   - after the address answers 201, the booklet is closed and this browser's copy of it is removed (its kept copy, its base
     and its row in "Your booklets"). Any other answer, or none, says so and keeps every answer, so the reader can try again.
   It reads the renderer's own top-level state by name (BOOK, STATE, currentId, screen, lang, hostName, ...): the main script
   is a classic script with no wrapper, so a later classic script on the page sees its bindings. It is built from the same
   release as the renderer it sits in, and test/submit-build.test.js and test/submit-browser.js check the two still fit.
   Nothing in a booklet, a link or the browser's storage can name the address: only the file's own meta tag does, and the
   file's policy allows no other origin. */
(function(){
"use strict";
const SUBMIT_VERSION="0.1.0";
const tag=document.querySelector('meta[name="booklet-submit"]');
const ENDPOINT=tag?String(tag.getAttribute("content")||"").trim():"";
let where="";
try{where=ENDPOINT?new URL(ENDPOINT).host:"";}catch(e){where="";}
/* the recipe the host named for the booklets it gives; null means the booklet's own id */
let RECIPE=null;
const T={
  en:{submit:"Submit",title:"Send your answers?",
    help:h=>"Pressing Send sends exactly the text below to "+h+", and nothing else. Nothing has been sent yet.",
    send:"Send",cancel:"Cancel",sending:"Sending…",close:"Close",sentTitle:"Sent",
    sent:r=>"Your answers were received"+(r?" (reference "+r+")":"")+". This browser keeps no copy of them.",
    refused:(s,c)=>"Not sent: the address answered "+s+(c?" ("+c+")":"")+". Your answers are still here, and you can try again.",
    unreachable:"Not sent: the address could not be reached. Your answers are still here, and you can try again.",
    clash:id=>"These answers cannot be sent: two parts of this booklet use the same question id, “"+id+"”.",
    nothing:"There are no answers to send yet."},
  es:{submit:"Enviar",title:"¿Enviar tus respuestas?",
    help:h=>"Al presionar Enviar se envía exactamente el texto de abajo a "+h+", y nada más. Todavía no se ha enviado nada.",
    send:"Enviar",cancel:"Cancelar",sending:"Enviando…",close:"Cerrar",sentTitle:"Enviado",
    sent:r=>"Tus respuestas se recibieron"+(r?" (referencia "+r+")":"")+". Este navegador no guarda ninguna copia.",
    refused:(s,c)=>"No se envió: la dirección respondió "+s+(c?" ("+c+")":"")+". Tus respuestas siguen aquí y puedes intentarlo de nuevo.",
    unreachable:"No se envió: no se pudo llegar a la dirección. Tus respuestas siguen aquí y puedes intentarlo de nuevo.",
    clash:id=>"Estas respuestas no se pueden enviar: dos partes de este cuadernillo usan el mismo id de pregunta, «"+id+"».",
    nothing:"Todavía no hay respuestas para enviar."},
  fr:{submit:"Envoyer",title:"Envoyer vos réponses ?",
    help:h=>"Appuyer sur Envoyer envoie exactement le texte ci-dessous à "+h+", et rien d’autre. Rien n’a encore été envoyé.",
    send:"Envoyer",cancel:"Annuler",sending:"Envoi…",close:"Fermer",sentTitle:"Envoyé",
    sent:r=>"Vos réponses ont été reçues"+(r?" (référence "+r+")":"")+". Ce navigateur n’en garde aucune copie.",
    refused:(s,c)=>"Non envoyé : l’adresse a répondu "+s+(c?" ("+c+")":"")+". Vos réponses sont toujours là, et vous pouvez réessayer.",
    unreachable:"Non envoyé : l’adresse est injoignable. Vos réponses sont toujours là, et vous pouvez réessayer.",
    clash:id=>"Ces réponses ne peuvent pas être envoyées : deux parties de ce livret utilisent le même identifiant de question, « "+id+" ».",
    nothing:"Il n’y a encore aucune réponse à envoyer."}};
const S=()=>T[lang]||T.en;

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
  return {ok:true,text:JSON.stringify({recipe,answers:{...answers}},null,2)};}
/* whether the open booklet is one Submit is for */
const forHost=()=>!!ENDPOINT&&where!==""&&hookOpen()&&hostName()!==""&&screen!==LIB_SCREEN;

/* ---- the button and the screen ---- */
const el=(name,attrs,text)=>{const n=document.createElement(name);
  for(const k of Object.keys(attrs||{})) n.setAttribute(k,attrs[k]);
  if(text!=null) n.textContent=text;return n;};
const btn=el("button",{type:"button",class:"navb",id:"btnSubmit",hidden:""});
const tools=document.querySelector(".bar .tools");
if(tools) tools.insertBefore(btn,document.getElementById("btnExport"));
const veil=el("div",{class:"veil",id:"veilSubmit",role:"dialog","aria-modal":"true","aria-labelledby":"submitTitle"});
const panel=el("div",{class:"panel"});
const title=el("h3",{id:"submitTitle"}),help=el("p",{id:"submitHelp"});
const body=el("pre",{id:"submitBody",tabindex:"0",style:"max-height:45vh;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:.8rem;background:var(--field);border:var(--bw) solid var(--rule);border-radius:8px;padding:.6rem .75rem;margin:.75rem 0 0"});
const msg=el("div",{class:"msg",id:"submitMsg",role:"status"});
const actions=el("div",{class:"actions"});
const cancel=el("button",{type:"button",id:"submitCancel"}),send=el("button",{type:"button",id:"submitSend",class:"primary"});
actions.append(cancel,send);panel.append(title,help,body,msg,actions);veil.append(panel);
document.body.appendChild(veil);

let SHOWN=null,SENDING=false,SENT=false;
function sync(){const t=S();btn.textContent=t.submit;btn.hidden=!forHost();btn.disabled=SENDING;}
function say(text,err){msg.textContent=text||"";msg.classList.toggle("err",!!err);}
function show(){const t=S(),p=payload();SENT=false;
  title.textContent=t.title;help.textContent=t.help(where);cancel.textContent=t.cancel;send.textContent=t.send;
  cancel.hidden=false;send.hidden=false;
  if(p.ok){SHOWN=p.text;body.textContent=p.text;body.hidden=false;send.disabled=false;say("");}
  else{SHOWN=null;body.textContent="";body.hidden=true;send.disabled=true;say(p.why,true);}
  veil.setAttribute("open","");(p.ok?send:cancel).focus();}
function hide(){if(SENDING) return;veil.removeAttribute("open");SHOWN=null;
  if(!btn.hidden) btn.focus();}
/* after a 201: the booklet is closed, and everything this browser kept of it goes */
function forget(){const id=currentId;
  closeBooklet();
  if(id){removeBooklet(id);lsDel(bookKey(id));lsDel(baseKey(id));}
  render();}
async function post(){if(SENDING||SHOWN===null||!forHost()) return;
  const t=S(),text=SHOWN;SENDING=true;send.disabled=true;cancel.disabled=true;sync();say(t.sending);
  const stop=new AbortController(),timer=setTimeout(()=>stop.abort(),20000);
  let res=null;
  try{res=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:text,
    credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer",signal:stop.signal});}
  catch(e){res=null;}
  clearTimeout(timer);
  let data=null;
  if(res){try{data=await res.json();}catch(e){data=null;}}
  SENDING=false;cancel.disabled=false;
  if(res&&res.status===201){SENT=true;SHOWN=null;
    const ref=data&&typeof data.response_id==="string"?data.response_id.slice(0,8):"";
    forget();
    title.textContent=t.sentTitle;help.textContent=t.sent(ref);body.textContent="";body.hidden=true;
    send.hidden=true;cancel.textContent=t.close;say("");cancel.focus();sync();return;}
  send.disabled=false;sync();
  if(!res) return say(t.unreachable,true);
  const code=data&&data.error&&typeof data.error.code==="string"?data.error.code:"";
  say(t.refused(res.status,code),true);}

btn.addEventListener("click",e=>{if(!e||e.isTrusted!==true||!forHost()) return;show();});
send.addEventListener("click",e=>{if(!e||e.isTrusted!==true) return;post();});
cancel.addEventListener("click",()=>hide());
veil.addEventListener("click",e=>{if(e.target===veil) hide();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&veil.hasAttribute("open")) hide();});

/* the bar is drawn again on every screen; the button follows it */
const drawBar=renderBar;
renderBar=function(){const r=drawBar.apply(this,arguments);try{sync();}catch(e){}return r;};
sync();

/* what a host's script may call: name the recipe its booklets are sent with */
Object.defineProperty(window,"BookletSubmit",{value:Object.freeze({version:SUBMIT_VERSION,endpoint:ENDPOINT,
  recipe(r){if(typeof r==="string"&&r.trim()!==""){RECIPE=r;return true;}
    if(r&&typeof r==="object"&&!Array.isArray(r)){try{RECIPE=JSON.parse(JSON.stringify(r));return true;}catch(e){return false;}}
    return false;}}),writable:false,configurable:false,enumerable:true});
})();
