/* mdNodes(text, opts): turns a chunk of Markdown into an array of DOM nodes,
   for the Booklet renderer. Builds every element through the page's own
   `el(tag,attrs,...kids)` helper (assumed already in scope where this is
   pasted) and never through innerHTML or any HTML string. Security rule:
   the text comes from files strangers hand people, so raw HTML in it is
   never parsed as markup — it is just characters that fall through to a
   plain text node, which is safe by construction because `el` never sets
   innerHTML for content we pass it. Link/image URLs are checked against an
   allow-list of schemes (http, https, mailto for links only, or a
   scheme-less relative path / bare #fragment); anything else — javascript:,
   data:, vbscript:, file:, an obfuscated scheme hidden behind whitespace or
   control characters, mixed case — renders as the plain-text label/alt
   instead of a live link/image. External http(s) links get target="_blank"
   rel="noopener noreferrer". This never throws: any failure falls back to a
   single paragraph of the raw text. */
const CTRL=/[\u0000-\u001f\u007f-\u009f]/g;
const cleanScheme=s=>{const c=String(s==null?"":s).replace(/[\u0000-\u001f\u007f-\u009f\s]/g,"");
  const m=/^([A-Za-z][A-Za-z0-9+.-]*):/.exec(c);return {scheme:m?m[1].toLowerCase():null};};
const urlOk=(raw,allowMailto)=>{const {scheme}=cleanScheme(raw);
  return scheme===null||scheme==="http"||scheme==="https"||(allowMailto&&scheme==="mailto");};
const textOf=x=>Array.isArray(x)?x.map(textOf).join(""):typeof x==="string"?x:(x&&typeof x.textContent==="string"?x.textContent:"");
const slugify=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const mkLink=(label,url,title,ctx)=>{const kids=typeof label==="string"?renderInline(label,ctx):label;
  if(!urlOk(url,true)) return textOf(kids);
  const {scheme}=cleanScheme(url);const attrs={href:String(url).replace(CTRL,""),title};
  if(scheme==="http"||scheme==="https"){attrs.target="_blank";attrs.rel="noopener noreferrer";}
  return el("a",attrs,...kids);};
const mkImg=(alt,src,title)=>{if(!urlOk(src,false)) return alt||"";
  return el("img",{src:String(src).replace(CTRL,""),alt:alt||"",title,loading:"lazy"});};
const resolveRef=(ctx,label)=>ctx.refs[String(label||"").trim().toLowerCase()]||null;

/* INLINE: one alternation, longer/more-specific delimiters (**, embed ![[)
   before the shorter/generic ones that share a leading char (*, [), so the
   specific one wins; opts-backed constructs (embed/wikilink/footnote) come
   before the plain link/emphasis fallback that would otherwise eat the same
   brackets. */
const INLINE_RE=new RegExp(
  "\\\\(?<esc>[\\\\`*_{}\\[\\]()#+.!~=$<>|-])"+
  "|(?<cf>`+)(?<code>[\\s\\S]*?)\\k<cf>"+
  "|\\$\\$(?<mathb>[\\s\\S]+?)\\$\\$"+
  "|\\$(?<mathi>(?:\\\\[\\s\\S]|[^\\s$\\\\])(?:(?:\\\\[\\s\\S]|[^$\\\\])*?(?:\\\\[\\s\\S]|[^\\s$\\\\]))?)\\$(?![0-9])"+
  "|!\\[\\[(?<embed>[^\\]]+)\\]\\]"+
  "|!\\[(?<imgreflabel>[^\\]]*)\\]\\[(?<imgrefid>[^\\]]*)\\]"+
  "|!\\[(?<imgalt>[^\\]]*)\\]\\((?<imgurl><[^>]*>|(?:[^()\\s]|\\([^()\\s]*\\))*)(?:\\s+\"(?<imgtitle>[^\"]*)\"|\\s+'(?<imgtitle2>[^']*)')?\\)"+
  "|\\[\\[(?<wikitarget>[^\\]|]+)(?:\\|(?<wikilabel>[^\\]]+))?\\]\\]"+
  "|\\[\\^(?<footref>[^\\]\\s]+)\\]"+
  "|\\[(?<linklabel>[^\\]]*)\\]\\((?<linkurl><[^>]*>|(?:[^()\\s]|\\([^()\\s]*\\))*)(?:\\s+\"(?<linktitle>[^\"]*)\"|\\s+'(?<linktitle2>[^']*)')?\\)"+
  "|\\[(?<linkreflabel>[^\\]]*)\\]\\[(?<linkrefid>[^\\]]*)\\]"+
  "|\\[(?<shortlabel>[^\\]]+)\\]"+
  "|<(?<autourl>https?:\\/\\/[^\\s<>]+|mailto:[^\\s<>]+)>"+
  "|(?<bareurl>https?:\\/\\/[^\\s<>\\)\\]]+)"+
  "|\\*\\*(?<strongstar>[\\s\\S]+?)\\*\\*"+
  "|(?<![A-Za-z0-9_])__(?<strongunder>[^\\s][\\s\\S]*?[^\\s]|[^\\s])__(?![A-Za-z0-9_])"+
  "|\\*(?<emstar>[^\\s*][\\s\\S]*?)\\*"+
  "|(?<![A-Za-z0-9_])_(?<emunder>[^\\s_][\\s\\S]*?)_(?![A-Za-z0-9_])"+
  "|~~(?<strike>[\\s\\S]+?)~~"+
  "|==(?<mark>[\\s\\S]+?)=="
  ,"g");
