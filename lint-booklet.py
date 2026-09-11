#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Ben Armstrong
"""
Lint a booklet file against the booklet-1 spec — the reference validator for
the Booklet format.

A booklet is one portable Markdown file that carries both a person's content
and the *design* of the activities they filled in — which means a preset is
just a booklet with a design and no content. That is the whole point of the
format, and it is also the risk: a malformed template is not a cosmetic
problem, it is an activity that renders wrong or not at all for whoever was
handed it.

A conforming reader refuses a malformed template at load time and falls back
to a known-good booklet, so a bad file cannot brick anyone. This linter exists
so a bad file does not reach anyone in the first place, and so a preset is
known-good before it is shared.

What it checks: the front matter, the sealed record's three layers, and every
structural rule a renderer relies on — known mode kinds, known block types,
unique ids, menus that exist for the lists that name them, sources that name
real map fields, and labels that resolve to something.

Usage:  python3 lint-booklet.py [path ...]
Default (no arguments): every *.md file in presets/, modules/, widgets/, and
examples/ next to this script, skipping any of those directories that don't
exist and skipping readme.md (case-insensitive).
Exit 0 clean, 1 on any error. Warnings never fail the build.
"""
import json, pathlib, re, sys

BASE = pathlib.Path(__file__).resolve().parent

errors, warnings = [], []
def err(f, m):  errors.append(f"{f}: {m}")
def warn(f, m): warnings.append(f"{f}: {m}")

# The renderer's vocabulary. A booklet may only ask for what the page can draw;
# anything else is a design that silently renders as nothing.
MODE_KINDS  = {"entry", "board", "guide", "log"}
PLACEMENTS_D = {"open", "folded", "hidden"}
# `widget` is the live one; bodymap/quadrants are the pre-widget names, still read
BLOCK_TYPES = {"widget", "headlines", "list", "didlog", "group", "text",
               "bodymap", "quadrants", "prose", "image",
               # blocks that only read: they own no entry key and take no answer
               "heading", "deflist", "quote"}
ENGINES = {"svg-regions", "grid-select", "card-board"}
PLACEMENTS  = {"open", "folded", "hidden"}
# the map fields a list block may draw its options from
# A board's fields are whatever that board declares. There is no fixed
# vocabulary: this used to be a hard-coded list of one practice's field names,
# which meant the reference validator refused every board but theirs.
def board_fields(tpl):
    """Every field name any card-board widget in this file holds."""
    out = set()
    def take(card):
        for x in (card.get("lists") or []) + (card.get("prose") or []):
            name = x.get("field") if isinstance(x, dict) else x
            if isinstance(name, str):
                out.add(name)
    for w in (tpl.get("widgets") or []):
        if isinstance(w, dict) and w.get("engine") == "card-board":
            for c in (w.get("cards") or []):
                if isinstance(c, dict):
                    take(c)
    for m in (tpl.get("modules") or []):           # pre-widget files
        for c in (m.get("map") or []):
            if isinstance(c, dict):
                take(c)
    return out
STATUSES = {"draft", "approved"}


def front_matter(text):
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---", 3)
    if end < 0:
        return None, text
    fm = {}
    for line in text[4:end].split("\n"):
        m = re.match(r'^([A-Za-z_][\w-]*):\s*"?(.*?)"?\s*$', line)
        if m:
            fm[m.group(1)] = m.group(2)
    return fm, text[end + 4:]


def blocks_of(text):
    """Every fenced block, parsed on its own — which is the point of the format.
    Returns (blocks, broken): a block that will not parse is counted, never
    allowed to take the rest of the file with it."""
    blocks, broken = [], []
    for m in re.finditer(r"```json\s*\n(.*?)\n```", text, re.S):
        try:
            o = json.loads(m.group(1))
            if isinstance(o, dict):
                blocks.append(o)
        except json.JSONDecodeError as e:
            name = re.search(r'"block"\s*:\s*"([a-z]+)"', m.group(1))
            broken.append((name.group(1) if name else "?", str(e)))
    return blocks, broken


