/* Reading helper: a tab bar over an activity's (or a module's) tabs.

   The compiler writes tabs one after another, each a <section class="bk-tab"> under its heading (SPEC section 3, "a
   renderer with no tab bar"). A renderer that has a bar opens on the first tab and shows one at a time; this part does
   that to a run of two or more tab sections that sit side by side. With the script off nothing changes: every tab stays
   under its name. It writes no markup from the booklet's text: each button takes its words from the tab's heading with
   textContent, and a tab is shown or hidden with its hidden attribute. Which tab is showing is never stored, and a reload starts on the first tab.

   The pattern is the ARIA tabs pattern, as the renderer's bar is: a tablist of buttons, the one on show selected and the
   only one in the Tab order, Left and Right (and Home, End) moving to a tab and showing it, each tab section its
   panel. A link to a heading inside a tab that is not showing (a link in the text, the share link of a tab's heading, the
   page's address with a #fragment) shows that tab first. The stylesheet prints every tab and leaves the bar off the print. */
(function () {
  "use strict";
  var d = document;
  var WORDS = { en: "Tabs", fr: "Onglets", es: "Pestañas" };
  var count = 0;
  var showers = new WeakMap(); /* a tab section -> the function that shows it */

  function wordsFor(root) {
    var l = (root.getAttribute("lang") || d.documentElement.lang || "en").toLowerCase().slice(0, 2);
    return WORDS[l] || WORDS.en;
  }
  function isHeading(n) { return !!n && /^H[1-6]$/.test(n.tagName); }
  /* a heading's words, without the share link that sits in it */
  function headingText(h) {
    var t = "";
    for (var c = h.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) t += c.nodeValue;
      else if (c.nodeType === 1 && !c.classList.contains("bk-anchor")) t += c.textContent;
    }
    return t.replace(/\s+/g, " ").trim();
  }
  function freeId(base) {
    var id = base, i = 1;
    while (d.getElementById(id)) id = base + "-" + (++i);
    return id;
  }
  /* the nearest heading before a run of tabs among its siblings: the activity's (or the module's) name for the bar */
  function nameBefore(first) {
    for (var n = first.previousElementSibling; n; n = n.previousElementSibling) {
      if (isHeading(n)) return headingText(n);
    }
    return "";
  }
  function isTab(n) { return !!n && n.tagName === "SECTION" && n.classList.contains("bk-tab"); }

  /* runs of two or more tab sections that are siblings, in reading order */
  function runsIn(root) {
    var runs = [], all = root.querySelectorAll("section.bk-tab");
    for (var i = 0; i < all.length; i++) {
      if (isTab(all[i].previousElementSibling)) continue; /* not the first of its run */
      var run = [all[i]];
      for (var n = all[i].nextElementSibling; isTab(n); n = n.nextElementSibling) run.push(n);
      if (run.length > 1) runs.push(run);
    }
    return runs;
  }

  function build(run, root) {
    var first = run[0];
    if (first.previousElementSibling && first.previousElementSibling.classList.contains("bk-tabbar")) return;
    var g = ++count;
    var bar = d.createElement("div");
    bar.className = "bk-tabbar";
    bar.setAttribute("role", "tablist");
    bar.setAttribute("aria-label", nameBefore(first) || wordsFor(root));
    var tabs = [];

    function show(i, focus) {
      for (var j = 0; j < tabs.length; j++) {
        var on = j === i;
        tabs[j].btn.setAttribute("aria-selected", on ? "true" : "false");
        tabs[j].btn.tabIndex = on ? 0 : -1;
        tabs[j].panel.hidden = !on;
      }
      if (focus) tabs[i].btn.focus();
    }

    run.forEach(function (sec, i) {
      var h = sec.firstElementChild;
      var name = isHeading(h) ? headingText(h) : "";
      if (!name) name = wordsFor(root) + " " + (i + 1);
      var btn = d.createElement("button");
      btn.type = "button";
      btn.className = "bk-tabbtn";
      btn.id = freeId("bk-tb-" + g + "-" + (i + 1));
      btn.setAttribute("role", "tab");
      btn.textContent = name;
      if (!sec.id) sec.id = freeId("bk-tp-" + g + "-" + (i + 1));
      btn.setAttribute("aria-controls", sec.id);
      sec.setAttribute("role", "tabpanel");
      sec.setAttribute("aria-labelledby", btn.id);
      sec.tabIndex = 0;
      tabs.push({ btn: btn, panel: sec });
      showers.set(sec, function () { show(i, false); });
      btn.addEventListener("click", function () { show(i, false); });
      bar.appendChild(btn);
    });

    bar.addEventListener("keydown", function (e) {
      var at = -1, n = tabs.length;
      for (var j = 0; j < n; j++) if (tabs[j].btn === e.target) at = j;
      if (at < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
      var to = e.key === "ArrowRight" ? (at + 1) % n : e.key === "ArrowLeft" ? (at + n - 1) % n
        : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
      if (to < 0) return;
      e.preventDefault();
      show(to, true);
    });

    first.parentNode.insertBefore(bar, first);
    show(0, false);
  }

  /* show every tab that holds the target, from the outside in or the inside out (a tab inside a tab) */
  function reveal(target) {
    var shown = false;
    for (var n = target; n; n = n.parentElement) {
      var f = showers.get(n);
      if (f && n.hidden) { f(); shown = true; }
    }
    return shown;
  }
  function targetOf(href) {
    if (!href || href.charAt(0) !== "#" || href.length < 2) return null;
    var id = href.slice(1);
    try { id = decodeURIComponent(id); } catch (e) { /* an address that does not decode is used as written */ }
    return d.getElementById(id);
  }

  function start() {
    var roots = d.querySelectorAll(".booklet");
    for (var i = 0; i < roots.length; i++) runsIn(roots[i]).forEach(function (run) { build(run, roots[i]); });
    if (!count) return;
    /* a link in the page: its target's tab is shown before the browser goes there */
    d.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      var t = targetOf(a.getAttribute("href"));
      if (t) reveal(t);
    }, true);
    function fromAddress() {
      var t = targetOf(window.location.hash);
      if (t && reveal(t)) t.scrollIntoView();
    }
    window.addEventListener("hashchange", fromAddress);
    fromAddress();
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start);
  else start();
})();
