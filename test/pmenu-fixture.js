// A made-up booklet of 157 pages in three levels, for the pages menu's checks (test/pagesmenu.test.js,
// test/pagesmenu-browser.js). Invented content; nothing here is anyone's real data. Not a test (the runners take
// *.test.js and *-browser.js).
//   tree()     the pages, in reading order (depth first): [{id, title, parent, depth}], 157 of them:
//              7 top pages, 4 children each (28), and 122 grandchildren (4 under each child, 5 under the first 10)
//   booklet(n) the booklet's text; `n` limits the pages to the first n (default all)
const WORDS=["Tidepool","Lantern","Kelp","Anchor","Sandbar","Gull","Mooring","Breakwater","Harbour","Skiff","Ropewalk","Lighthouse","Shoal","Driftwood","Chandlery","Quay","Eddy","Ballast","Cormorant","Jetty"];
function tree(){
  const out=[];let n=0;
  const add=(parent,depth)=>{n++;const id="p"+String(n).padStart(3,"0"),
    title=WORDS[n%WORDS.length]+" "+WORDS[(n*7+3)%WORDS.length].toLowerCase()+(n%9===0?" and the long road to the far end of the harbour wall":"")+" "+n;
    out.push({id,title,parent,depth});return id;};
  let child=0;
  for(let t=0;t<7;t++){const T=add("",1);
    for(let c=0;c<4;c++){const C=add(T,2);const g=child++<10?5:4;for(let k=0;k<g;k++) add(C,3);}}
  return out;}
function booklet(n){
  const pages=tree().slice(0,n||157);
  let t='---\nbooklet: "0.21"\ntitle: Harbour almanac\nlang: en\n---\n\n> [!module|alm] Harbour almanac\n\n> [!activity|almanac] Almanac\n\n';
  for(const p of pages) t+="> [!page|"+p.id+(p.parent?" parent:"+p.parent:"")+"] "+p.title+"\n\nNotes for "+p.title+". The water was calm and the boats stayed in.\n\n";
  return t+"> [!activity|after] After\n\nThe last word.\n\n> [!module|alm end] End\n";}
module.exports={tree,booklet};
