// A stand-in for the browser that draws diagrams, for the tests that check what the compiler does with a drawing (not the drawing).
// It is not a test (the runners take *.test.js and *-browser.js). compile(inputs, {drawer: stub.drawer}) hands each code it has not
// seen to drawer(codes), which answers a Map of each code to {svg} or {why}; this answers a small made-up SVG shaped the way
// the diagram library's output is, with what the compiler must deal with in it: the library's id, a style with a rule for a
// class the drawing lacks, an animation and a :root rule, a marker that is pointed at, node ids nothing points at, and a width
// given in a style attribute. The Nth diagram of a call is "Stand-in N"; one whose source has an accTitle line carries that title the
// way the library writes it (a <title> the root points at); one whose source says "stand-in cannot draw" is one it cannot draw.
const svg=(n,code)=>{const t=/accTitle:\s*(.+)/.exec(code),title=t?t[1].trim():"";
  return svg0(n).replace('role="graphics-document document"',(title?'aria-labelledby="chart-title-bkdgrender" ':'')+'role="graphics-document document"')
    .replace("<style>",(title?'<title id="chart-title-bkdgrender">'+title.replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</title>":"")+"<style>");};
const svg0=n=>'<svg id="bkdgrender" width="100%" xmlns="http://www.w3.org/2000/svg" class="flowchart" style="max-width: 220px;" viewBox="0 0 220 64" '
  +'role="graphics-document document" aria-roledescription="flowchart-v2"><style>#bkdgrender{font-family:sans-serif;font-size:16px;fill:#24323A;}'
  +'@keyframes dash{to{stroke-dashoffset:0;}}#bkdgrender .edge-animation-slow{animation:dash 50s linear infinite;}'
  +'#bkdgrender .node rect{fill:#EFEBE3;stroke:#1E5E6B;stroke-width:1px;}#bkdgrender .unused{fill:red;}#bkdgrender :root{--mermaid-font-family:sans-serif;}</style>'
  +'<g><marker id="bkdgrender_flowchart-v2-pointEnd" viewBox="0 0 10 10" refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto">'
  +'<path d="M 0 0 L 10 5 L 0 10 z" class="arrowMarkerPath"/></marker>'
  +'<g class="node" id="flowchart-A-0"><rect x="10" y="10" width="90" height="44"/><text x="55" y="38" text-anchor="middle">Stand-in '+n+'</text></g>'
  +'<path d="M100,32L160,32" class="flowchart-link" marker-end="url(#bkdgrender_flowchart-v2-pointEnd)"/></g></svg>';
const drawer=codes=>new Map(codes.map((c,i)=>[c,/stand-in cannot draw/.test(c)?{why:"the diagram library could not draw it"}:{svg:svg(i+1,c)}]));
module.exports={drawer,svg};
