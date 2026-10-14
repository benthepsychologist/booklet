// The renderer's parts, for the browser tests' fake hosts. Not a test (the runners take *.test.js and *-browser.js).
// The renderer is a core and its parts (0.13.1, item 11): a part the page does not hold is the file parts/NAME.js beside it, and
// the page asks for it at <the page's own address>parts/NAME.js. A browser test that serves the renderer from a fake origin
// serves the parts with it, through serve(), exactly as a host that publishes `parts/` beside the renderer does. A renderer given
// to a test with no parts/ beside it (the one-file build, which holds every part) has none to serve, and asks for none.
const fs=require('fs'),path=require('path');
/* the file for a part, beside the renderer under test */
const file=(HTML,name)=>path.join(path.dirname(HTML),'parts',name+'.js');
/* does the renderer under test have this part beside it (false for the one-file build) */
const has=(HTML,name)=>fs.existsSync(file(HTML,name));
/* the part's name when `pathname` is a part address under `base` (the page's own folder, e.g. '/app/'), else null */
const nameAt=(pathname,base)=>{const pre=base+'parts/';
  if(!pathname.startsWith(pre)) return null;
  const n=pathname.slice(pre.length);return /^[a-z][a-z0-9-]*\.js$/.test(n)?n.slice(0,-3):null;};
/* a Playwright fulfill() argument for a part address, or null when it is not one (or the part is not beside the renderer) */
const serve=(HTML,pathname,base)=>{const n=nameAt(pathname,base);
  if(!n||!has(HTML,n)) return null;
  return {status:200,body:fs.readFileSync(file(HTML,n)),headers:{'content-type':'text/javascript; charset=utf-8'}};};
module.exports={file,has,nameAt,serve};
