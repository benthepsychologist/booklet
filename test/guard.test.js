// The renderer is a bare renderer: it draws what SPEC.md defines and loads
// modules from the registry, and carries nothing else. This fails if a name
// from the removed built-ins, wrapper, shelf or locking code comes back.
// Run: node test/guard.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const html=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8");
const BANNED=["ENTRY_STORE","emptyCheckin","emptyToday","goodday","checkins","BODY_KEYS","TODAY_KEYS","skipBody",
  "LIBRARY(","acquisitions","KEYS_BY_TYPE","LEGACY_KEYS","wrapperConfig","addModFile","veilSafety","veilRemind",
  "veilLock",'"checkin"','"today"'];
let fails=0;
for(const w of BANNED){const n=html.split(w).length-1;
  if(n){fails++;console.log("  FAIL  booklet.html still contains "+w+" ("+n+"x)");}
  else console.log("  ok    no "+w);}
console.log(fails?"\n"+fails+" FAILURES":"\nguard checks passed");
process.exit(fails?1:0);
