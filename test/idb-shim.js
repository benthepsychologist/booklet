// A small IndexedDB, in memory, for the Node tests of the renderer's store (keep.test.js). Not a test itself (the
// runner only runs *.test.js). It does what booklet.html asks of IndexedDB and no more: open a database (with an
// upgrade the first time), two object stores, readwrite and readonly transactions run one after another in the order
// they were made, get, put, delete, getAll, getAllKeys, commit(), and all-or-nothing commits.
//
// What a test can ask of it (ctl):
//   ctl.refuse = "SecurityError"   every open fails with that error (a browser that refuses IndexedDB)
//   ctl.throwOpen = "SecurityError" indexedDB.open throws
//   ctl.hangOpen = true            an open never answers (Safari's first-open hang)
//   ctl.hangRead = true            a readonly transaction never ends (a store that does not answer its first read)
//   ctl.quota = <characters>       a readwrite transaction that would leave more than this many characters in the
//                                  database aborts with QuotaExceededError (the browser's own limit)
//   ctl.failNext = "UnknownError"  the next readwrite transaction aborts with that error
//   ctl.failAll = "UnknownError"   every readwrite transaction aborts with that error, until it is set back to null
//   ctl.hold = true                readwrite transactions wait (nothing commits) until ctl.release() is called
//   ctl.kill()                     every page open now is gone: the transactions it already made still commit (that is
//                                  the browser's side), but no callback reaches it any more and it can make no new one.
//                                  A page opened after it is alive.
// and what it can read: dbs (name -> {version, stores: name -> Map(key -> value)}), log (every transaction and put,
// in order), chars() (the characters held now).
"use strict";
function makeIDB(){
  const dbs=new Map(),log=[],held=[];
  const err=name=>Object.assign(new Error(name),{name});
  const later=f=>setTimeout(f,0);
  const conns=[];
  const ctl={refuse:null,throwOpen:null,hangOpen:false,hangRead:false,quota:null,failNext:null,failAll:null,hold:false,
    release(){ctl.hold=false;held.splice(0).forEach(f=>f());},
    kill(){conns.forEach(c=>{c.dead=true;});}};
  const chars=d=>{let n=0;(d?[d]:[...dbs.values()]).forEach(x=>x.stores.forEach(m=>m.forEach(v=>{n+=typeof v==="string"?v.length:JSON.stringify(v).length;})));return n;};
  function open(name,version){
    if(ctl.throwOpen) throw err(ctl.throwOpen);
    const req={result:null,error:null,onsuccess:null,onerror:null,onupgradeneeded:null,onblocked:null};
    later(()=>{
      if(ctl.hangOpen) return;
      if(ctl.refuse){req.error=err(ctl.refuse);if(req.onerror) req.onerror({preventDefault(){}});return;}
      let d=dbs.get(name);if(!d){d={version:0,stores:new Map(),queue:[],running:false};dbs.set(name,d);}
      const conn=connection(d);req.result=conn;
      if((version||1)>d.version){conn._up=true;if(req.onupgradeneeded) req.onupgradeneeded({});conn._up=false;d.version=version||1;}
      if(req.onsuccess) req.onsuccess({});});
    return req;}
  function connection(d){const conn={closed:false,dead:false,onversionchange:null,_up:false,
    objectStoreNames:{contains:n=>d.stores.has(n)},
    createObjectStore(n){if(!conn._up) throw err("InvalidStateError");d.stores.set(n,new Map());return {};},
    close(){conn.closed=true;},
    transaction(names,mode,opts){if(conn.closed||conn.dead) throw err("InvalidStateError");names=[].concat(names);
      names.forEach(n=>{if(!d.stores.has(n)) throw err("NotFoundError");});
      const tx=makeTx(d,names,mode||"readonly",opts);tx._conn=conn;d.queue.push(tx);log.push({tx:mode||"readonly",names,durability:opts&&opts.durability||""});
      later(()=>pump(d));return tx;}};
    conns.push(conn);return conn;}
  function makeTx(d,names,mode,opts){
    const tx={mode,error:null,oncomplete:null,onabort:null,onerror:null,_reqs:[],_ended:false,
      objectStore(n){if(!names.includes(n)) throw err("NotFoundError");if(tx._ended) throw err("TransactionInactiveError");return store(tx,n);},
      commit(){},abort(){tx._abort=err("AbortError");}};
    return tx;}
  function store(tx,n){const q=(op,k,v)=>{if(tx._ended) throw err("TransactionInactiveError");const r={result:undefined,error:null,onsuccess:null,onerror:null,op,n,k,v};tx._reqs.push(r);return r;};
    return {get:k=>q("get",k),put:(v,k)=>{if(tx.mode!=="readwrite") throw err("ReadOnlyError");return q("put",k,v);},
      delete:k=>{if(tx.mode!=="readwrite") throw err("ReadOnlyError");return q("delete",k);},
      getAll:()=>q("getAll"),getAllKeys:()=>q("getAllKeys"),clear:()=>q("clear")};}
  function pump(d){if(d.running||!d.queue.length) return;d.running=true;const tx=d.queue[0];
    const go=()=>run(d,tx);if(ctl.hold&&tx.mode==="readwrite") held.push(go);else if(ctl.hangRead&&tx.mode==="readonly") return;else go();}
  function run(d,tx){
    const stage=new Map();tx._st=n=>{if(tx.mode!=="readwrite") return d.stores.get(n);if(!stage.has(n)) stage.set(n,new Map(d.stores.get(n)));return stage.get(n);};
    while(tx._reqs.length){const r=tx._reqs.shift(),m=tx._st(r.n),keys=()=>[...m.keys()].sort();
      if(r.op==="get") r.result=m.get(r.k);
      else if(r.op==="put"){m.set(r.k,r.v);log.push({put:r.k,store:r.n,size:typeof r.v==="string"?r.v.length:0});}
      else if(r.op==="delete"){m.delete(r.k);log.push({del:r.k,store:r.n});}
      else if(r.op==="getAll") r.result=keys().map(k=>m.get(k));
      else if(r.op==="getAllKeys") r.result=keys();
      else if(r.op==="clear") m.clear();
      if(r.onsuccess&&!tx._conn.dead) r.onsuccess({});}
    tx._ended=true;
    let fail=tx._abort||null;
    if(!fail&&tx.mode==="readwrite"){
      if(ctl.failAll) fail=err(ctl.failAll);
      else if(ctl.failNext){fail=err(ctl.failNext);ctl.failNext=null;}
      else if(ctl.quota!=null){let n=0;d.stores.forEach((m,name)=>{(stage.get(name)||m).forEach(v=>{n+=typeof v==="string"?v.length:0;});});
        if(n>ctl.quota) fail=err("QuotaExceededError");}}
    if(!fail) stage.forEach((m,name)=>d.stores.set(name,m));
    log.push(fail?{abort:fail.name}:{complete:tx.mode});
    d.queue.shift();d.running=false;
    later(()=>{if(!tx._conn.dead){if(fail){tx.error=fail;if(tx.onabort) tx.onabort({});}else if(tx.oncomplete) tx.oncomplete({});}pump(d);});}
  return {indexedDB:{open},dbs,log,ctl,chars,
    /* the value a key holds in the renderer's store, as the browser would give it */
    kv:k=>{const d=dbs.get("booklet");return d&&d.stores.get("kv")?d.stores.get("kv").get(k):undefined;},
    keys:()=>{const d=dbs.get("booklet");return d&&d.stores.get("kv")?[...d.stores.get("kv").keys()].sort():[];}};}
module.exports={makeIDB};
