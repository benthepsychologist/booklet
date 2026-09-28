// Where the parallel packages meet. Each package tested its own region; these
// checks cover the seams between them, found while merging:
//   - the hash router (library) carrying a module page's view (module activities),
//     whose id holds a colon and a slash, through a reload and through Back;
//   - the interface groups declared beside their views (`library`, `moduleView`)
//     resolving through the one language chain (languages): es-AR → es → en;
//   - a booklet's declared languages carried in the meta block as well as the
//     front matter (the follow-up P3 left for the lines it did not own);
//   - the build scripts reading a module's several `activities`, not only `mode`,
//     and an activity's `pages`, not only its `blocks`.
//
// Every boot() evaluates the renderer's one <script> afresh against the same
// in-memory localStorage, so a boot is a page load, as in library.test.js.
// Run: node test/integration.test.js      (node only; nothing to install)
require("./harness.js");            // the DOM and storage stubs; its own instance is unused
const fs=require("fs"),path=require("path");
const R=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(R,"booklet.html"),"utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
const LS=global.__ls;
/* the shared stub drops document.title; this file keeps it, to check the tab's name */
{let t="";Object.defineProperty(global.document,"title",{get(){return t;},set(v){t=String(v);},configurable:true});}
const wipe=()=>{for(const k of Object.keys(LS)) delete LS[k];};
const fixture=n=>fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8");
const modText=n=>fs.readFileSync(path.join(R,"modules",n+".md"),"utf8");

let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};

function boot(){const API={};
  eval(src+`
;Object.defineProperties(API,Object.getOwnPropertyDescriptors({
  get view(){return view},set view(v){view=v}, get lang(){return lang},set lang(v){lang=v},
  get currentId(){return currentId}, get TPL(){return TPL}, get S(){return S},
  LIB_VIEW, T, TSRC, buildTables, libT, MW, langParity, toMarkdown, parseFile,
  createBooklet, addModule, moduleFromText, saveLocal, render, go, followRoute, homeButton,
  moduleView, moduleForView, modesOf, isMulti, routeNow, parseRoute, knownView, tplModules
}));`);
  return API;}

