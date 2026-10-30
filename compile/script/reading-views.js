/* Reading helper: sort and filter on a data view.

   The compiler marks a query view's markup for this part (the markup contract between views.js and this part): the container carries
   data-bk-view="table|list|cards|tiles|bars|line", each row inside carries data-bk-row, and each value inside a row
   carries data-bk-col="<column name>" with the value as its text. For every container that has them, this part puts a
   quiet "Sort and filter" button above it that opens a small bar: a search box (rows whose values do not contain the
   words are hidden), a choice of column to sort by with a direction button, and a Clear button. It reorders and hides the
   compiler's own rows and writes no row, no value and no text of the booklet's: every word it adds is its own, and the
   column names are set as text.

   Nothing is saved. A reload starts in the order the rows were written, with every row shown (SPEC section 6: "It is saved
   nowhere, and a file never states it"). A line chart keeps its order (SPEC section 6), so it is left alone, and so is a
   container that has no rows, no values or a single row. Rows are sorted among their own group (the rows side by side
   under one heading), so a view drawn in groups keeps its groups: a heading with no row left to show is hidden with them,
   and Clear puts every row back exactly where it was. In a nested list a row that matches keeps its branch and opens it,
   a branch with no match goes, and sorting orders the rows that share a branch among themselves. The words are the renderer's own for the same control. */
