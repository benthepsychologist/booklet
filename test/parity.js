"use strict";
/* Language-table parity, for the tests only: the renderer does not carry it.
   Both functions read the STRINGS_SRC tables test/page.js exposes. */

/* every string (or function, or list) a language table holds, by dotted path */
function leafPaths(o,pre,out){out=out||[];const isO=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
  for(const k of Object.keys(o||{})){const p=pre?pre+"."+k:k;
    if(isO(o[k])) leafPaths(o[k],p,out);else out.push(p);}
  return out;}

/* What is still to be written for a language: the keys English has and this
   language has not (`missing`), and keys it has that English does not (`extra`,
   almost always a typo). es-AR is a layer of differences, so it has no missing. */
function langParity(STRINGS_SRC,l){const en=leafPaths(STRINGS_SRC.en);const have=new Set(leafPaths(STRINGS_SRC[l]||{}));
  const enSet=new Set(en);
  return {lang:l,total:en.length,
    missing:l==="es-AR"?[]:en.filter(p=>!have.has(p)),
    extra:[...have].filter(p=>!enSet.has(p))};}

module.exports={leafPaths,langParity};
