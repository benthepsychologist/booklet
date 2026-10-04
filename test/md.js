/* mdNodes(text, opts) as the renderer ships it, for test/md.test.js and
   test/reading.test.js, which run it without a page around it.

   There is no copy of the Markdown engine here: the text between the
   `mdNodes(text, opts)` comment and `/* /MDNODES *\/` in booklet.html is read
   from the file and evaluated, so these tests always exercise the code that
   ships. That slice builds every element through the page's own `el(tag,
   attrs, ...kids)`, which the test defines as a global, and heading ids
   through the page's `slugify`, which is supplied below. */
const fs=require("fs");
const html=fs.readFileSync(__dirname+"/../booklet.html","utf8");
const a=html.indexOf("/* mdNodes(text, opts)"),b=html.indexOf("/* /MDNODES */");
if(a<0||b<a) throw new Error("test/md.js: the mdNodes markers are not in booklet.html");
const slugify=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
module.exports=new Function("el","slugify",html.slice(a,b)+"\nreturn {mdNodes};")(global.el,slugify);