(async()=>{
// ---- the router carries a module page's view -------------------------------
console.log("# the address bar and a module with several activities");
wipe();
global.location={hash:"",href:"file:///tmp/booklet.html"};
global.history={state:null,replaceState(s,t,u){global.location.hash=u;}};
let A=boot();A.render();
const b=await A.createBooklet();
chk("the two-activity fixture installs",A.addModule(A.moduleFromText(fixture("module-two-activities.md"))));
A.saveLocal();
A.render();
// The tab-title check used to sit here (adding end-of-day.md through
// moduleFromText() — version 1 only — and checking the tab combined both
// modules' names). Deleted per Ben's ruling (2026-09-28), not rewritten.
const mod=A.tplModules().find(m=>A.isMulti(m));
const mv=A.moduleView(mod.id);
chk("the fixture's page view carries a colon and a slash",mv==="module:fixture/study-week",mv);
A.go(mv);
const hash=global.location.hash;
chk("opening the module page puts it in the address, encoded",
  hash==="#/b/"+encodeURIComponent(b.id)+"/"+encodeURIComponent(mv),hash);
chk("the view segment has no raw colon or slash in it",!/[:]/.test(hash.split("/").slice(3).join("/"))&&hash.split("/").length===4,hash);
chk("and decodes back to the same view",A.parseRoute(hash).view===mv&&A.parseRoute(hash).id===b.id);
chk("a module page view is a view the router accepts",A.knownView(mv));
{const B2=boot();
 chk("a reload on the module page lands back on it",B2.currentId===b.id&&B2.view===mv,B2.view);}

// Back from an activity to the module page, then to the booklet's home
A.go("sw-quiz");
const actHash=global.location.hash;
chk("an activity inside the module has its own address",actHash==="#/b/"+encodeURIComponent(b.id)+"/sw-quiz",actHash);
{const B3=boot();
 chk("a reload on that activity lands back on it",B3.currentId===b.id&&B3.view==="sw-quiz",B3.view);}
global.location.hash=hash;A.followRoute();
chk("Back to the module page's address shows the module page",A.view===mv,A.view);
global.location.hash="#/b/"+encodeURIComponent(b.id);A.followRoute();
chk("Back again reaches the booklet's home",A.view==="home"&&A.currentId===b.id,A.view);

// a fragment spelled differently is still the same place
global.location.hash="#/b/"+encodeURIComponent(b.id)+"/module:fixture/study-week";A.followRoute();
chk("a hand-typed, unencoded module view opens the module page",A.view===mv,A.view);
{const before=global.location.hash;A.render();
 chk("and is recognised as already in place, not routed again",global.location.hash===before,global.location.hash);}

// a module view for a module this booklet does not hold
global.location.hash="#/b/"+encodeURIComponent(b.id)+"/"+encodeURIComponent("module:nobody/here");A.followRoute();
chk("a module view the booklet lacks falls back to its home",A.view==="home",A.view);
chk("an unknown module view is not a known view",!A.knownView("module:nobody/here"));
// a malformed escape is not a route at all
chk("a malformed escape does not throw and names no booklet",A.parseRoute("#/b/%E0%A4%A/x").id===null);
delete global.location;delete global.history;

// ---- the late string groups ride the language chain -------------------------
console.log("# interface groups declared beside their views");
wipe();A=boot();
for(const g of ["library","moduleView","pages"]){
  chk(g+": English and French are both written",!!A.TSRC.en[g]&&!!A.TSRC.fr[g]);
  chk(g+": French has every key English has",Object.keys(A.TSRC.en[g]).every(k=>k in A.TSRC.fr[g]));
  chk(g+": es and es-AR tables have the group",!!A.T.es[g]&&!!A.T["es-AR"][g]);
  chk(g+": Spanish is written, and es-AR reads it through es",
    (()=>{const k=Object.keys(A.TSRC.en[g]).find(k=>typeof A.TSRC.en[g][k]==="string");
      return A.TSRC.es[g][k]!==A.TSRC.en[g][k]&&A.T["es-AR"][g][k]===(A.TSRC["es-AR"][g]&&A.TSRC["es-AR"][g][k]||A.TSRC.es[g][k]);})());
  chk(g+": Spanish has every key English has (nothing counted as missing in es)",Object.keys(A.TSRC.en[g]).every(k=>k in A.TSRC.es[g])&&!A.langParity("es").missing.some(p=>p.startsWith(g+".")));
  chk(g+": and not in fr",!A.langParity("fr").missing.some(p=>p.startsWith(g+".")));}
// a Spanish string added the documented way (TSRC.es, then a rebuild) reaches es-AR through es
A.TSRC.es.library={title:"__es_title__"};A.TSRC.es.moduleView={noneShown:"__es_none__"};A.buildTables();
A.lang="es-AR";
chk("library: an es string reaches es-AR through es",A.libT().title==="__es_title__",A.libT().title);
chk("library: a key es lacks still reads the English",A.libT().open===A.TSRC.en.library.open);
chk("moduleView: an es string reaches es-AR through es",A.MW().noneShown==="__es_none__");
chk("moduleView: a function string es lacks still works",typeof A.MW().activitiesN==="function"&&A.MW().activitiesN(2)===A.TSRC.en.moduleView.activitiesN(2));
A.lang="fr";
chk("French reads its own words",A.libT().title==="Vos carnets"&&/activités/.test(A.MW().activitiesN(2)));

// Three sections used to sit here: a version 1 booklet's own `languages:`
// array riding in the saved record (TPL.languages, retired with the rest of
// version 1's multi-language content machinery — SPEC.md §9), and two
// build-script sections exercising build-example.js against synthetic version
// 1 JSON module fixtures. build-example.js and build-booklet.js are removed
// (Ben, 2026-09-28: "get rid of everything for the old format. no refs no
// legacy. delete") — their whole job was combining version 1 JSON modules,
// and the real registry has none left. build-registry.js's own current
// behavior is exercised directly against modules/ elsewhere (test/lint.test.js,
// test/run.sh's `registry` check), not through these retired tools.

console.log(fails?"\n"+fails+" FAILURES":"\nintegration checks passed");
process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
