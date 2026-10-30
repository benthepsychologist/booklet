// Format 0.17: an activity line takes no `parent:` (SPEC.md section 3, "An activity does not sit under another"), so the renderer reads no
// wiki from a file. The wiki engine (the tree, the frame with its menu and search, Mentioned on, the cards of a page's children) is still
// in the renderer, and the browser tests that hold it to what it does still need a module whose activities have parents. This gives them
// one: after a booklet is loaded, WIKI_STAMP is run in the page with the booklet's text. It sets on each activity the parent address the
// file's `parent:` words name, orders the module's activities depth first with each one's effective parent as the 0.16 loader did
// (moduleOut), makes a new list so that nothing the engine kept for the old list is used, and draws again. A test that wants what a file
// now does (the words reported and ignored) does not call it.
// Use: await page.evaluate(WIKI_STAMP, text)
exports.WIKI_STAMP=function(text){
  let mod=null;const want=new Map();
  for(const line of String(text).split("\n")){
    const m=/^> \[!(module|activity)\|([^\s\]]+)([^\]]*)\]/.exec(line);if(!m) continue;
    if(m[1]==="module"){mod=/\bend\b/.test(m[3])?null:m[2];continue;}
    const p=/\bparent:(\S+)/.exec(m[3]);if(p&&mod) want.set(mod+"/"+m[2],mod+"/"+p[1]);}
  let changed=false;
  allModules().forEach(M=>{
    const acts=M.activities;if(!acts.some(a=>want.has(a.id))) return;
    acts.forEach(a=>{if(want.has(a.id)) a.parent=want.get(a.id);});
    const t=activityTree(acts),was=acts.slice();
    acts.splice(0,acts.length,...t.order.map(i=>was[i]));
    t.order.forEach((i,k)=>{const a=acts[k];if(t.parent[i]) a.parent=t.parent[i];else delete a.parent;});
    M.activities=acts.slice();changed=true;});
  if(changed) render();};
