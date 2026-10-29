/* 10-quiz.js: the one thing the stylesheet cannot do for a quiz, which is speak.

   The stylesheet already marks every option, shows every reply and writes the verdict line when a question is answered
   (compile/booklet.css, "the quiz"). This part adds two things, only for a question the compiler marked graded
   (data-bk-graded, because it has a right answer):
     - when a reader picks or ticks, it copies the verdict sentence the compiler already wrote beside the question
       ("Right." or "Not quite. The answer is …") into the question's empty live region, as text, so a screen reader says it;
     - when a pick-any question's Check is on and the reader then changes a tick, it turns Check off, as the renderer's
       own question does, so the marks go and the reader checks again.
   It reads the page's own markup, keeps no copy of any answer, writes nothing but text, and does nothing on a page that
   has no graded question. Nothing is stored or sent; the rules for a part are at the top of compile/script.js. */
(function(){
"use strict";
var quizzes=document.querySelectorAll(".bk-q[data-bk-graded]");
if(!quizzes.length) return;
/* the reader's picks against the right options: true when every right option is on and no other is */
function allRight(q){
  var opts=q.querySelectorAll(".bk-opt"),on=0,i,input,right;
  if(q.getAttribute("data-bk-kind")==="choice"){
    for(i=0;i<opts.length;i++){input=opts[i].querySelector("input");if(input&&input.checked) return opts[i].classList.contains("bk-right");}
    return false;}
  for(i=0;i<opts.length;i++){
    input=opts[i].querySelector("input");right=opts[i].classList.contains("bk-right");
    if(input&&input.checked){on++;if(!right) return false;}
    else if(right) return false;}
  return on>0;}
function anyOn(q){return !!q.querySelector(".bk-opt>input:checked");}
/* says nothing until something is picked, so the sentence can never be read out with nothing ticked */
function say(q){
  var live=q.querySelector(".bk-live"),line=q.querySelector(allRight(q)?".bk-say-ok":".bk-say-no");
  if(live&&line&&anyOn(q)) live.textContent=line.textContent;}
function hush(q){var live=q.querySelector(".bk-live");if(live) live.textContent="";}
Array.prototype.forEach.call(quizzes,function(q){
  var check=q.querySelector(".bk-check");
  q.addEventListener("change",function(e){
    var t=e.target;
    if(!t||t.tagName!=="INPUT") return;
    if(t===check){if(check.checked&&!anyOn(q)) check.checked=false;if(check.checked) say(q);else hush(q);return;}
    if(check){if(check.checked) check.checked=false;hush(q);return;}
    say(q);});});
})();