def template_from(blocks):
    """A v6 record has no template block: the booklet is its meta plus its
    modules, which is what makes one module's loss survivable."""
    meta = next((b for b in blocks if b.get("block") == "meta"), None)
    if meta is None:
        return None, None
    mods = [b for b in blocks if b.get("block") == "module"]
    wids = [b for b in blocks if b.get("block") == "widget"]
    tpl = {"id": meta.get("booklet_id"), "version": meta.get("booklet_version"),
           "modules": mods, "widgets": wids}
    # only carried when the booklet actually sets them — an absent key means
    # "use the page's own", which is not the same as an empty one
    for k in ("menus", "body"):
        if meta.get(k) is not None:
            tpl[k] = meta[k]
    return meta, tpl


def check_template(f, tpl):
    """Every rule the renderer relies on, checked before anyone is handed the file."""
    if not isinstance(tpl, dict):
        err(f, "template is not an object")
        return
    # a booklet is a list of modules; each contributes one activity
    mods = tpl.get("modules") or []
    modes = [m.get("mode") for m in mods if isinstance(m, dict) and isinstance(m.get("mode"), dict)]
    modes += [m for m in (tpl.get("modes") or []) if isinstance(m, dict)]
    if not modes and not tpl.get("_widgets_only"):
        err(f, "a booklet needs at least one module with an activity in it")
        return
    # fields modules say up front they draw on from a board elsewhere
    declared_reads = {r for m in (tpl.get("modules") or [])
                      for r in (m.get("reads") or []) if isinstance(r, str)}
    seen_mods = set()
    for m in mods:
        if not isinstance(m, dict) or not isinstance(m.get("id"), str):
            err(f, "every module needs a string id")
            continue
        if m["id"] in seen_mods:
            err(f, f"two modules share the id {m['id']!r} — adding one would silently replace the other")
        seen_mods.add(m["id"])
        if not isinstance(m.get("mode"), dict):
            err(f, f"module {m['id']!r} carries no activity")
        md_ = m.get("display") or {}
        if "order" in md_ and not isinstance(md_["order"], (int, float)):
            err(f, f"module {m['id']!r} has a non-numeric display.order")

    seen_modes = set()
    for m in modes:
        if not isinstance(m, dict) or not isinstance(m.get("id"), str):
            err(f, "every mode needs a string id")
            continue
        mid = m["id"]
        if mid in seen_modes:
            err(f, f"two modes share the id {mid!r}")
        seen_modes.add(mid)
        if m.get("kind") not in MODE_KINDS:
            err(f, f"mode {mid!r} has kind {m.get('kind')!r}, which the renderer cannot draw "
                   f"(known: {', '.join(sorted(MODE_KINDS))})")
        seen_blocks = set()
        for b in (m.get("blocks") or []):
            if not isinstance(b, dict) or not isinstance(b.get("id"), str):
                err(f, f"every block in {mid!r} needs a string id")
                continue
            bid = f"{mid}.{b['id']}"
            if b["id"] in seen_blocks:
                err(f, f"two blocks share the id {bid!r}")
            seen_blocks.add(b["id"])
            btype = b.get("type", "text")
            if btype not in BLOCK_TYPES:
                err(f, f"block {bid!r} has type {btype!r} (known: {', '.join(sorted(BLOCK_TYPES))})")
            place = (b.get("display") or {}).get("placement") or b.get("placement")
            if place and place not in PLACEMENTS:
                err(f, f"block {bid!r} has placement {place!r} (known: {', '.join(sorted(PLACEMENTS))})")
            d = b.get("display") or {}
            if "order" in d and not isinstance(d["order"], (int, float)):
                err(f, f"block {bid!r} has a non-numeric display.order — ordering would fall back to file order")
            if btype == "list":
                # A list draws from a board field. The board may live in another
                # module — the spec calls `reads` soft, not a dependency — so a
                # file carrying no board at all can only be warned about.
                known = board_fields(tpl)
                for s in (b.get("source") or []):
                    if not isinstance(s, str) or not s:
                        err(f, f"block {bid!r} draws from something that is not a field name")
                    elif known and s not in known:
                        err(f, f"block {bid!r} draws from {s!r}, which no board in this file holds "
                               f"(they hold: {', '.join(sorted(known))})")
                    elif not known and s not in declared_reads:
                        # A module that declares `reads` is saying "I draw on a
                        # board that may not be here" — the spec calls that soft,
                        # not a dependency, so it is not worth a warning.
                        warn(f, f"block {bid!r} draws from {s!r}, which no board here holds and "
                                f"no module declares in `reads`")
                if not b.get("copy") and not b.get("label"):
                    err(f, f"list block {bid!r} has neither a copy reference nor its own label, "
                           f"so it would render nameless")
            if btype == "didlog":
                for k in (b.get("of") or []):
                    if k not in seen_blocks:
                        warn(f, f"didlog {bid!r} ticks {k!r}, which is not a block above it in this mode")
            if btype == "widget":
                if not isinstance(b.get("widget"), str):
                    err(f, f"widget block {bid!r} does not name a widget")
                # a read-only widget is shown, not operated: it writes nothing,
                # so naming entry keys would be claiming an answer it never takes
                if b.get("readonly"):
                    if b.get("keys"):
                        err(f, f"widget block {bid!r} is readonly but names entry keys; "
                               f"a widget nobody can touch writes nothing")
                elif not (isinstance(b.get("keys"), list) and b["keys"]):
                    err(f, f"widget block {bid!r} must name the entry keys its engine writes — "
                           f"only the widget knows what shape its answer is")
            if btype in ("text", "headlines"):
                q = b.get("q")
                if not (isinstance(q, list) and len(q) == 2):
                    err(f, f"block {bid!r} of type {btype} must name its question as [scope, key]")
            if place == "folded" and not (b.get("copy") or b.get("label")):
                err(f, f"block {bid!r} is folded but unnamed — a disclosure with no summary "
                       f"is a control nobody can find")

    if "map" in tpl:
        if not isinstance(tpl["map"], list):
            err(f, "template.map must be a list")
        else:
            menus = dict(tpl.get("menus") or {})
            for mm in (tpl.get("modules") or []):
                menus.update((mm or {}).get("menus") or {})
            for c in tpl["map"]:
                if not isinstance(c, dict) or not isinstance(c.get("id"), str):
                    err(f, "every map card needs a string id")
                    continue
                for k in (c.get("lists") or []):
                    if not isinstance(k, str) or not k:
                        err(f, f"map card {c['id']!r} holds something that is not a field name")
                    if menus and k not in menus:
                        warn(f, f"map card {c['id']!r} offers {k!r} with no menu behind it — "
                                f"the card works, but its 'find a new one' card has nothing to suggest")
                for k in (c.get("prose") or []):
                    if not isinstance(k, str) or not k:
                        err(f, f"map card {c['id']!r} holds a prose field that is not a field name")

    # widgets: the data every engine-drawn block depends on
    def named_widgets(blocks, into):
        """Blocks nest — a widget inside a group is still a widget this file
        has to carry, and looking only at the top level misses it."""
        for b in blocks or []:
            if not isinstance(b, dict):
                continue
            if b.get("type") == "widget" and b.get("widget"):
                into.add(b["widget"])
            named_widgets(b.get("blocks"), into)
        return into

    named = set()
    for m in (tpl.get("modules") or []):
        named_widgets(((m.get("mode") or {}).get("blocks") or []), named)
    for m in (tpl.get("modes") or []):
        named_widgets(m.get("blocks") or [], named)
    have = {w.get("id") for w in (tpl.get("widgets") or []) if isinstance(w, dict)}
    for wid in sorted(n for n in named if n and n not in have):
        err(f, f"a block draws with {wid!r}, which this file does not carry — "
               f"hand this booklet to anyone and that activity cannot draw "
               f"(it carries: {', '.join(sorted(x for x in have if x)) or 'nothing'})")
    for w in (tpl.get("widgets") or []):
        if not isinstance(w.get("id"), str):
            err(f, "every widget needs a string id")
            continue
        if w.get("engine") not in ENGINES:
            err(f, f"widget {w['id']!r} names engine {w.get('engine')!r}, which no renderer "
                   f"provides (known: {', '.join(sorted(ENGINES))})")
        if w.get("engine") == "svg-regions":
            figs = w.get("figures") or []
            if not figs:
                err(f, f"widget {w['id']!r} draws with svg-regions but has no figures")
            for fig in figs:
                if "<svg" not in (fig.get("svg") or ""):
                    err(f, f"widget {w['id']!r}: figure {fig.get('id')!r} carries no SVG")
                unknown = [r for r in (fig.get("regions") or [])
                           if r not in {x.get("id") for x in (w.get("regions") or [])}]
                if unknown:
                    err(f, f"widget {w['id']!r}: figure {fig.get('id')!r} lists regions with no "
                           f"label — {', '.join(unknown)}")
        if w.get("engine") == "card-board":
            cards = w.get("cards") or []
            if not cards:
                err(f, f"widget {w['id']!r} draws with card-board but has no cards")
            seen_c, seen_f = set(), set()
            for c in cards:
                if not isinstance(c.get("id"), str):
                    err(f, f"widget {w['id']!r}: every card needs a string id")
                    continue
                if c["id"] in seen_c:
                    err(f, f"widget {w['id']!r}: two cards share the id {c['id']!r}")
                seen_c.add(c["id"])
                fields = [(x.get("field") if isinstance(x, dict) else x)
                          for x in (c.get("lists") or []) + (c.get("prose") or [])]
                if not fields:
                    warn(f, f"widget {w['id']!r}: card {c['id']!r} holds no fields, so it "
                            f"has nothing to show")
                for fld in fields:
                    if not isinstance(fld, str) or not fld:
                        err(f, f"widget {w['id']!r}: card {c['id']!r} holds something that is "
                               f"not a field name")
                    elif fld in seen_f:
                        err(f, f"widget {w['id']!r}: two cards both hold {fld!r} — a field is "
                               f"an address, and two cards writing to one is a collision")
                    else:
                        seen_f.add(fld)
                for lst in (c.get("lists") or []):
                    fld = lst.get("field") if isinstance(lst, dict) else lst
                    if (w.get("menus") or {}) and fld not in (w.get("menus") or {}):
                        warn(f, f"widget {w['id']!r}: card {c['id']!r} offers {fld!r} with no "
                                f"menu behind it — its explore card has nothing to suggest")

        if w.get("engine") == "grid-select":
            cells = {c.get("id") for c in (w.get("cells") or [])}
            if not cells:
                err(f, f"widget {w['id']!r} draws with grid-select but has no cells")
            for it in (w.get("items") or []):
                if it.get("cell") not in cells:
                    err(f, f"widget {w['id']!r}: item {it.get('id')!r} sits in cell "
                           f"{it.get('cell')!r}, which does not exist")

    if "menus" in tpl and not isinstance(tpl["menus"], dict):
        err(f, "template.menus must be an object of named lists")
    for name, items in (tpl.get("menus") or {}).items():
        if not isinstance(items, list) or not all(isinstance(x, str) for x in items):
            err(f, f"menu {name!r} must be a list of strings")

    body = tpl.get("body")
    if body is not None:
        if not (isinstance(body, dict) and isinstance(body.get("front"), list)
                and isinstance(body.get("back"), list)):
            err(f, "template.body must name a front and a back region list")
        elif "jaw" in (body.get("back") or []):
            warn(f, "the back figure lists a jaw, which a view from behind cannot show")