function renderInline(src,ctx){
  if(!src) return [];
  // A fresh regex per call: this function recurses (bold containing italic,
  // a link's label), and sharing one stateful `g` RegExp's lastIndex across
  // an outer and inner call would let the inner call's exhaustion reset it
  // to 0 under the outer loop's feet, matching the same span forever.
  const re=new RegExp(INLINE_RE.source,"g");
  const out=[];let last=0;let m;
  while((m=re.exec(src))){
    if(m.index>last) out.push(src.slice(last,m.index));
    const g=m.groups;
    if(g.esc!==undefined) out.push(g.esc);
    else if(g.code!==undefined) out.push(el("code",{},g.code));
    else if(g.mathb!==undefined||g.mathi!==undefined){const disp=g.mathb!==undefined,tex=disp?g.mathb:g.mathi;let n=null;
      if(typeof ctx.opts.math==="function"){try{n=ctx.opts.math(tex,disp);}catch(e){n=null;}}
      out.push(n!=null?n:el(disp?"div":"span",{class:"math"},tex));}
    else if(g.embed!==undefined){const t=g.embed.trim();let n=null;
      if(typeof ctx.opts.embed==="function"){try{n=ctx.opts.embed(t);}catch(e){n=null;}}
      out.push(n!=null?n:("![["+t+"]]"));}
    else if(g.imgreflabel!==undefined){const ref=resolveRef(ctx,g.imgrefid||g.imgreflabel);
      out.push(ref?mkImg(g.imgreflabel,ref.url,ref.title):("![" +g.imgreflabel+"]["+g.imgrefid+"]"));}
    else if(g.imgalt!==undefined){const u=(g.imgurl||"").replace(/^<|>$/g,"");
      out.push(mkImg(g.imgalt,u,g.imgtitle!==undefined?g.imgtitle:g.imgtitle2));}
    else if(g.wikitarget!==undefined){const t=g.wikitarget.trim();const lb=g.wikilabel!==undefined?g.wikilabel.trim():undefined;let n=null;
      if(typeof ctx.opts.link==="function"){try{n=ctx.opts.link(t,lb);}catch(e){n=null;}}
      out.push(n!=null?n:(lb!==undefined?"[["+t+"|"+lb+"]]":"[["+t+"]]"));}
    else if(g.footref!==undefined){const id=g.footref;let n=null;
      if(typeof ctx.opts.mark==="function"){try{n=ctx.opts.mark(id);}catch(e){n=null;}
        out.push(n!=null?n:("[^"+id+"]"));}
      else out.push("[^"+id+"]");}
    else if(g.linklabel!==undefined){const u=(g.linkurl||"").replace(/^<|>$/g,"");
      out.push(mkLink(g.linklabel,u,g.linktitle!==undefined?g.linktitle:g.linktitle2,ctx));}
    else if(g.linkreflabel!==undefined){const key=g.linkrefid||g.linkreflabel;const ref=resolveRef(ctx,key);
      out.push(ref?mkLink(g.linkreflabel,ref.url,ref.title,ctx):("["+g.linkreflabel+"]["+g.linkrefid+"]"));}
    else if(g.shortlabel!==undefined){const ref=resolveRef(ctx,g.shortlabel);
      out.push(ref?mkLink(g.shortlabel,ref.url,ref.title,ctx):m[0]);}
    else if(g.autourl!==undefined) out.push(mkLink([g.autourl],g.autourl,undefined,ctx));
    else if(g.bareurl!==undefined){const raw=g.bareurl;const trimmed=raw.replace(/[.,;:!?]+$/,"");
      if(trimmed.length<raw.length) re.lastIndex=m.index+trimmed.length;
      out.push(mkLink([trimmed],trimmed,undefined,ctx));}
    else if(g.strongstar!==undefined) out.push(el("strong",{},...renderInline(g.strongstar,ctx)));
    else if(g.strongunder!==undefined) out.push(el("strong",{},...renderInline(g.strongunder,ctx)));
    else if(g.emstar!==undefined) out.push(el("em",{},...renderInline(g.emstar,ctx)));
    else if(g.emunder!==undefined) out.push(el("em",{},...renderInline(g.emunder,ctx)));
    else if(g.strike!==undefined) out.push(el("del",{},...renderInline(g.strike,ctx)));
    else if(g.mark!==undefined) out.push(el("mark",{},...renderInline(g.mark,ctx)));
    last=re.lastIndex;
  }
  if(last<src.length) out.push(src.slice(last));
  return out;
}

