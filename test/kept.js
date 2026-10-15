// What the renderer keeps in a browser, read from inside a page, for the browser tests (*-browser.js). Not a test itself
// (run-browser.sh only runs *-browser.js). From 0.13.1 the renderer keeps everything in IndexedDB (the database
// `booklet`, its object store `kv`), the list of booklets as one record per entry (`booklet.library.v1#<id>`) under a
// head that holds the order; a browser that refuses IndexedDB keeps it all in local storage, as before. kept(page)
// resolves to {key: text} for every `booklet.` key the renderer keeps, wherever it is, with the list joined back into
// `booklet.library.v1` the way the renderer reads it (libJoin in booklet.html). It never creates the database.
// Usage: const {kept}=require('./kept.js'); const k=await kept(page);
async function kept(p){return p.evaluate(async()=>{const out={};
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^booklet\./.test(k)) out[k]=localStorage.getItem(k);}
  const names=indexedDB.databases?(await indexedDB.databases()).map(d=>d.name):[];
  if(!names.includes('booklet')) return out;
  const kv=await new Promise(res=>{const r=indexedDB.open('booklet');r.onerror=()=>res(null);
    r.onsuccess=()=>{const db=r.result;if(!db.objectStoreNames.contains('kv')){db.close();res(null);return;}
      const tx=db.transaction(['kv'],'readonly'),s=tx.objectStore('kv'),ks=s.getAllKeys(),vs=s.getAll();
      tx.oncomplete=()=>{db.close();res(ks.result.map((k,i)=>[k,vs.result[i]]));};tx.onabort=()=>{db.close();res(null);};};});
  if(!kv) return out;
  const L='booklet.library.v1',recs=new Map();let head=null;
  kv.forEach(([k,v])=>{if(k===L) head=v;else if(k.startsWith(L+'#')) recs.set(k.slice(L.length+1),v);else out[k]=v;});
  if(head!==null||recs.size){let h=null;try{h=JSON.parse(head);}catch(e){h=null;}
    if(!h||!Array.isArray(h.order)) h={v:1,order:[]};
    const seen=new Set(),entries=[],take=id=>{if(seen.has(id)||!recs.has(id)) return;seen.add(id);try{entries.push(JSON.parse(recs.get(id)));}catch(e){}};
    h.order.forEach(take);[...recs.keys()].sort().forEach(take);
    const {order,...rest}=h;out[L]=JSON.stringify({...rest,entries});}
  return out;});}
module.exports={kept};