def check_preset_rules(f, fm, blocks):
    """A preset is a clinical artefact: it decides what a person is asked to do."""
    status = (fm or {}).get("status", "")
    if status not in STATUSES:
        err(f, f"a preset needs `status: draft` or `status: approved` in its front matter (found {status!r})")
    elif status == "draft":
        warn(f, "draft — not for distribution until it is approved")

    fields = next((b.get("fields") or {} for b in blocks if b.get("block") == "fields"), {})
    if any(v for v in fields.values()):
        err(f, "a preset must ship empty: this one carries content in its fields block")
    for b in blocks:
        if b.get("block") == "entries" and b.get("items"):
            err(f, f"a preset must ship empty: its {b.get('mode')!r} entries block has content")
        if b.get("block") == "board" and (b.get("archive") or (b.get("now") or {}).get("items")):
            err(f, "a preset must ship empty: its board block has content")
        if b.get("block") == "person" and (b.get("name") or b.get("email")):
            err(f, "a preset must ship empty: it carries a name or an email address")


def check_module_file(f, fm, blocks, broken):
    """A module file is not a booklet: it is one activity, ready to be pasted
    into somebody's booklet or added in the page. It carries the module block
    and nothing else."""
    for name, why in broken:
        err(f, f"the {name!r} block is not valid JSON — {why}")
    mods = [b for b in blocks if b.get("block") == "module"]
    if len(mods) != 1:
        err(f, f"a module file carries exactly one module block (found {len(mods)})")
        return
    mod = mods[0]
    if fm.get("module") and mod.get("id") != fm["module"]:
        err(f, f"front matter says {fm['module']!r} but the block says {mod.get('id')!r} — "
               f"the id is the address for adding and replacing, so they must agree")
    if not fm.get("version"):
        warn(f, "front matter names no version")
    if fm.get("status") not in STATUSES:
        err(f, f"a module needs `status: draft` or `status: approved` (found {fm.get('status')!r})")
    elif fm.get("status") == "draft":
        warn(f, "draft — not for distribution until it is approved")
    # a module is checked with the same rules a booklet's modules get
    shell = {"modules": [mod], "widgets": mod.get("widgets") or []}
    if mod.get("menus") is not None:
        shell["menus"] = mod["menus"]
    check_template(f, shell)
    body = path_text_of(f)
    if body and "```json" in body and "Adding it to a booklet" not in body:
        warn(f, "no instructions for adding it — a module file people are handed "
                "should say how to paste it in")


