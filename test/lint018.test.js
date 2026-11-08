// Format 0.18, linter lane: the linter checks what format 0.18 adds (SPEC.md section 2, `media-from:` and the marker; section 4, the
// `listen` row; section 5, "Listen"; section 6, "Audio and video" and the image rules it extends). Each case is a small file made here
// with ONE slip, linted, and the finding is checked by its kind (error or warning), its line and its words; the clean files must stay
// clean, so a new check cannot buy its catch with a false alarm. Nothing here is a real person's or a real booklet's.
// Run: node test/lint018.test.js   (node and python3; nothing to install.)  LINT_BOOKLET=<path> tries another linter.
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const LINT=process.env.LINT_BOOKLET||path.join(R,"lint-booklet.py");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"lint018-"));let k=0;
// `files` are empty files made beside the booklet (a bare `![[name]]` is looked for there); each case has a folder of its own
const lint=(text,files)=>{const dir=path.join(tmp,"c"+(++k));fs.mkdirSync(dir);
  for(const f of files||[]){fs.mkdirSync(path.dirname(path.join(dir,f)),{recursive:true});fs.writeFileSync(path.join(dir,f),"");}
  const f=path.join(dir,"f.md");fs.writeFileSync(f,text);
  const r=spawnSync("python3",[LINT,f],{encoding:"utf8"}),lines=r.stdout.split("\n");
  return {status:r.status,out:r.stdout,errors:lines.filter(l=>l.startsWith("ERROR")),warns:lines.filter(l=>l.startsWith("warn"))};};
const HEAD='---\nbooklet: "0.20"\ntitle: Lint fixture\nlang: en\n';
const FM=HEAD+'---\n\n';
// a file of one activity with a body; the front matter is 6 lines, the activity line is line 7 and the body starts on line 9
const ACT=(body,head="> [!activity|a] Notes\n\n")=>FM+head+body;
const one=(what,r,kind,line,rx)=>{const got=kind==="ERROR"?r.errors:r.warns;
  chk(`${what}: exactly one finding, ${kind==="ERROR"?"an error":"a warning"}`,got.length===1&&r.errors.length+r.warns.length===1,r.out);
  chk(`${what}: ${line?"it names line "+line+" and ":"it "}says the fix`,(line?new RegExp(": line "+line+": ").test(got[0]||""):true)&&rx.test(got[0]||""),got[0]);
  chk(`${what}: ${kind==="ERROR"?"the file fails":"the build does not fail"}`,(r.status===1)===(kind==="ERROR"),String(r.status));};
const clean=(what,r)=>chk(what,r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);

// ---- the marker: 0.20 is the current format
{const m=spawnSync("python3",[LINT,"--marker"],{encoding:"utf8"});
 chk("--marker prints the 0.20 marker, quoted",m.status===0&&m.stdout==='booklet: "0.20"\n',JSON.stringify(m.stdout));
 clean("a file marked 0.20 lints with no marker notice",lint(ACT("A line.\n")));
 one("a file marked 0.17 gets the other-marker notice",lint(ACT("A line.\n").replace('"0.20"','"0.17"')),"warn",0,/this file says booklet: 0\.17; the current format is 0\.20, and it is checked as 0\.20/);
 const e=lint(ACT("A line.\n").replace('booklet: "0.20"','title: x'));
 chk("a file with no marker is an error that names 0.20",e.status===1&&/front matter must say `booklet: "0\.20"`/.test(e.errors[0]||""),e.out);}

