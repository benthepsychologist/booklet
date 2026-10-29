/* Reading helper: copy a heading's link.

   The compiler writes a small share link on each section heading (<a class="bk-anchor" href="#section">), an ordinary link
   to the heading on the same page. With this part, following it also copies the heading's full address (the page's
   address and #fragment) to the clipboard, says so for a moment ("Link copied", in the page's language, to a screen
   reader too) and goes on to the heading as before, so the address bar holds it as well. Where the browser has no
   clipboard to offer, or the reader has refused it, nothing else happens and the link is only a link.

   The clipboard is not storage: this writes one string, the heading's own address, to it when the reader asks, and
   reads nothing back. It touches nothing else. */
(function () {
  "use strict";
  var d = document;
  var WORDS = { en: "Link copied", fr: "Lien copié", es: "Enlace copiado" };
  var lives = new WeakMap(), saying = null, mark = null, timer = 0, was = "";

  function wordsFor(root) {
    var l = (root.getAttribute("lang") || d.documentElement.lang || "en").toLowerCase().slice(0, 2);
    return WORDS[l] || WORDS.en;
  }
  function unsay() {
    clearTimeout(timer);
    if (mark) { mark.textContent = was; mark.classList.remove("bk-copied"); }
    mark = null;
    if (saying) saying.textContent = "";
  }
  function say(a, root) {
    unsay();
    saying = lives.get(root);
    if (saying) saying.textContent = wordsFor(root);
    mark = a;
    was = a.textContent;
    a.textContent = "\u2713";
    a.classList.add("bk-copied");
    timer = setTimeout(unsay, 1800);
  }

  function start() {
    var roots = d.querySelectorAll(".booklet");
    var any = false;
    for (var i = 0; i < roots.length; i++) {
      if (!roots[i].querySelector("a.bk-anchor")) continue;
      /* the place the words are said, there from the start, so a screen reader hears the change */
      var live = d.createElement("p");
      live.className = "bk-said";
      live.setAttribute("role", "status");
      roots[i].appendChild(live);
      lives.set(roots[i], live);
      any = true;
    }
    if (!any) return;
    d.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest("a.bk-anchor") : null;
      var root = a && a.closest(".booklet");
      var href = a && a.getAttribute("href");
      if (!root || !href || href.charAt(0) !== "#") return;
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") return;
      var url = location.href.split("#")[0] + href;
      navigator.clipboard.writeText(url).then(function () { say(a, root); }, function () { /* refused: only a link */ });
    });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start);
  else start();
})();
