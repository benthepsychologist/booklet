"use strict";
/* compile/diagrams-run.js: draws diagrams in headless Chromium. Started by diagrams.js with spawnSync, never by a person.

   It reads one JSON job on standard input and writes one JSON answer on standard output:
     job    {playwright, part, global, id, codes, faces, config, timeout (ms for one diagram, 60000 when absent)}
     answer {results: [{svg} | {error}] in the order of codes, requests: [the address of every request the page made, none but data:]}
   It draws with the renderer's own mermaid part, handed over as text (diagrams.js has checked it is the file the renderer pins). The
   browser page is made here and holds nothing of the booklet's: an empty document with a policy that allows no script of its
   own, no connection and no image or font but data:, and the context is offline with every request refused. A diagram's source reaches the
   library as an argument, as data, and is never part of any script text. The page is thrown away when the last diagram is drawn.
   Playwright is a package this repository does not carry: its path comes in the job (diagrams.js: findPlaywright). Whatever the
   library says about a diagram that fails is not passed on (the message can quote the source).

   Repeatable: the library draws a class, ER or git-graph picture with random numbers (the hand-drawn curves, a git commit's id). Each
   diagram is drawn with Math.random replaced by a seeded generator (below), started again from the same seed before every diagram, so
   the same source gives the same drawing whatever was drawn before it. What still varies is in the library (a gantt chart's "today"
   marker reads the clock) or in the machine (the browser's version, its fonts). */
const fs=require("fs"),crypto=require("crypto");

/* no script but the part itself (allowed by its digest, as the renderer's own policy allows a stored part), no connection, no image or
   font but data: */
const policy=part=>"default-src 'none'; script-src 'sha256-"+crypto.createHash("sha256").update(part,"utf8").digest("base64")+"'; style-src 'unsafe-inline'; font-src data:; img-src data:";
const HOME="https://diagrams.invalid/";
const SEED=0x5eed;

async function main(){
  const job=JSON.parse(fs.readFileSync(0,"utf8"));
  const {chromium}=require(job.playwright);
  const browser=await chromium.launch({headless:true});
  const answer={results:job.codes.map(()=>({error:"not drawn"})),requests:[]};
  try{
    const ctx=await browser.newContext({offline:true,javaScriptEnabled:true,serviceWorkers:"block",acceptDownloads:false});
    const page=await ctx.newPage();
    page.on("request",r=>{if(r.url()!==HOME&&!/^(data|about|blob):/.test(r.url())) answer.requests.push(r.url());});
    const faces=job.faces.map(f=>"@font-face{font-family:'"+f.family+"';font-style:"+f.style+";font-weight:"+f.weight+";src:url(data:font/woff2;base64,"+f.b64+") format('woff2');unicode-range:"+f.range+"}").join("");
    /* the one page, served from here; every other request is refused */
    await page.route(/.*/,r=>r.request().url()===HOME
      ?r.fulfill({status:200,contentType:"text/html; charset=utf-8",headers:{"content-security-policy":policy(job.part)},
        body:'<!doctype html><html><head><meta charset="utf-8"><style>'+faces+'</style></head><body></body></html>'})
      :r.abort());
    await page.goto(HOME);
    /* the part runs at the page's top level, as a script would: the library defines a global the page's other calls then use */
    await page.addScriptTag({content:job.part});
    const family=job.faces.length?job.faces[0].family:"";
    if(family) await page.evaluate(async f=>{await Promise.all([document.fonts.load('400 16px "'+f+'"',"Ag"),document.fonts.load('700 16px "'+f+'"',"Ag")]);await document.fonts.ready;},family);
    await page.evaluate(({g,config})=>{let lib=globalThis[g].mermaid;lib=lib.default||lib;lib.initialize(config);},{g:job.global,config:job.config});
    for(let i=0;i<job.codes.length;i++){
      let timer=null;
      try{
        const svg=await Promise.race([
          page.evaluate(async ({g,id,code,seed})=>{
            /* mulberry32: a small seeded generator, in place of Math.random for this one diagram */
            let a=seed;Math.random=()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
            let lib=globalThis[g].mermaid;lib=lib.default||lib;const r=await lib.render(id,code);return r.svg;},{g:job.global,id:job.id,code:job.codes[i],seed:SEED}),
          new Promise((_,no)=>{timer=setTimeout(()=>no(new Error("slow")),job.timeout||60000);})]);
        answer.results[i]=typeof svg==="string"?{svg}:{error:"no svg"};
      }catch(e){answer.results[i]={error:"could not draw it"};}
      clearTimeout(timer);
      /* the library leaves its scratch container behind when a diagram fails to parse */
      await page.evaluate(()=>{document.body.innerHTML="";}).catch(()=>{});}
  }finally{
    await browser.close().catch(()=>{});}
  process.stdout.write(JSON.stringify(answer));}

main().catch(e=>{process.stderr.write(String(e&&e.message).slice(0,2000));process.stdout.write(JSON.stringify({results:[],requests:[]}));process.exitCode=1;});