// ---- section 2: `media-from:` is one https origin, a list of them, or several separated by commas
{const MF=v=>lint(HEAD+v+"---\n\n> [!activity|a] Notes\n\nA line.\n");
 clean("`media-from` with one origin lints clean (the key is known, not reported)",MF("media-from: https://media.example.org\n"));
 clean("an origin with a port lints clean",MF("media-from: https://cdn.example.net:8443\n"));
 clean("a quoted origin lints clean",MF('media-from: "https://media.example.org"\n'));
 clean("a YAML list of origins lints clean",MF("media-from:\n  - https://media.example.org\n  - https://cdn.example.net:8443\n"));
 clean("a list written flush left lints clean",MF("media-from:\n- https://media.example.org\n"));
 clean("several origins in one value, separated by commas, lint clean",MF("media-from: https://a.example.org, https://b.example.org\n"));
 clean("an empty `media-from` declares nothing and is not reported",MF("media-from:\n"));
 clean("an empty quoted `media-from` declares nothing and is not reported",MF('media-from: ""\n'));
 const bad=[["a path","media-from: https://media.example.org/u01/\n",/'https:\/\/media\.example\.org\/u01\/' has a path, query or fragment after the host/],
  ["a trailing slash","media-from: https://media.example.org/\n",/has a path, query or fragment after the host/],
  ["a query","media-from: https://media.example.org?x=1\n",/has a path, query or fragment after the host/],
  ["a fragment","media-from: https://media.example.org#top\n",/has a path, query or fragment after the host/],
  ["a user name","media-from: https://me@media.example.org\n",/has a user name in it/],
  ["a wildcard","media-from: https://*.example.org\n",/has a wildcard, and an origin names one host/],
  ["the scheme http","media-from: http://media.example.org\n",/has the scheme `http:`, and only `https:` is allowed/],
  ["no scheme","media-from: media.example.org\n",/'media\.example\.org' is not an origin/],
  ["a port that is not a number","media-from: https://media.example.org:abc\n",/is not a host name and an optional port/]];
 for(const [what,v,rx] of bad) one(`a \`media-from\` with ${what} is an error`,MF(v),"ERROR",0,rx);
 one("one bad origin in a list is one error, and the others still count",MF("media-from:\n  - https://media.example.org\n  - http://cdn.example.net\n"),"ERROR",0,/'http:\/\/cdn\.example\.net' has the scheme `http:`/);
 one("one bad origin among commas is one error",MF("media-from: https://a.example.org, https://b.example.org/x\n"),"ERROR",0,/'https:\/\/b\.example\.org\/x' has a path/);
 const two=MF("media-from:\n  - https://a.example.org/x\n  - ftp://b.example.org\n");
 chk("two bad origins are two errors",two.errors.length===2,two.out);}

// ---- section 4 and 5: the `listen` kind and its one setting
const LISTEN=(settings,media)=>`> [!listen|u01${settings}] Episode 1\n${media===undefined?"> ![Episode 1](media/e1.m4a)\n":media}\n`;
{clean("a listen with an audio embed lints clean (it is a kind the format defines)",lint(ACT(LISTEN("","> ![Episode 1](media/e1.m4a)\n"))));
 clean("a listen with `left:60` lints clean",lint(ACT(LISTEN(" left:60"))));
 clean("a listen with `left:0` lints clean (a whole number of seconds)",lint(ACT(LISTEN(" left:0"))));
 clean("a listen with a link in place of an embed lints clean",lint(ACT(LISTEN("","> [Watch the lecture](https://video.example.org/watch/overview)\n"))));
 clean("a listen with no media and no link lints clean (the format asks for neither)",lint(ACT("> [!listen|u01] Episode 1\n\n")));
 clean("a listen with a hint under it lints clean (it is a question)",lint(ACT(LISTEN("")+"> [!hint]- Think about the tide\n> It turns twice a day.\n")));
 clean("a listen in an activity that is not `repeat` lints clean, with a remote https embed",lint(ACT("> [!listen|u01] Episode 1\n> ![Episode 1](https://media.example.org/u01/e1.m4a)\n")));
 for(const [what,s] of [["words","left:abc"],["a decimal","left:1.5"],["a negative number","left:-5"],["nothing","left:"],["a unit","left:60s"]])
   one(`\`left:\` with ${what} is an error`,lint(ACT(LISTEN(" "+s))),"ERROR",9,/must be a whole number of seconds written in digits.*a renderer ignores it and uses its default, 120/);
 one("a setting a listen does not take is an error",lint(ACT(LISTEN(" min:5"))),"ERROR",9,/a listen line takes no `min:` setting \(it takes `left:`\)/);
 one("`repeat` on a listen line is an error",lint(ACT(LISTEN(" repeat"))),"ERROR",9,/a listen line takes no `repeat` setting/);
 one("a listen in a `repeat` activity is an error",lint(ACT(LISTEN(""),"> [!activity|a repeat] Notes\n\n")),"ERROR",9,/a listen is answered once, so it cannot be in a `repeat` activity.*put it in an activity that is not `repeat`/);
 one("a listen in a `repeat daily` activity is an error",lint(ACT(LISTEN(""),"> [!activity|a repeat daily] Notes\n\n")),"ERROR",9,/cannot be in a `repeat` activity/);
 one("a listen with no id is an error",lint(ACT("> [!listen] Episode 1\n> ![Episode 1](media/e1.m4a)\n")),"ERROR",9,/this listen question has no id/);
 one("two audio embeds under a listen is an error",lint(ACT("> [!listen|u01] Episode 1\n> ![One](media/e1.m4a)\n> ![Two](media/e2.mp3)\n")),"ERROR",9,/this listen holds 2 audio or video embeds \(lines 10, 11\).*give the other its own listen/);
 one("an audio and a video embed under a listen is an error",lint(ACT("> [!listen|u01] Episode 1\n> ![One](media/e1.m4a)\n> ![Two](media/e2.mp4)\n\n> [!note]- Transcript\n> Words.\n")),"ERROR",9,/this listen holds 2 audio or video embeds/);
 clean("an image and one audio embed under a listen lints clean (only audio and video are counted)",lint(ACT("> [!listen|u01] Episode 1\n> ![Cover](media/cover.png)\n> ![One](media/e1.m4a)\n")));
 clean("one embed under each of two listens lints clean",lint(ACT("> [!listen|u01] Episode 1\n> ![One](media/e1.m4a)\n\n> [!listen|u02] Episode 2\n> ![Two](media/e2.m4a)\n")));
 clean("a listen with a video and its transcript lints clean",lint(ACT("> [!listen|u01] Lecture\n> ![Lecture](media/l1.mp4)\n\n> [!note]- Transcript\n> Words.\n")));}