/* ======================= BLOCK ======================= */
const FENCE_RE=/^ {0,3}(`{3,}|~{3,})(.*)$/;
const ATX_RE=/^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const HR_RE=/^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const SETEXT_RE=/^ {0,3}(=+|-+)[ \t]*$/;
const LIST_RE=/^ {0,3}(?:([-*+])|(\d{1,9})[.)])[ \t]+(.*)$/;
const TASK_RE=/^\[([ xX])\][ \t]+(.*)$/;
const TABLESEP_RE=/^[ \t]*\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const isBlockStart=l=>FENCE_RE.test(l)||ATX_RE.test(l)||/^ {0,3}>/.test(l)||LIST_RE.test(l)||HR_RE.test(l)||SETEXT_RE.test(l);
const heading=(level,raw,ctx)=>{const tag="h"+Math.min(6,level+1);const kids=renderInline(raw,ctx);
  const id=(ctx.idPrefix||"")+slugify(textOf(kids));return el(tag,{id},...kids);};
function splitRow(line){const cells=[];let cur="";
  const s=line.trim().replace(/^\|/,"").replace(/\|$/,"");
  for(let j=0;j<s.length;j++){const c=s[j];
    if(c==="\\"&&s[j+1]==="|"){cur+="|";j++;}
    else if(c==="|"){cells.push(cur);cur="";}
    else cur+=c;}
  cells.push(cur);return cells.map(c=>c.trim());}
function parseList(lines,i,ctx){
  const m0=LIST_RE.exec(lines[i]);
  const ordered=m0[2]!==undefined;const startAttr=ordered?m0[2]:null;
  const liNodes=[];
  while(i<lines.length){
    const m=LIST_RE.exec(lines[i]);
    if(!m||(m[2]!==undefined)!==ordered) break;
    let text=m[3];i++;
    const indentLines=[];
    while(i<lines.length){
      if(lines[i].trim()===""){
        if(i+1<lines.length&&/^(?: {2,}|\t)/.test(lines[i+1])){indentLines.push("");i++;continue;}
        break;}
      if(/^(?: {2,}|\t)/.test(lines[i])){indentLines.push(lines[i].replace(/^(?: {1,4}|\t)/,""));i++;continue;}
      break;}
    let checked=null;const tm=TASK_RE.exec(text);
    if(tm){checked=tm[1].toLowerCase()==="x";text=tm[2];}
    const kids=[];if(checked!==null) kids.push(checked?"☑ ":"☐ ");
    kids.push(...renderInline(text,ctx));
    if(indentLines.length){
      if(LIST_RE.test(indentLines[0])){const sub=parseList(indentLines,0,ctx);kids.push(sub.node);}
      else{const extra=indentLines.join(" ").trim();if(extra) kids.push(" "+extra);}}
    liNodes.push(el("li",{},...kids));
  }
  const attrs={};if(ordered&&startAttr!=="1") attrs.start=startAttr;
  return {node:el(ordered?"ol":"ul",attrs,...liNodes),next:i};
}
function parseBlocks(lines,ctx){
  const nodes=[];let i=0;
  while(i<lines.length){
    const line=lines[i];
    if(line.trim()===""){i++;continue;}
    let m;
    if((m=FENCE_RE.exec(line))){
      const fc=m[1][0],flen=m[1].length,info=m[2].trim();
      const codeLines=[];i++;
      while(i<lines.length){
        const cm=FENCE_RE.exec(lines[i]);
        if(cm&&cm[1][0]===fc&&cm[1].length>=flen&&cm[2].trim()===""){i++;break;}
        codeLines.push(lines[i]);i++;}
      const lang=/^[A-Za-z0-9_+-]+/.exec(info);
      const codeAttrs={};if(lang) codeAttrs["data-lang"]=lang[0];
      let fn=null;
      if(lang&&typeof ctx.opts.fence==="function"){try{fn=ctx.opts.fence(lang[0].toLowerCase(),codeLines.join("\n"));}catch(e){fn=null;}}
      nodes.push(fn!=null?fn:el("pre",{},el("code",codeAttrs,codeLines.join("\n"))));
      continue;}
    if((m=ATX_RE.exec(line))){
      nodes.push(heading(m[1].length,(m[2]||"").replace(/[ \t]+#+[ \t]*$/,"").trim(),ctx));
      i++;continue;}
    if(HR_RE.test(line)){nodes.push(el("hr"));i++;continue;}
    if(/^ {0,3}>/.test(line)){
      const inner=[];
      while(i<lines.length&&/^ {0,3}>/.test(lines[i])){
        inner.push(lines[i].replace(/^ {0,3}>[ \t]?/,""));i++;}
      nodes.push(el("blockquote",{},...parseBlocks(inner,ctx)));
      continue;}
    if(LIST_RE.test(line)){const r=parseList(lines,i,ctx);nodes.push(r.node);i=r.next;continue;}
    if(line.includes("|")&&i+1<lines.length&&TABLESEP_RE.test(lines[i+1])&&/-/.test(lines[i+1])){
      const header=splitRow(line);i+=2;const body=[];
      while(i<lines.length&&lines[i].trim()!==""&&lines[i].includes("|")){body.push(splitRow(lines[i]));i++;}
      const thead=el("thead",{},el("tr",{},...header.map(h=>el("th",{},...renderInline(h,ctx)))));
      const tbody=el("tbody",{},...body.map(r=>el("tr",{},...r.map(c=>el("td",{},...renderInline(c,ctx))))));
      nodes.push(el("table",{},thead,tbody));
      continue;}
    const buf=[line];i++;
    while(i<lines.length&&lines[i].trim()!==""&&!isBlockStart(lines[i])){buf.push(lines[i]);i++;}
    if(i<lines.length&&SETEXT_RE.test(lines[i])){
      const lvl=lines[i].trim()[0]==="="?1:2;
      nodes.push(heading(lvl,buf.join(" ").trim(),ctx));i++;
    } else nodes.push(el("p",{},...renderInline(buf.join(" ").trim(),ctx)));
  }
  return nodes;
}

/* ======================= DEFINITIONS ======================= */
const REFDEF_RE=/^ {0,3}\[([^\]]+)\]:\s*(<[^>]*>|\S+)(?:\s+"([^"]*)"|\s+'([^']*)'|\s+\(([^)]*)\))?\s*$/;
const FOOTDEF_RE=/^ {0,3}\[\^([^\]]+)\]:[ \t]?(.*)$/;
function extractDefs(text,refs){
  const rawLines=text.replace(/\r\n?/g,"\n").split("\n");
  const lines=[];const footnotes=[];let inFence=false,fenceChar=null,fenceLen=0;
  for(let i=0;i<rawLines.length;i++){
    const line=rawLines[i];
    const fm=FENCE_RE.exec(line);
    if(fm){
      if(!inFence){inFence=true;fenceChar=fm[1][0];fenceLen=fm[1].length;}
      else if(fm[1][0]===fenceChar&&fm[1].length>=fenceLen&&fm[2].trim()===""){inFence=false;}
      lines.push(line);continue;}
    if(!inFence){
      const dm=REFDEF_RE.exec(line);
      if(dm){const label=dm[1].trim().toLowerCase();const url=dm[2].replace(/^<|>$/g,"");
        const title=dm[3]!==undefined?dm[3]:dm[4]!==undefined?dm[4]:dm[5];
        refs[label]={url,title};continue;}
      const fnm=FOOTDEF_RE.exec(line);
      if(fnm){const id=fnm[1];const parts=[fnm[2]||""];
        while(i+1<rawLines.length&&rawLines[i+1].trim()!==""&&/^(?: {2,}|\t)/.test(rawLines[i+1])){
          i++;parts.push(rawLines[i].replace(/^ {1,4}|\t/,""));}
        footnotes.push([id,parts.join(" ").trim()]);continue;}
    }
    lines.push(line);
  }
  return {lines,footnotes};
}

/* ======================= ENTRY ======================= */
const mdNodes=(text,opts)=>{
  opts=opts||{};
  try{
    const refs=Object.create(null);
    if(opts.refs) for(const k in opts.refs) refs[String(k).toLowerCase()]=opts.refs[k];
    const ctx={opts,refs,idPrefix:opts.idPrefix||""};
    const raw=String(text==null?"":text);
    const {lines,footnotes}=extractDefs(raw,refs);
    if(typeof opts.onFootnote==="function")
      for(const [id,txt] of footnotes){try{opts.onFootnote(id,txt);}catch(e){}}
    return parseBlocks(lines,ctx);
  }catch(e){
    try{return [el("p",{},String(text==null?"":text))];}catch(e2){return [];}
  }
};

if(typeof module!=="undefined") module.exports={mdNodes};
