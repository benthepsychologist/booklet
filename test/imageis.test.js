// The byte check for an image from the host's store (imageIs, in booklet.html): what it accepts, and that it cannot be made
// to take long. Anyone who can put a file in the store can hand the reader's browser an SVG; a check that backtracks on a
// file of many comments froze the tab (measured on the first version in Chromium: 24 comments 184 ms, 28 comments 3 s). So
// this feeds it comments and DOCTYPEs by the thousand, in the shapes that fail, and requires each answer in well under 50 ms.
// The function is read out of booklet.html (as test/md.js reads the Markdown engine), so this runs the code that ships.
// Run: node test/imageis.test.js [booklet.html]      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const html=fs.readFileSync(path.resolve(process.argv[2]||path.join(__dirname,"..","booklet.html")),"utf8");
const a=html.indexOf("/* whether the bytes are the kind of file the extension says"),b=html.indexOf("/* the words for a record kept in IMG_SEEN */");
if(a<0||b<a){console.log("  FAIL  imageIs is not where this test expects it");process.exit(1);}
const imageIs=new Function("TextDecoder",html.slice(a,b)+"\nreturn imageIs;")(TextDecoder);
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const bytes=s=>new TextEncoder().encode(s);
const svg=s=>imageIs("svg",bytes(s));
// what it accepts
chk("a bare svg",svg('<svg xmlns="http://www.w3.org/2000/svg"/>'));
chk("an xml line, then svg",svg('<?xml version="1.0"?>\n<svg width="1"/>'));
chk("a BOM and blank space first",svg('﻿ \n<svg>'));
chk("comments between the xml line and svg",svg('<?xml version="1.0"?><!-- a --> <!-- b -->\n<svg>'));
chk("a DOCTYPE line",svg('<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg>'));
chk("a DOCTYPE with an internal subset",svg('<!DOCTYPE svg [ <!ENTITY a "b"> ]>\n<svg>'));
chk("a hundred comments, then svg",svg('<!-- c -->'.repeat(100)+'<svg>'));
// what it refuses
chk("html",!svg('<html><svg></svg></html>'));
chk("text that merely mentions svg",!svg('hello <svg>'));
chk("<svgfoo is not <svg",!svg('<svgfoo>'));
chk("an unclosed comment",!svg('<!-- <svg>'));
chk("an unclosed xml line",!svg('<?xml version="1.0" <svg>'));
chk("an empty file",!svg(''));
chk("a PNG signature is not an svg",!imageIs("svg",Uint8Array.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A])));
chk("the PNG, JPEG, GIF and WebP signatures",imageIs("png",Uint8Array.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0]))&&imageIs("jpg",Uint8Array.from([0xFF,0xD8,0xFF,0xE0]))&&imageIs("gif",bytes("GIF89a"))&&imageIs("webp",bytes("RIFF\0\0\0\0WEBP")));
chk("a wrong signature is refused",!imageIs("png",bytes("GIF89a"))&&!imageIs("jpeg",bytes("<svg>"))&&!imageIs("gif",bytes("GIF90a"))&&!imageIs("webp",bytes("RIFF\0\0\0\0WEBX")));
// how long it takes, in the shapes that do not end in an svg
const time=(label,input)=>{const t0=process.hrtime.bigint(),r=svg(input),ms=Number(process.hrtime.bigint()-t0)/1e6;
  console.log("  info  "+label+": "+ms.toFixed(2)+" ms");chk(label+" is refused, and in well under 50 ms",r===false&&ms<50,r+" "+ms.toFixed(1)+" ms");return ms;};
const timings=[];
for(const n of [24,28,40,2000]) timings.push(time(n+" empty comments, then x",'<!---->'.repeat(n)+'x'));
timings.push(time("2000 comments of text, then x",'<!-- c -->'.repeat(2000)+'x'));
timings.push(time("2000 DOCTYPEs, then x",'<!DOCTYPE a>'.repeat(2000)+'x'));
timings.push(time("2000 DOCTYPEs with a subset, then x",'<!DOCTYPE a [ ]>'.repeat(2000)+'x'));
timings.push(time("2000 unclosed DOCTYPE starts",'<!DOCTYPE a ['.repeat(2000)));
timings.push(time("a megabyte of blank space, then x (it reads only the first 8 KB, and refuses)",' '.repeat(1<<20)+'x'));
timings.push(time("2000 comments each holding --",'<!-- -- -->'.repeat(2000)+'x'));
console.log("  info  slowest: "+Math.max(...timings).toFixed(2)+" ms");
console.log(fails?"\n"+fails+" FAILURES":"\nimage byte checks passed");process.exit(fails?1:0);