// ---- section 6: audio and video embeds, by the extension, in any case
{clean("an audio embed with a title lints clean",lint(ACT('![Lecture 3](media/lecture-3a.mp3 "Week 3")\n')));
 clean("every audio extension a reader should play lints clean, in any case",lint(ACT("![a](m/a.mp3)\n\n![b](m/b.M4A)\n\n![c](m/c.ogg)\n\n![d](m/d.Opus)\n\n![e](m/e.wav)\n")));
 clean("`.mp4` and `.webm` lint clean with their transcripts",lint(ACT("![a](m/a.mp4)\n\n> [!note]- Transcript\n> Words.\n\n![b](m/b.WEBM)\n\n> [!note]- Transcript\n> Words.\n")));
 clean("a reference-style audio embed lints clean",lint(ACT("![Lecture 3][lec]\n\n[lec]: media/lecture-3a.mp3\n")));
 clean("a file embed with a path lints clean, with or without a file there",lint(ACT("![[media/lecture-3a.mp3]]\n")));
 clean("a file embed of a bare name that is beside the booklet lints clean",lint(ACT("![[lecture-3a.mp3]]\n"),["lecture-3a.mp3"]));
 clean("a file embed with Obsidian's size suffix lints clean",lint(ACT("![[picture.png|300]]\n"),["picture.png"]));
 clean("a file embed of an image lints clean",lint(ACT("![[picture.png]]\n"),["picture.png"]));
 clean("a block embed of a widget is not a file, so it is not looked for",lint(ACT("> [!widget|w] Pick\n> ![[#^w-data]]\n\n```booklet widget\n{\"engine\":\"grid-select\"}\n```\n^w-data\n")));
 clean("a remote https audio address may be written",lint(ACT("![Episode](https://media.example.org/u01/e1.m4a)\n")));
 clean("a remote https video address may be written, and needs no transcript (only a local video does)",lint(ACT("![Episode](https://media.example.org/u01/e1.mp4)\n")));
 clean("an audio embed in code is not read",lint(ACT("`![x](http://a.org/x.mp3)`\n\n```\n![x](http://a.org/x.mp3)\n```\n")));
 one("a bare file embed that is not beside the booklet is a warning",lint(ACT("![[lecture-3a.mp3]]\n")),"warn",9,/!\[\[lecture-3a\.mp3\]\] is a bare name, and no file of that name is beside this booklet.*write its path/);
 one("a bare image embed that is not beside the booklet is the same warning",lint(ACT("![[picture.png|300]]\n")),"warn",9,/!\[\[picture\.png\]\] is a bare name, and no file of that name is beside this booklet/);
 one("`.flac` is allowed but may not play everywhere: a warning",lint(ACT("![x](m/a.flac)\n")),"warn",9,/the audio m\/a\.flac ends in \.flac, which may not play in every reader; write \.mp3, \.m4a, \.ogg, \.opus or \.wav/);
 one("`.3gp` is the same warning",lint(ACT("![x](m/a.3gp)\n")),"warn",9,/ends in \.3gp, which may not play in every reader/);
 one("`.mov` is a warning (with its transcript)",lint(ACT("![x](m/a.mov)\n\n> [!note]- Transcript\n> Words.\n")),"warn",9,/the video m\/a\.mov ends in \.mov, which may not play in every reader; write \.mp4 or \.webm/);
 one("`.mkv` is a warning (with its transcript)",lint(ACT("![x](m/a.mkv)\n\n> [!note]- Transcript\n> Words.\n")),"warn",9,/ends in \.mkv/);
 one("`.ogv` is a warning (with its transcript)",lint(ACT("![x](m/a.ogv)\n\n> [!note]- Transcript\n> Words.\n")),"warn",9,/ends in \.ogv/);
 one("a remote https `.flac` is the same warning",lint(ACT("![x](https://media.example.org/a.flac)\n")),"warn",9,/ends in \.flac/);
 one("an `http:` media address is a warning: it is never used",lint(ACT("![x](http://media.example.org/a.mp3)\n")),"warn",9,/the audio http:\/\/media\.example\.org\/a\.mp3 has an address that is not `https:`; a renderer never uses an `http:` address or one that starts `\/\/`/);
 one("a media address that starts `//` is a warning: it is never used",lint(ACT("![x](//media.example.org/a.mp3)\n")),"warn",9,/has an address that is not `https:`/);
 one("a `data:` address is an error, as for an image",lint(ACT("![x](data:audio/mpeg;base64,AAAA)\n")),"ERROR",9,/an address with the scheme `data:`/);
 one("a `javascript:` address is an error",lint(ACT("![x](javascript:alert(1))\n")),"ERROR",9,/an address with the scheme `javascript:`/);
 one("an extensionless remote address in the image syntax is an error: it is a link",lint(ACT("![Lecture](https://video.example.org/watch/overview)\n")),"ERROR",9,/is a remote address with no media extension, so it is a link, never an embed.*write it as a link, `\[words\]\(address\)`, without the `!`/);
 one("an extensionless remote address with a query is the same error",lint(ACT("![Lecture](https://video.example.org/watch?v=abc123)\n")),"ERROR",9,/is a remote address with no media extension/);
 one("an extensionless `http:` address in the image syntax is the same error",lint(ACT("![Lecture](http://video.example.org/watch/overview)\n")),"ERROR",9,/is a remote address with no media extension/);
 clean("the same address written as a link is just a link",lint(ACT("[Watch the lecture](https://video.example.org/watch/overview)\n")));
 one("a media path that breaks the path rules is a warning",lint(ACT("![x](../media/a.mp3)\n")),"warn",9,/the audio \.\.\/media\/a\.mp3 is not a path the renderer reads.*no leading \/\); it shows the alt text and the address as text/);
 one("a media path with a space (bracketed) is a warning",lint(ACT("![x](<media/a b.mp3>)\n")),"warn",9,/the audio media\/a b\.mp3 is not a path the renderer reads/);
 one("a media path with a leading slash is a warning",lint(ACT("![x](/media/a.mp4)\n\n> [!note]- Transcript\n> Words.\n")),"warn",9,/the video \/media\/a\.mp4 is not a path the renderer reads/);
 one("an embed whose extension is neither image nor media is the path warning",lint(ACT("![x](files/a.pdf)\n")),"warn",9,/the image files\/a\.pdf is not a path the renderer reads.*or an audio or video extension\)/);
 one("a remote image is still the old warning",lint(ACT("![x](https://img.example.org/a.png)\n")),"warn",9,/the image https:\/\/img\.example\.org\/a\.png has a remote address; a renderer does not fetch remote images/);}

