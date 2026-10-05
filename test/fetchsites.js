// Helper for test/guard.test.js (not a test): parses the renderer's main script with Node's bundled acorn and prints, as
// JSON, every `fetch(` call with its arguments' shape. Node keeps acorn internal, so guard.test.js runs this file with
// `node --expose-internals`. Prints {"unavailable":true} when this Node has no bundled acorn.
const fs=require("fs"),path=require("path");
let acorn,walk;
try{acorn=require("internal/deps/acorn/acorn/dist/acorn");walk=require("internal/deps/acorn/acorn-walk/dist/walk");}
catch(e){console.log(JSON.stringify({unavailable:true}));process.exit(0);}
const html=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8");
const scripts=[];
for(const m of html.matchAll(/<script(?![^>]*type="text\/plain")[^>]*>([\s\S]*?)<\/script>/g)) scripts.push({src:m[1],line:html.slice(0,m.index).split("\n").length});
const sites=[],callees=new Set();
for(const s of scripts){
  const ast=acorn.parse(s.src,{ecmaVersion:"latest",locations:true,sourceType:"script",allowReturnOutsideFunction:true});
  walk.full(ast,n=>{
    if(n.type!=="CallExpression"&&n.type!=="NewExpression") return;
    const c=n.callee,name=c.type==="Identifier"?c.name:c.type==="MemberExpression"&&!c.computed?c.property.name:null;
    const viaWindow=c.type==="MemberExpression"&&c.property&&c.property.name==="fetch";
    if(name!=="fetch"&&!viaWindow) return;
    callees.add(s.line+":"+(c.type==="Identifier"?c.start:c.property.start));
    const opts=n.arguments[1],keys=!opts?[]:opts.type==="ObjectExpression"?opts.properties.map(p=>p.type==="Property"&&!p.computed?(p.key.name||String(p.key.value)):"<computed/spread>"):["<not an object literal>"];
    sites.push({line:s.line+n.loc.start.line-1,args:n.arguments.length,optionKeys:keys,
      first:s.src.slice(n.arguments[0].start,n.arguments[0].end),text:s.src.slice(n.start,n.end).split("\n")[0].slice(0,120)});});
  /* any other mention of the identifier fetch as a value (aliasing it, passing it on) would hide a call from the check above */
  walk.full(ast,n=>{if(n.type==="Identifier"&&n.name==="fetch"&&!callees.has(s.line+":"+n.start)) sites.push({alias:true,line:s.line+n.loc.start.line-1});});
}
console.log(JSON.stringify({sites}));