_TEXT = {}
def path_text_of(f):
    return _TEXT.get(str(f))


def check_widget_file(f, fm, blocks, broken):
    """A widget file is one widget: the data an engine draws with, ready to ride
    in a booklet. It carries no activity and nobody's content."""
    for name, why in broken:
        err(f, f"the {name!r} block is not valid JSON — {why}")
    wids = [b for b in blocks if b.get("block") == "widget"]
    if len(wids) != 1:
        err(f, f"a widget file carries exactly one widget block (found {len(wids)})")
        return
    w = wids[0]
    if fm.get("widget") and w.get("id") != fm["widget"]:
        err(f, f"front matter says {fm['widget']!r} but the block says {w.get('id')!r}")
    if fm.get("engine") and w.get("engine") != fm["engine"]:
        err(f, f"front matter says engine {fm['engine']!r} but the block says {w.get('engine')!r}")
    if fm.get("status") not in STATUSES:
        err(f, f"a widget needs `status: draft` or `status: approved` (found {fm.get('status')!r})")
    elif fm.get("status") == "draft":
        warn(f, "draft — not for distribution until it is approved")
    # a widget's words are what a reader sees, so both languages or neither
    def labels(o):
        out = []
        if isinstance(o, dict):
            if "label" in o or "title" in o:
                out.append(o.get("label") or o.get("title"))
            for v in o.values():
                out += labels(v)
        elif isinstance(o, list):
            for v in o:
                out += labels(v)
        return out
    half = [l for l in labels(w) if isinstance(l, dict) and bool(l.get("en")) != bool(l.get("fr"))]
    if half:
        warn(f, f"{len(half)} label(s) carry one language but not the other")
    check_template(f, {"modules": [], "widgets": [w], "_widgets_only": True})