// ---- section 6: a local video wants a transcript
{one("a local video with no transcript is a warning",lint(ACT("![Lecture](media/l1.mp4)\n\nThe next paragraph.\n")),"warn",9,/the video media\/l1\.mp4 has no transcript; straight after it add a folded callout, `> \[!note\]- Transcript`/);
 one("a local video at the end of the file with no transcript is the same warning",lint(ACT("![Lecture](media/l1.webm)\n")),"warn",9,/has no transcript/);
 one("a transcript that is not folded is not a transcript",lint(ACT("![Lecture](media/l1.mp4)\n\n> [!note] Transcript\n> Words.\n")),"warn",9,/has no transcript/);
 one("a transcript that is not directly after the video is not one",lint(ACT("![Lecture](media/l1.mp4)\n\nA paragraph between.\n\n> [!note]- Transcript\n> Words.\n")),"warn",9,/has no transcript/);
 one("a local video file embed with no transcript is the same warning",lint(ACT("![[media/l1.mp4]]\n")),"warn",9,/has no transcript/);
 one("a reference-style local video with no transcript is the same warning",lint(ACT("![Lecture][l1]\n\n[l1]: media/l1.mp4\n")),"warn",9,/has no transcript/);
 clean("a transcript right after the video lints clean",lint(ACT("![Lecture](media/l1.mp4)\n> [!note]- Transcript\n> Words.\n")));
 clean("a transcript after a blank line lints clean, in any language",lint(ACT("![Lecture](media/l1.mp4)\n\n> [!note]- Transcripción\n> Palabras.\n")));
 clean("local audio needs no transcript",lint(ACT("![Episode](media/e1.mp3)\n")));
 clean("a transcript after a listen's media, which is in the listen, lints clean",lint(ACT("> [!listen|u01] Lecture\n> ![Lecture](media/l1.mp4)\n> Watch it.\n\n> [!note]- Transcript\n> Words.\n")));
 one("a listen's video with the transcript missing is the warning, on the video's line",lint(ACT("> [!listen|u01] Lecture\n> ![Lecture](media/l1.mp4)\n\nNext.\n")),"warn",10,/has no transcript/);}

