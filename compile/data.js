"use strict";
/* compile/data.js: the data files a booklet's fences name, read at build time (format 0.19; SPEC.md section 7).

   A fence `booklet data <file.json> [key.path]` takes its rows from a JSON file beside the booklet. The renderer reads that
   file when the page is open; the compiler reads it once, here, when it builds. It does so by writing the file's rows into
   the fence, so the booklet the renderer's own parse reads is exactly the booklet a person would have written with the rows
   in the fence: the parse, the views and the nesting stay the renderer's, and nothing here reads a row.

   The file is read by the rules the renderer reads images by: a name of letters, digits, _ . / and - (at most 200
   characters, no part empty or starting with a dot, ending .json), a real path that stays inside the booklet's own folder, a
   plain file of at most the renderer's LINK_BYTES. What is found at the key path (keys joined with dots, each the name of an
   object's own key) is a list of rows, or an object with `rows` and, optionally, `fields`. A fence that also holds `fields`
   (and only that) gives the labels, which win over the file's. A file that cannot be read gives the block no rows, and the
   page says why where the block is drawn (the quiet box); the build goes on.

   Only the booklet's own design text is read: the caller hands the lines outside the records region. A line number the
   renderer reports after a rewritten fence counts the rows as one line, three lines for the fence in place of two. */
const fs=require("fs"),path=require("path");

const NAME_MAX=200;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

/* a name beside the booklet: the relative path, or null when the rule refuses it */
function fileName(raw){
  const p=String(raw==null?"":raw);
  if(!p||p.length>NAME_MAX||p.charAt(0)==="/"||!/^[A-Za-z0-9_.\/-]+$/.test(p)||!p.endsWith(".json")) return null;
  if(p.split("/").some(x=>x===""||x.charAt(0)===".")) return null;
  return p;}

/* the value at a path of keys: {ok, value} or {ok:false, why} */
function at(root,keyPath){
  let v=root;
  for(const k of keyPath){
    if(!v||typeof v!=="object"||Array.isArray(v)||!own(v,k)) return {ok:false,why:"nothing at “"+keyPath.join(".")+"” in it"};
    v=v[k];}
  return {ok:true,value:v};}

/* the fence's own body: {} when blank, {fields} when it holds only `fields`, else null */
function fenceFields(body){
  const t=body.trim();if(!t) return {};
  let o;try{o=JSON.parse(t);}catch(e){return null;}
  if(!o||typeof o!=="object"||Array.isArray(o)) return null;
  const ks=Object.keys(o);
  return ks.length===1&&ks[0]==="fields"&&o.fields&&typeof o.fields==="object"&&!Array.isArray(o.fields)?{fields:o.fields}:null;}

/* One file, read once for the whole booklet (cached by name): {ok, json} or {ok:false, why}. */
function reader(dir,maxBytes){
  let root=null;try{root=fs.realpathSync(dir);}catch(e){root=null;}
  const cache=new Map();
  return rel=>{
    if(cache.has(rel)) return cache.get(rel);
    const got=(()=>{
      if(!root) return {ok:false,why:"the booklet's folder could not be read"};
      let real;try{real=fs.realpathSync(path.join(root,rel));}catch(e){return {ok:false,why:"no such file beside the booklet"};}
      if(!real.startsWith(root+path.sep)) return {ok:false,why:"the path leads outside the booklet's folder"};
      let size;try{const s=fs.statSync(real);if(!s.isFile()) return {ok:false,why:"not a file"};size=s.size;}catch(e){return {ok:false,why:"no such file"};}
      if(size>maxBytes) return {ok:false,why:"larger than "+maxBytes+" bytes"};
      try{return {ok:true,json:JSON.parse(fs.readFileSync(real,"utf8").replace(/^﻿/,""))};}catch(e){return {ok:false,why:"not JSON"};}})();
    cache.set(rel,got);
    return got;};}

/* inline(R, lines, dir): the design's lines with each file-backed data fence written out, and what happened to each.
   Returns {lines, files: [{src, key, id, ok, why?, rows?}]}. `R` is the renderer's own names (codeFences, LINK_BYTES). */
function inline(R,lines,dir){
  const fences=Array.from(R.codeFences(lines)).filter(F=>{
    const w=F.info.split(/\s+/);return /^booklet$/i.test(w[0])&&/^data$/i.test(w[1]||"")&&w[2]&&F.end<lines.length;});
  if(!fences.length) return {lines,files:[]};
  const read=reader(dir,R.LINK_BYTES),out=[],files=[];
  let from=0;
  for(const F of fences){
    const w=F.info.split(/\s+/),src=w[2],key=w[3]||"";
    const body=lines.slice(F.start+1,F.end).join("\n");
    const rec={src,key,id:F.id||null,ok:false};
    let data=null;
    const fail=why=>{rec.why=why;};
    const rel=fileName(src);
    if(!rel) fail("the name is not one the renderer reads: letters, digits, _ . / and -, at most "+NAME_MAX+" characters, no part starting with a dot, ending .json");
    else{
      const f=read(rel),keys=key?key.split("."):[];
      if(!f.ok) fail(f.why);
      else if(keys.some(k=>k==="")) fail("the key path “"+key+"” has an empty key");
      else{
        const hit=at(f.json,keys),v=hit.value;
        if(!hit.ok) fail(hit.why);
        else if(Array.isArray(v)) data={rows:v};
        else if(v&&typeof v==="object"&&Array.isArray(v.rows)) data={...(v.fields&&typeof v.fields==="object"&&!Array.isArray(v.fields)?{fields:v.fields}:{}),rows:v.rows};
        else fail("what it finds is neither a list of rows nor an object with rows");
        if(data){
          const fm=fenceFields(body);
          if(fm===null){data=null;fail("the fence holds more than `fields`");}
          else if(fm.fields) data.fields={...(data.fields||{}),...fm.fields};}}}
    if(data){rec.ok=true;rec.rows=data.rows.length;}
    out.push(...lines.slice(from,F.start),F.mark+" booklet data",JSON.stringify(data||{rows:[]}),F.mark);
    from=F.end+1;
    files.push(rec);}
  out.push(...lines.slice(from));
  return {lines:out,files};}

module.exports={inline,fileName,NAME_MAX};
