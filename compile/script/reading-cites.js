/* Reading helper: a citation's note shown where its mark is.

   The compiler writes a citation as a numbered mark that links to its note at the page's foot (<a class="bk-mark-a"
   href="#bk-note-1">). With this part, hovering the mark with a mouse, focusing it with the keyboard, or tapping it on a
   touch screen shows the note in a small box beside the mark, so the reader does not lose the place. The foot's notes
   stay where they are, and the mark is still a link: with a mouse a click goes to the foot as before; on a touch screen
   the first tap shows the note and a second tap on the same mark goes to the foot; from the keyboard the note shows on
   focus and Enter goes to the foot.

   The box is a copy of what the compiler wrote in the note (cloneNode), with its ids and its back link taken out, so
   the page has no second id and no second way back. No text of the booklet's is turned into markup: nothing here
   builds HTML from a string. The box can be dismissed with Escape, stays while the pointer is on it, and is never kept. */
(function () {
  "use strict";
  var d = document;
  var peek = null, current = null, timer = 0, pointer = "", count = 0, queued = false;

  function noteOf(a) {
    var h = a.getAttribute("href");
    if (!h || h.charAt(0) !== "#" || h.length < 2) return null;
    var id = h.slice(1);
    try { id = decodeURIComponent(id); } catch (e) { /* used as written */ }
    return d.getElementById(id);
  }
  function freeId(base) {
    var id = base, i = 1;
    while (d.getElementById(id)) id = base + "-" + (++i);
    return id;
  }
  function markOf(n) { return n && n.closest ? n.closest("a.bk-mark-a") : null; }

  function place() {
    if (!peek || !current) return;
    var r = current.getBoundingClientRect();
    var vw = d.documentElement.clientWidth, vh = d.documentElement.clientHeight;
    /* !important, since the stylesheet sends every property it does not set back to the browser's default, !important */
    peek.style.setProperty("left", "0px", "important");
    peek.style.setProperty("top", "0px", "important");
    var w = peek.offsetWidth, h = peek.offsetHeight;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), Math.max(8, vw - w - 8));
    var below = r.bottom + 8 + h <= vh || r.top - 8 - h < 0;
    peek.style.setProperty("left", Math.round(left) + "px", "important");
    /* a box taller than the room either side keeps to the screen (the stylesheet caps its height and lets it scroll) */
    var top = below ? r.bottom + 8 : r.top - 8 - h;
    top = Math.max(8, Math.min(top, vh - h - 8));
    peek.style.setProperty("top", Math.round(top) + "px", "important");
  }

  function close() {
    clearTimeout(timer);
    if (current) current.removeAttribute("aria-describedby");
    current = null;
    if (peek) peek.hidden = true;
  }

  function open(a) {
    var note = noteOf(a);
    if (!note) return;
    clearTimeout(timer);
    var root = a.closest(".booklet") || d.body;
    if (!peek) {
      peek = d.createElement("div");
      peek.className = "bk-peek";
      peek.id = freeId("bk-peek-" + (++count));
      peek.setAttribute("role", "tooltip");
      peek.hidden = true;
    }
    if (peek.parentNode !== root) root.appendChild(peek);
    if (current && current !== a) current.removeAttribute("aria-describedby");
    var copy = note.cloneNode(true);
    copy.removeAttribute("id");
    Array.prototype.forEach.call(copy.querySelectorAll("[id]"), function (x) { x.removeAttribute("id"); });
    Array.prototype.forEach.call(copy.querySelectorAll(".bk-back"), function (x) { x.parentNode.removeChild(x); });
    while (peek.firstChild) peek.removeChild(peek.firstChild);
    while (copy.firstChild) peek.appendChild(copy.firstChild);
    current = a;
    a.setAttribute("aria-describedby", peek.id);
    peek.hidden = false;
    place();
  }

  function later() {
    clearTimeout(timer);
    timer = setTimeout(close, 250);
  }

  function start() {
    if (!d.querySelector("a.bk-mark-a")) return;
    d.addEventListener("pointerover", function (e) {
      var a = markOf(e.target), inPeek = peek && peek.contains(e.target);
      if (a || inPeek) clearTimeout(timer);
      if (a && e.pointerType === "mouse") open(a);
    });
    d.addEventListener("pointerout", function (e) {
      if (e.pointerType !== "mouse" || !current) return;
      var inside = function (n) { return markOf(n) === current || (peek && n && peek.contains(n)); };
      if (inside(e.target) && !inside(e.relatedTarget)) later();
    });
    d.addEventListener("pointerdown", function (e) {
      pointer = e.pointerType || "";
      if (current && markOf(e.target) !== current && !(peek && peek.contains(e.target))) close();
    }, true);
    d.addEventListener("keydown", function (e) {
      pointer = "";
      if (e.key === "Escape" && current) close();
    });
    d.addEventListener("focusin", function (e) {
      var a = markOf(e.target);
      if (a && pointer !== "touch" && pointer !== "pen") open(a);
    });
    d.addEventListener("focusout", function (e) {
      if (current && markOf(e.target) === current) close();
    });
    d.addEventListener("click", function (e) {
      var a = markOf(e.target), how = pointer;
      pointer = "";
      if (!a) return;
      if ((how === "touch" || how === "pen") && current !== a) { e.preventDefault(); open(a); return; }
      close();
    });
    function again() {
      if (queued || !current) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; place(); });
    }
    window.addEventListener("scroll", again, { passive: true });
    window.addEventListener("resize", again);
    window.addEventListener("hashchange", close);
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start);
  else start();
})();