// ---- section 6: raw HTML media and frames are an error
{for(const t of ["audio","video","source","track","iframe","frame","object","embed","script"])
   one(`raw \`<${t}>\` is an error`,lint(ACT(`Before.\n\n<${t} src="x">\n`)),"ERROR",11,new RegExp("`<"+t+">` is raw HTML that plays media or frames another page, which a booklet does not use.*embed audio or video with `!\\[words\\]\\(file\\.mp3\\)`, or write a link"));
 one("a raw tag in capitals is the same error",lint(ACT("<VIDEO controls></VIDEO>\n")),"ERROR",9,/`<video>` is raw HTML/);
 one("a raw tag with attributes in the middle of a line is the same error",lint(ACT("Text <iframe src=\"https://a.org\"></iframe> more.\n")),"ERROR",9,/`<iframe>` is raw HTML/);
 one("a raw tag with no attribute is the same error",lint(ACT("<script>x()</script>\n")),"ERROR",9,/`<script>` is raw HTML/);
 one("a raw tag inside a callout is the same error",lint(ACT("> [!note] Title\n> <audio src=\"a.mp3\"></audio>\n")),"ERROR",10,/`<audio>` is raw HTML/);
 clean("a raw tag in inline code is not read",lint(ACT("Write `<video>` to play it.\n")));
 clean("a raw tag in a code fence is not read",lint(ACT("```html\n<video src=\"a.mp4\"></video>\n```\n")));
 clean("a raw tag in an HTML comment is not read",lint(ACT("<!-- <iframe src=\"x\"></iframe> -->\n")));
 clean("other HTML, and a word that only starts like a tag, is not reported",lint(ACT("<details><summary>More</summary>Text</details>\n\nThe <objective> is clear and the <embedded> kind is fine.\n")));}

console.log(fails?"\n"+fails+" FAILURES":"\nlint 0.20 checks passed");process.exit(fails?1:0);
