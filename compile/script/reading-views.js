/* Reading helper: sort and filter on a data view.

   The compiler marks a query view's markup for this part (the contract between the compiler's lanes): the container carries
   data-bk-view="table|list|cards|tiles|bars|line", each row inside carries data-bk-row, and each value inside a row
   carries data-bk-col="<column name>" with the value as its text. For every container that has them, this part puts a
   quiet "Sort and filter" button above it that opens a small bar: a search box (rows whose values do not contain the
   words are hidden), a choice of column to sort by with a direction button, and a Clear button. It reorders and hides the
   compiler's own rows and writes no row, no value and no text of the booklet's: every word it adds is its own, and the
   column names are set as text.

   Nothing is saved. A reload starts in the order the rows were written, with every row shown (SPEC section 6: "It is saved
   nowhere, and a file never states it"). A line chart keeps its order (SPEC section 6), so it is left alone, and so is a
   container that has no rows, no values or a single row. Rows are sorted among their own siblings, so a view drawn in
   groups keeps its groups. The words are the renderer's own for the same control. */
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

  function setup(view) {
    var rows = [];
    Array.prototype.forEach.call(view.querySelectorAll("[data-bk-row]"), function (r) {
      if (r.closest("[data-bk-view]") === view) rows.push(r);
    });
    if (rows.length < 2) return;
    var cols = [], items = rows.map(function (el, i) {
      var vals = {};
      Array.prototype.forEach.call(el.querySelectorAll("[data-bk-col]"), function (c) {
        var k = c.getAttribute("data-bk-col");
        if (!k || Object.prototype.hasOwnProperty.call(vals, k)) return;
        vals[k] = c.textContent.replace(/\s+/g, " ").trim();
        if (cols.indexOf(k) < 0) cols.push(k);
      });
      return { el: el, i: i, vals: vals };
    });
    if (!cols.length) return;

    /* rows are sorted among their own siblings; the new order goes in before whatever followed the last of them */
    var groups = [];
    items.forEach(function (it) {
      var p = it.el.parentNode, g = null;
      for (var j = 0; j < groups.length; j++) if (groups[j].parent === p) g = groups[j];
      if (!g) { g = { parent: p, items: [], end: null }; groups.push(g); }
      g.items.push(it);
    });
    groups.forEach(function (g) {
      var last = g.items[g.items.length - 1].el;
      g.end = last.nextSibling;
    });

    var W = WORDS[langOf(view)] || WORDS.en;
    var collator = typeof Intl !== "undefined" && Intl.Collator ? new Intl.Collator(langOf(view), { numeric: true, sensitivity: "base" }) : null;
    var key = "", dir = 1, query = "";

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
      var num = numeric(key);
      return list.slice().sort(function (a, b) {
        var x = a.vals[key], y = b.vals[key], ex = x === undefined || x === "", ey = y === undefined || y === "";
        if (ex || ey) return ex && ey ? a.i - b.i : ex ? 1 : -1; /* a row with no value comes last either way */
        var c = num ? parseFloat(x) - parseFloat(y) : collator ? collator.compare(x, y) : (x < y ? -1 : x > y ? 1 : 0);
        return (c * dir) || a.i - b.i;
      });
    }
    function matches(it) {
      if (!query) return true;
      for (var k in it.vals) if (it.vals[k].toLowerCase().indexOf(query) >= 0) return true;
      return false;
    }
    function paint() {
      var shown = 0;
      groups.forEach(function (g) {
        ordered(g.items).forEach(function (it) { g.parent.insertBefore(it.el, g.end); });
      });
      items.forEach(function (it) {
        var ok = matches(it);
        it.el.hidden = !ok;
        if (ok) shown++;
      });
      var active = !!query;
      clear.hidden = !(active || key);
      dirBtn.disabled = !key;
      dirBtn.textContent = dir < 0 ? "↓" : "↑";
      dirBtn.setAttribute("aria-label", dir < 0 ? W.desc : W.asc);
      live.textContent = active ? (shown ? W.shown(shown, items.length) : W.nothing) : "";
    }

    btn.addEventListener("click", function () {
      var on = bar.hidden;
      bar.hidden = !on;
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) input.focus();
    });
    input.addEventListener("input", function () { query = input.value.trim().toLowerCase(); paint(); });
    sel.addEventListener("change", function () { key = sel.value === "" ? "" : cols[Number(sel.value)]; dir = 1; paint(); });
    dirBtn.addEventListener("click", function () { if (key) { dir = -dir; paint(); } });
    clear.addEventListener("click", function () {
      key = ""; dir = 1; query = ""; input.value = ""; sel.value = "";
      paint();
      input.focus();
    });
    bar.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { bar.hidden = true; btn.setAttribute("aria-expanded", "false"); btn.focus(); }
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