def check_file(path):
    # a path outside the repo is a normal thing to lint (a file someone was
    # handed, a temp copy), so name it plainly rather than insisting on a
    # repo-relative one
    try:
        f = path.relative_to(BASE)
    except ValueError:
        f = path
    text = path.read_text(encoding="utf-8")
    _TEXT[str(f)] = text
    fm, body = front_matter(text)

    # a module file declares `module:` instead of `booklet:` — different thing,
    # different rules
    if fm and fm.get("widget") and not fm.get("booklet"):
        blocks, broken = blocks_of(text)
        check_widget_file(f, fm, blocks, broken)
        return

    if fm and fm.get("module") and not fm.get("booklet"):
        blocks, broken = blocks_of(text)
        check_module_file(f, fm, blocks, broken)
        return

    if fm is None:
        err(f, "no front matter — a booklet opens with a `---` block on line 1")
    else:
        if fm.get("booklet") != "1":
            err(f, f"front matter must say `booklet: 1` (found {fm.get('booklet')!r})")
        if fm.get("lang") not in ("en", "fr"):
            err(f, f"front matter needs `lang: en` or `lang: fr` (found {fm.get('lang')!r})")
        if not fm.get("preset"):
            warn(f, "front matter has no `preset:` line naming the design")

    if fm and fm.get("encrypted") == "true":
        warn(f, "encrypted booklet — nothing to lint inside it, which is the point")
        return

    blocks, broken = blocks_of(text)
    for name, why in broken:
        err(f, f"the {name!r} block is not valid JSON — {why}. "
               f"The page would load the file without it; fix or remove that block.")
    if not blocks:
        err(f, "no record: a booklet carries at least a meta block")
        return

    meta, tpl = template_from(blocks)
    if meta is None:
        err(f, "no meta block, so nothing says what booklet this is")
        return
    app = meta.get("app")
    if not isinstance(app, str) or not app.strip():
        err(f, "the meta block has no `app`, so nothing records which application "
               "wrote this file. Any name is valid; an absent one is not.")
    if int(meta.get("v", 0)) < 6:
        err(f, f"record v{meta.get('v')} predates the per-block format; open and re-save it")

    kinds = {b.get("block") for b in blocks}
    if "format" not in kinds:
        warn(f, "no format block — the file no longer explains itself, so anyone "
                "handed it needs the spec separately. Open and re-save it.")
    for needed in ("meta", "person"):
        if needed not in kinds:
            err(f, f"the record has no {needed!r} block")

    check_template(f, tpl)
    check_preset_rules(f, fm, blocks)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if args:
        paths = [pathlib.Path(a).resolve() for a in args]
    else:
        # every booklet in the repo's standard directories, but not the prose
        # that documents them; a directory that doesn't exist is skipped
        paths = sorted(x for d in ("presets", "modules", "widgets", "examples")
                       if (BASE / d).is_dir()
                       for x in (BASE / d).glob("*.md")
                       if x.name.lower() != "readme.md")
    if not paths:
        print("no booklet files to check")
        return 0
    for p in paths:
        if not p.exists():
            err(p, "no such file")
            continue
        check_file(p)

    for w in warnings:
        print(f"warn  {w}")
    for e in errors:
        print(f"ERROR {e}")
    n = len(paths)
    print(f"\n{n} booklet file{'' if n == 1 else 's'} checked · "
          f"{len(errors)} error{'' if len(errors) == 1 else 's'} · "
          f"{len(warnings)} warning{'' if len(warnings) == 1 else 's'}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
