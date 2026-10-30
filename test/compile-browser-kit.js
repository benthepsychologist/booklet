// The set-up the compiler's Chromium checks share (compile-browser.js, compile-nested-browser.js, compile-reading-browser.js):
// a Playwright route that answers http://localhost/** from a folder on disk, a probe for anything a page stored, and the
// contrast of two computed colours. This file is a helper, not a check: its name does not end in -browser.js, so
// test/run-browser.sh and CI (which run every test/*-browser.js) do not run it.
const fs=require('fs'),path=require('path');

const BASE='http://localhost/';   /* answered from the disk by server(); localhost is a secure context, so the clipboard is there */

/* server(root) -> {BASE, serve}. serve(ctx, watch) answers BASE** from the folder root (a 404 for anything outside it, or not a file),
   and pushes the address of every request onto the list watch when one is given. */
function server(root){
  function serve(ctx,watch){
    return ctx.route(BASE+'**',route=>{const u=decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\//,''));
      const f=path.join(root,u);
      if(watch) watch.push(route.request().url());
      if(!f.startsWith(root)||!fs.existsSync(f)||!fs.statSync(f).isFile()) return route.fulfill({status:404,body:'not here'});
      const type=f.endsWith('.css')?'text/css':f.endsWith('.js')?'text/javascript':f.endsWith('.woff2')?'font/woff2':'text/html';
      return route.fulfill({status:200,contentType:type,body:fs.readFileSync(f)});});}
  return {BASE,serve};}

/* what a page has stored: local storage, session storage, cookies, IndexedDB databases */
const storage=p=>p.evaluate(async()=>{let dbs=[];try{dbs=indexedDB.databases?await indexedDB.databases():[];}catch(e){}
  return {local:localStorage.length,session:sessionStorage.length,cookie:document.cookie,idb:dbs.length};});

/* the WCAG contrast of two computed colours ("rgb(r, g, b)" or "rgba(…)"); 0 when either cannot be read */
const lum=c=>{const m=/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)/.exec(c);if(!m) return null;
  const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(+m[1])+0.7152*f(+m[2])+0.0722*f(+m[3]);};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);if(x==null||y==null) return 0;return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};

module.exports={BASE,server,storage,lum,ratio};