(function () {
  "use strict";
  var d = document, count = 0;
  var WORDS = {
    en: { open: "Sort and filter", search: "Search", sortBy: "Sort by", original: "Original order", asc: "Ascending",
      desc: "Descending", clear: "Clear", shown: function (n, m) { return n + " of " + m + " shown"; }, nothing: "Nothing matches." },
    fr: { open: "Trier et filtrer", search: "Rechercher", sortBy: "Trier par", original: "Ordre d’origine", asc: "Croissant",
      desc: "Décroissant", clear: "Effacer", shown: function (n, m) { return n + " sur " + m + " affichés"; }, nothing: "Aucun résultat." },
    es: { open: "Ordenar y filtrar", search: "Buscar", sortBy: "Ordenar por", original: "Orden original", asc: "Ascendente",
      desc: "Descendente", clear: "Borrar", shown: function (n, m) { return n + " de " + m + " mostrados"; }, nothing: "No hay coincidencias." }
  };
  var NUMBER = /^[-+]?(\d+(\.\d*)?|\.\d+)(e[-+]?\d+)?$/i;

  function langOf(el) {
    var n = el.closest("[lang]"), l = (n && n.getAttribute("lang")) || d.documentElement.lang || "en";
    return l.toLowerCase().slice(0, 2);
  }
  function freeId(base) {
    var id = base, i = 1;
    while (d.getElementById(id)) id = base + "-" + (++i);
    return id;
  }
  function make(tag, cls, text) {
    var n = d.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* hide or show in place: the attribute is what the stylesheet hides by, the hidden property is for anything that reads it */
  function setOff(el, off) {
    if (el.hasAttribute("data-bk-off") === off) return;
    if (off) el.setAttribute("data-bk-off", "");
    else el.removeAttribute("data-bk-off");
    el.hidden = off;
  }

  function setup(view) {
    var rows = [];
    Array.prototype.forEach.call(view.querySelectorAll("[data-bk-row]"), function (r) {
      if (r.closest("[data-bk-view]") === view) rows.push(r);
    });
    if (rows.length < 2) return;
    var cols = [], items = rows.map(function (el, i) {
      var vals = {}, all = [];
      Array.prototype.forEach.call(el.querySelectorAll("[data-bk-col]"), function (c) {
        var k = c.getAttribute("data-bk-col");
        if (!k || Object.prototype.hasOwnProperty.call(vals, k)) return;
        vals[k] = c.textContent.replace(/\s+/g, " ").trim();
        all.push(vals[k]);
        if (cols.indexOf(k) < 0) cols.push(k);
      });
      /* a row that is the summary of a fold (a nested list) stands for its whole branch: that is what moves and hides */
      var node = el.tagName === "SUMMARY" ? el.parentNode : null;
      var unit = node ? (node.parentNode && node.parentNode.tagName === "LI" ? node.parentNode : node) : el;
      return { el: el, i: i, vals: vals, hay: all.join("\n").toLowerCase(), unit: unit, node: node, up: null, kid: false, show: true };
    });
    if (!cols.length) return;

    var byUnit = new Map(), byNode = new Map(), tree = false;
    items.forEach(function (it) {
      byUnit.set(it.unit, it);
      if (it.node) { byNode.set(it.node, it); tree = true; }
    });
    /* the row a branch hangs from: the nearest fold above it that is itself a row of this view */
    items.forEach(function (it) {
      var p = it.unit.parentNode, f = p && p.closest ? p.closest("details") : null;
      it.up = f && view.contains(f) ? byNode.get(f) || null : null;
    });

    /* a run is rows that sit side by side in one parent with nothing between them. Rows are sorted inside their own run, so
       the rows of a group stay between that group's heading and the next one, and the new order goes in before whatever
       followed the run. Filtering never moves a row: it hides and shows it where it stands. */
    function heading(n) { return !!n && !byUnit.has(n) && n.matches("[role=heading],.bk-grouprow"); }
    var runs = [], seen = new Set();
    items.forEach(function (it) {
      var p = it.unit.parentNode;
      if (seen.has(p)) return;
      seen.add(p);
      var run = null;
      function close() {
        if (!run) return;
        run.end = run.items[run.items.length - 1].unit.nextSibling;
        var prev = run.first.previousElementSibling;
        if (prev) {
          if (heading(prev)) run.lead = prev;
        } else if (p !== view && heading(p.previousElementSibling)) {
          /* the heading is the parent's own neighbour (a tile group): it and the parent go together, and so does a card
             that holds only the two */
          run.lead = p.previousElementSibling;
          run.hold = p;
          var g = p.parentNode;
          if (g && g !== view && g.children.length === 2) run.wrap = g;
        }
        runs.push(run);
        run = null;
      }
      Array.prototype.forEach.call(p.children, function (c) {
        var m = byUnit.get(c);
        if (!m) { close(); return; }
        if (!run) run = { parent: p, items: [], first: c, end: null, lead: null, hold: null, wrap: null };
        run.items.push(m);
      });
      close();
    });

    var W = WORDS[langOf(view)] || WORDS.en;
    var collator = typeof Intl !== "undefined" && Intl.Collator ? new Intl.Collator(langOf(view), { numeric: true, sensitivity: "base" }) : null;
    var key = "", dir = 1, query = "", sortedKey = "", sortedDir = 1, num = false, opened = new Map();

    var barId = freeId("bk-vbar-" + (++count));
    var ctl = make("div", "bk-vctl");
    var top = make("div", "bk-vctl-top");
    var btn = make("button", "bk-vbtn", W.open);
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", barId);
    top.appendChild(btn);
    var bar = make("div", "bk-vbar");
    bar.id = barId;
    bar.hidden = true;
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", W.open);
    var input = make("input", "bk-vq");
    input.type = "search";
    input.setAttribute("aria-label", W.search);
    input.placeholder = W.search;
    input.autocomplete = "off";
    var sel = make("select", "bk-vsel");
    sel.setAttribute("aria-label", W.sortBy);
    var o0 = make("option", null, W.original);
    o0.value = "";
    sel.appendChild(o0);
    cols.forEach(function (c, i) {
      var o = make("option", null, c);
      o.value = String(i);
      sel.appendChild(o);
    });
    var dirBtn = make("button", "bk-vdir", "↑");
    dirBtn.type = "button";
    dirBtn.disabled = true;
    dirBtn.setAttribute("aria-label", W.asc);
    var clear = make("button", "bk-vclear", W.clear);
    clear.type = "button";
    clear.hidden = true;
    bar.appendChild(input);
    bar.appendChild(sel);
    bar.appendChild(dirBtn);
    bar.appendChild(clear);
    var live = make("p", "bk-vlive");
    live.setAttribute("aria-live", "polite");
    ctl.appendChild(top);
    ctl.appendChild(bar);
    ctl.appendChild(live);

    function numeric(k) {
      var any = false;
      for (var i = 0; i < items.length; i++) {
        var v = items[i].vals[k];
        if (v === undefined || v === "") continue;
        if (!NUMBER.test(v)) return false;
        any = true;
      }
      return any;
    }
    function ordered(list) {
      if (!key) return list.slice().sort(function (a, b) { return a.i - b.i; });
      return list.slice().sort(function (a, b) {
        var x = a.vals[key], y = b.vals[key], ex = x === undefined || x === "", ey = y === undefined || y === "";
        if (ex || ey) return ex && ey ? a.i - b.i : ex ? 1 : -1; /* a row with no value comes last either way */
        var c = num ? parseFloat(x) - parseFloat(y) : collator ? collator.compare(x, y) : (x < y ? -1 : x > y ? 1 : 0);
        return (c * dir) || a.i - b.i;
      });
    }
    function paint() {
      var n = 0, i, it;
      if (key !== sortedKey || dir !== sortedDir) {
        num = key ? numeric(key) : false;
        runs.forEach(function (r) {
          ordered(r.items).forEach(function (m) { r.parent.insertBefore(m.unit, r.end); });
        });
        sortedKey = key; sortedDir = dir;
      }
      for (i = 0; i < items.length; i++) {
        it = items[i];
        it.kid = false;
        it.show = !query || it.hay.indexOf(query) >= 0;
        if (it.show) n++;
      }
      if (tree) {
        /* a branch with a row that matches stays, and opens so the match can be seen; a branch with none goes. Folds the
           filter opened go back to how the reader had them once it no longer needs them. */
        for (i = items.length - 1; i >= 0; i--) {
          it = items[i];
          if (it.kid) it.show = true;
          if (it.show && it.up) it.up.kid = true;
        }
        items.forEach(function (m) {
          if (!m.node) return;
          var need = !!query && m.kid;
          if (need && !opened.has(m.node)) { opened.set(m.node, m.node.open); m.node.open = true; }
          else if (!need && opened.has(m.node)) { m.node.open = opened.get(m.node); opened.delete(m.node); }
        });
      }
      for (i = 0; i < items.length; i++) setOff(items[i].unit, !items[i].show);
      runs.forEach(function (r) {
        if (!r.lead) return;
        var any = false;
        for (var j = 0; j < r.items.length; j++) if (r.items[j].show) { any = true; break; }
        setOff(r.lead, !any);
        if (r.hold) setOff(r.hold, !any);
        if (r.wrap) setOff(r.wrap, !any);
      });
      var active = !!query;
      clear.hidden = !(active || key);
      dirBtn.disabled = !key;
      dirBtn.textContent = dir < 0 ? "↓" : "↑";
      dirBtn.setAttribute("aria-label", dir < 0 ? W.desc : W.asc);
      live.textContent = active ? (n ? W.shown(n, items.length) : W.nothing) : "";
    }
    /* typing, the search box's own cross, Escape and a committed change all end here */
    function sync() {
      var q = input.value.trim().toLowerCase();
      if (q === query) return;
      query = q;
      paint();
    }

    btn.addEventListener("click", function () {
      var on = bar.hidden;
      bar.hidden = !on;
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) input.focus();
    });
    ["input", "search", "change"].forEach(function (t) { input.addEventListener(t, sync); });
    sel.addEventListener("change", function () { key = sel.value === "" ? "" : cols[Number(sel.value)]; dir = 1; paint(); });
    dirBtn.addEventListener("click", function () { if (key) { dir = -dir; paint(); } });
    clear.addEventListener("click", function () {
      key = ""; dir = 1; query = ""; input.value = ""; sel.value = "";
      paint();
      input.focus();
    });
    bar.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      /* the first Escape in a search box with words in it empties the box (and so ends the filter); the next closes the bar */
      if (e.target === input && input.value) { e.preventDefault(); input.value = ""; sync(); return; }
      bar.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    });
    view.parentNode.insertBefore(ctl, view);
  }

  function start() {
    var views = d.querySelectorAll("[data-bk-view]");
    for (var i = 0; i < views.length; i++) {
      if (views[i].getAttribute("data-bk-view") === "line") continue;
      setup(views[i]);
    }
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start);
  else start();
})();
