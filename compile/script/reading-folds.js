/* Reading helper: "Open all" on folds, and folds open for printing.

   The compiler writes a fold the author made (a callout folded with "-", or a block placed as folded) as
   <details class="bk-fold">, closed, and a question's hint and solution as <details class="bk-fold bk-hint"> or
   "bk-solution". As the renderer's fold switch does, this part gives each activity (or the page, for folds outside any
   activity) that holds a fold the author made one switch, "Open all", that opens or folds exactly those and never a hint or
   a solution. The switch is a button with role "switch", and it reflects the folds: it is on when every one is open,
   whichever way they were opened. It is not kept: a reload starts with every fold as the page was written.

   Printing prints everything: the folds that are closed open for the print and close again afterwards, for a browser that
   cannot show a closed fold's contents on paper by the stylesheet alone (the stylesheet does it where the browser can). */
(function () {
  "use strict";
  var d = document;
  var WORDS = { en: "Open all", fr: "Tout ouvrir", es: "Abrir todo" };
  var FOLD = "details.bk-fold:not(.bk-hint):not(.bk-solution)";

  function wordsFor(root) {
    var l = (root.getAttribute("lang") || d.documentElement.lang || "en").toLowerCase().slice(0, 2);
    return WORDS[l] || WORDS.en;
  }
  function allOpen(folds) {
    for (var i = 0; i < folds.length; i++) if (!folds[i].open) return false;
    return true;
  }
  /* the switch goes under the heading it belongs to, past a page's title, lede and contents */
  function spot(box) {
    var n = box.firstElementChild;
    while (n && (/^H[1-6]$/.test(n.tagName) || n.classList.contains("bk-lede") || n.classList.contains("bk-toc"))) n = n.nextElementSibling;
    return n;
  }

  function addSwitch(box, folds, root) {
    var btn = d.createElement("button");
    btn.type = "button";
    btn.className = "bk-foldsw";
    btn.setAttribute("role", "switch");
    var knob = d.createElement("span");
    knob.className = "bk-foldknob";
    knob.setAttribute("aria-hidden", "true");
    btn.appendChild(knob);
    btn.appendChild(d.createTextNode(wordsFor(root)));
    function sync() { btn.setAttribute("aria-checked", allOpen(folds) ? "true" : "false"); }
    btn.addEventListener("click", function () {
      var on = !allOpen(folds);
      for (var i = 0; i < folds.length; i++) folds[i].open = on;
      sync();
    });
    /* a fold opened or closed by hand moves the switch (toggle does not bubble, so it is heard on the way down) */
    box.addEventListener("toggle", sync, true);
    sync();
    box.insertBefore(btn, spot(box));
  }

  function start() {
    var roots = d.querySelectorAll(".booklet");
    for (var r = 0; r < roots.length; r++) {
      var root = roots[r], groups = [], boxes = [];
      var folds = root.querySelectorAll(FOLD);
      for (var i = 0; i < folds.length; i++) {
        /* a fold belongs to its activity; one outside every activity belongs to the page */
        var box = folds[i].parentElement ? folds[i].parentElement.closest("section.bk-activity") : null;
        if (!box || !root.contains(box)) box = root;
        var at = boxes.indexOf(box);
        if (at < 0) { boxes.push(box); groups.push([]); at = boxes.length - 1; }
        groups[at].push(folds[i]);
      }
      for (var g = 0; g < boxes.length; g++) {
        if (boxes[g].querySelector(":scope > .bk-foldsw")) continue;
        addSwitch(boxes[g], groups[g], root);
      }
    }
    var opened = [];
    window.addEventListener("beforeprint", function () {
      opened = [];
      var all = d.querySelectorAll(".booklet details.bk-fold");
      for (var i = 0; i < all.length; i++) if (!all[i].open) { all[i].open = true; opened.push(all[i]); }
    });
    window.addEventListener("afterprint", function () {
      for (var i = 0; i < opened.length; i++) opened[i].open = false;
      opened = [];
    });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start);
  else start();
})();
