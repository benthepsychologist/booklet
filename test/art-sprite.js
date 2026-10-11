// The renderer's pictures: one hidden SVG sprite, generated from the art/ folder (renderer 0.11.8).
//   node test/art-sprite.js --write booklet.html    rewrite the sprite block between <!-- art:start --> and <!-- art:end -->
//   node test/art-sprite.js --check booklet.html    exit 1 if the block is missing, outside the body markup, or not what art/ makes
// art/icons/<name>.svg are Lucide's files, unmodified (lucide-static 1.48.0): each becomes <symbol id="bi-<name>">.
// art/spots/<name>.svg are Booklet's own spot drawings, each named by a Lucide name that is also in art/icons/: each
// becomes <symbol id="bs-<name>">. A drawing carries no colour value: its shapes take one of six classes (a accent fill, w card
// fill, s sun fill, p ink fill, l accent stroke, lw card stroke; "l s" is a sun stroke, "w l" a card fill with an accent
// outline), and the renderer's CSS gives each class its colour from the theme.
const fs=require("fs"),path=require("path");
const ART=path.join(__dirname,"..","art");
const START="<!-- art:start -->",END="<!-- art:end -->";
const NOTICE=`<!-- Pictures in this sprite.
  Icons: Lucide (lucide-static 1.48.0), https://lucide.dev. ISC License. Copyright (c) 2026 Lucide Icons and Contributors.
  Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted,
  provided that the above copyright notice and this permission notice appear in all copies. THE SOFTWARE IS PROVIDED "AS IS"
  AND THE AUTHOR DISCLAIMS ALL WARRANTIES. Icons derived from the Feather project are MIT licensed, Copyright (c) 2013-present
  Cole Bemis. The full text is in art/LUCIDE-LICENSE.txt and NOTICE.
  Spot drawings (ids bs-): Apache License 2.0, Copyright 2026 Ben Armstrong. -->`;
/* the inside of an svg file, one element per line, with nothing but the elements */
function inner(svg){
  const m=/<svg\b[^>]*>([\s\S]*)<\/svg>/.exec(svg);
  if(!m) throw new Error("not an svg file");
  return m[1].replace(/<!--[\s\S]*?-->/g,"").replace(/>\s+</g,"><").replace(/\s*\n\s*/g," ").replace(/\s*\/>/g,"/>").trim();}
function viewBox(svg){const m=/<svg\b[^>]*\sviewBox="([^"]+)"/.exec(svg);if(!m) throw new Error("no viewBox");return m[1];}
const names=dir=>fs.readdirSync(path.join(ART,dir)).filter(f=>f.endsWith(".svg")).map(f=>f.slice(0,-4)).sort();
function sprite(){
  const out=[START,NOTICE,'<svg class="artsprite" aria-hidden="true" focusable="false">'];
  for(const [dir,pre] of [["icons","bi-"],["spots","bs-"]])
    for(const n of names(dir)){
      const svg=fs.readFileSync(path.join(ART,dir,n+".svg"),"utf8");
      out.push('<symbol id="'+pre+n+'" viewBox="'+viewBox(svg)+'">'+inner(svg)+"</symbol>");}
  out.push("</svg>",END);
  return out.join("\n");}
const BODY="<body>\n";
function block(html){
  const a=html.indexOf(START),b=html.indexOf(END);
  if(a<0||b<a) return null;
  return [a,b+END.length];}
function problems(html){
  const r=block(html);
  if(!r) return ["the sprite block (<!-- art:start --> ... <!-- art:end -->) is missing"];
  const body=html.indexOf("<body>"),main=html.indexOf('id="main"');
  if(r[0]<body||r[1]>main) return ["the sprite is not in the body markup before #main"];
  if(html.slice(r[0],r[1])!==sprite()) return ["the sprite is not what art/ makes: run node test/art-sprite.js --write booklet.html"];
  return [];}
function write(html){
  const r=block(html);
  if(r) return html.slice(0,r[0])+sprite()+html.slice(r[1]);
  const i=html.indexOf(BODY);if(i<0) throw new Error("no <body>");
  return html.slice(0,i+BODY.length)+"\n"+sprite()+"\n"+html.slice(i+BODY.length);}
module.exports={sprite,problems,write,names,START,END,ART};
if(require.main===module){
  const [mode,file]=process.argv.slice(2);
  if(!file||!["--write","--check"].includes(mode)){console.error("usage: node test/art-sprite.js --write|--check booklet.html");process.exit(2);}
  const html=fs.readFileSync(file,"utf8");
  if(mode==="--check"){const p=problems(html);
    if(p.length){console.error(p.join("\n"));process.exit(1);}
    console.log("art sprite is current ("+(sprite().length)+" bytes, "+names("icons").length+" icons, "+names("spots").length+" spots)");}
  else{const next=write(html);if(next!==html) fs.writeFileSync(file,next);console.log("art sprite written ("+sprite().length+" bytes)");}}
