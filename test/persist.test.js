// Renderer 0.11.3: the page asks the browser to keep this site's storage, once, after the first save of a session (never at
// page load), and "Your booklets" says so quietly when the browser may clear what is kept. A stub stands in for
// navigator.storage: granted, refused, already persistent, and missing. persist() is a call to the browser about its own
// storage, not a request: nothing is sent anywhere.
// Run: node test/persist.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LINE="This browser may clear booklets kept here. Download a copy of any you want to keep, or add this page to your home screen.";
const FILE=`---\nbooklet: "0.11"\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n`;
const setNav=v=>Object.defineProperty(globalThis,"navigator",{value:v,configurable:true,writable:true});
const stub=(persisted,grant)=>{const s={asked:0,checked:0,state:persisted,
  persisted(){s.checked++;return Promise.resolve(s.state);},
  persist(){s.asked++;s.state=grant;return Promise.resolve(grant);}};return s;};
const lib=A=>{A.screen="@booklets";A.render();return P.texts(P.main());};
const orig=Object.getOwnPropertyDescriptor(globalThis,"navigator");
(async()=>{
 // granted
 {P.wipe();const st=stub(false,true);setNav({storage:st});const A=P.boot();
  await sleep(20);
  chk("nothing is asked at page load",st.asked===0);
  A.loadText(FILE);await sleep(20);
  chk("the first save asks the browser to keep the storage, once",st.asked===1,st.asked);
  A.saveLocal();A.saveLocal();await sleep(20);
  chk("later saves do not ask again",st.asked===1);
  A.closeBooklet();const t=lib(A);await sleep(20);
  chk("once the browser says yes, \"Your booklets\" shows no line",!t.includes(LINE)&&!lib(A).includes(LINE),lib(A));}
 // refused
 {P.wipe();const st=stub(false,false);setNav({storage:st});const A=P.boot();
  chk("with no booklet kept there is no line",!lib(A).includes(LINE));
  A.loadText(FILE);await sleep(20);A.closeBooklet();
  lib(A);await sleep(20);
  chk("a refusal changes nothing, and the quiet line shows beside the kept booklet",st.asked===1&&lib(A).includes(LINE),lib(A));}
 // already persistent
 {P.wipe();const st=stub(true,true);setNav({storage:st});const A=P.boot();
  A.loadText(FILE);await sleep(20);A.closeBooklet();lib(A);await sleep(20);
  chk("an already persistent store is not asked, and shows no line",st.asked===0&&!lib(A).includes(LINE));}
 // missing
 {P.wipe();setNav({});const A=P.boot();
  A.loadText(FILE);await sleep(20);A.closeBooklet();
  chk("a browser without the call: nothing breaks, and the line shows",lib(A).includes(LINE));
  P.wipe();setNav(undefined);const B=P.boot();B.loadText(FILE);B.closeBooklet();
  chk("no navigator at all is the same",lib(B).includes(LINE));}
 // a throwing browser
 {P.wipe();setNav({storage:{persisted(){throw new Error("no");},persist(){throw new Error("no");}}});const A=P.boot();
  let ok=true;try{A.loadText(FILE);A.closeBooklet();lib(A);}catch(e){ok=false;}
  chk("a browser that throws changes nothing",ok);}
 // strings
 {const A=P.boot();
  for(const l of ["en","fr","es","es-AR"]) chk(l+" has the line",typeof A.STRINGS[l].library.mayClear==="string"&&A.STRINGS[l].library.mayClear.length>30);
  chk("fr and es differ from en",A.STRINGS.fr.library.mayClear!==A.STRINGS.en.library.mayClear&&A.STRINGS.es.library.mayClear!==A.STRINGS.en.library.mayClear);}
 if(orig) Object.defineProperty(globalThis,"navigator",orig);
 P.closePages();
 console.log(fails?"\n"+fails+" FAILURES":"\npersist checks passed");process.exit(fails?1:0);
})();
