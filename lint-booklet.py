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
unique ids (blocks nested in groups included), menus that exist for the lists
that name them, sources that name real map fields, labels that resolve to
something, question wording that resolves in every language on offer, and no
script in a widget's SVG.

Usage:  python3 lint-booklet.py [--registry] [path ...]
Default (no arguments): every *.md file in presets/, modules/, widgets/, and
examples/ next to this script, skipping any of those directories that don't
exist and skipping readme.md (case-insensitive).
The files under modules/ and widgets/ here are this repository's registry
content, set up in en, fr and es: a per-language value missing one of them is
a warning. `--registry` holds every file named to that rule, wherever it is.
Exit 0 clean, 1 on any error. Warnings never fail the build.
"""
import html, json, pathlib, re, sys

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
               "heading", "deflist", "quote", "callout", "sources"}
ENGINES = {"svg-regions", "grid-select", "card-board"}
PLACEMENTS  = {"open", "folded", "hidden"}

# Script in a figure's SVG: an on* event handler, a <script> element, or a
# javascript:/vbscript: URL. A reader removes all of it before drawing (SPEC.md,
# "A widget"), so this is the same guarantee caught earlier, before the file is
# shared. It is an error rather than a warning because a figure never needs
# any of it, the file would not draw as written, and warnings never fail the
# build that guards this registry. A URL is looked for the way a browser reads
# one: entities decoded, control characters and spaces ignored.
SVG_HANDLER = re.compile(r"""(?:^|[\s"'/])(on[a-z][\w:.-]*)\s*=""", re.I)
SVG_SCRIPT_TAG = re.compile(r"<script[\s/>]", re.I)
SVG_SCRIPT_URL = re.compile(r"(javascript|vbscript):", re.I)
def svg_script_in(svg):
    """What in this SVG text would run as script, in words; empty if nothing."""
    if not isinstance(svg, str):
        return []
    found = []
    handlers = sorted({m.group(1).lower() for m in SVG_HANDLER.finditer(svg)})
    if handlers:
        found.append("event handler " + ", ".join(handlers))
    if SVG_SCRIPT_TAG.search(svg):
        found.append("a <script> element")
    url = SVG_SCRIPT_URL.search(re.sub(r"[\x00-\x20]", "", html.unescape(svg)))
    if url:
        found.append(f"a {url.group(1).lower()}: URL")
    return found
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
# What a board or a guide keeps goes in the file's `fields` block, under the key
# each block owns. These are the names the person's own record uses: an older
# reader keeps a board answer loose in that record, where a block called `note`
# or `today` wrote over the person's own note or entries, and the current one
# leaves such an answer where it found it. `__proto__` cannot be a key at all.
RECORD_KEYS = {"big", "goodday", "now", "areas", "archive", "q", "emo", "prefs", "setup",
               "person", "page", "today", "checkins", "entries", "mode", "name", "note",
               "__proto__"}
BUILTIN_ACTIVITIES = ("today", "checkin")     # the two whose drafts sit at the top of the drafts block

# Languages. The reference renderer has interface tables for English, Spanish
# and French; `es-AR` is a small layer over `es`. A booklet or module may carry
# its wording in ANY SUBSET of them, Spanish-only included, and a booklet may
# declare the languages it offers (`languages`). A tag is a supported language,
# optionally with a region: `es`, `es-AR`, `es-419`, `fr-CA`. Anything else is a
# language the renderer cannot draw an interface for, so it is refused.
LANGS = ("en", "es", "fr")
LANG_TAG = re.compile(r"^(en|es|fr)(-([A-Z]{2}|[0-9]{3}))?$")
# a key that looks like a language tag at all, however wrong
LANG_LIKE = re.compile(r"^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$")
# fields that hold one value per language: `{en: "...", es: "..."}`
LOC_KEYS = {"title", "blurb", "label", "text", "hint", "body", "description"}
# fields that hold one WHOLE OBJECT of wording per language
COPY_KEYS = {"copy", "notes", "protocols"}

# This repository's own registry content, the files under modules/ and widgets/
# beside this script, is set up in all three languages. That is a rule of this
# registry, not of the format: a booklet or a module anywhere else may carry any
# subset, one language included. So it is a warning, never an error, and it is
# checked only for those files, or for every file when `--registry` is given.
REGISTRY_LANGS = ("en", "fr", "es")
REGISTRY_DIRS = ("modules", "widgets")
REGISTRY_ALL = False                            # set by --registry


def lang_problem(tag):
    """Why a language tag is not usable, or None."""
    if not isinstance(tag, str) or not LANG_LIKE.match(tag):
        return f"{tag!r} is not a language tag"
    if LANG_TAG.match(tag):
        return None
    if tag.split("-")[0].lower() in LANGS:
        return (f"{tag!r} is not spelled the way a tag is: lowercase language, "
                f"uppercase region (es-AR)")
    return (f"{tag!r} is a language the renderer has no interface table for "
            f"(supported: {', '.join(LANGS)}, and es-AR as a layer over es)")


def parse_languages(value):
    """A `languages` declaration as a list of tags: a JSON list, or the
    front-matter form `es-AR, en`."""
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [x for x in re.split(r"[,\s]+", value.strip("[] ")) if x]
    return None


def walk_languages(f, obj, where, used):
    """Check every language-keyed slot under obj. `used` collects, per slot, the
    tags it carries, so a declaration can be compared with what is written."""
    if isinstance(obj, list):
        for i, v in enumerate(obj):
            walk_languages(f, v, f"{where}[{i}]", used)
        return
    if not isinstance(obj, dict):
        return
    for k, v in obj.items():
        here = f"{where}.{k}" if where else k
        if isinstance(v, dict) and (k in LOC_KEYS or k in COPY_KEYS):
            tags = list(v.keys())
            if tags and all(LANG_LIKE.match(t) for t in tags):
                bad = False
                for t in tags:
                    why = lang_problem(t)
                    if why:
                        err(f, f"{here}: {why}")
                        bad = True
                if not bad:
                    used.append((here, set(tags)))
                if k in COPY_KEYS:
                    walk_languages(f, v, here, used)
                continue
        walk_languages(f, v, here, used)


def check_languages(f, fm, blocks):
    """Language rules for every kind of file: the front matter, a declared
    `languages` list, and every language-keyed slot in the record."""
    declared = None
    if fm is not None and fm.get("languages"):
        declared = parse_languages(fm["languages"])
    for b in blocks:
        if b.get("block") == "meta" and b.get("languages") is not None:
            declared = parse_languages(b["languages"])
    if declared is not None:
        if not declared:
            err(f, "`languages` is empty: name the languages the booklet offers, or leave it out")
        for t in declared:
            why = lang_problem(t)
            if why:
                err(f, f"languages: {why}")
        if len(declared) != len(set(declared)):
            err(f, "languages: a language is named twice")
    used = []
    for b in blocks:
        # the format block documents the format and is not a booklet's wording
        if b.get("block") == "format":
            continue
        name = b.get("block", "?") + (f" {b['id']}" if isinstance(b.get("id"), str) else "")
        walk_languages(f, b, name, used)
    if declared:
        want = {t for t in declared if not lang_problem(t)}
        # a declared es-AR is served by an `es` slot, the way the renderer chains it
        def served(tag, have):
            return tag in have or tag.split("-")[0] in have
        short = [w for w, have in used if not all(served(t, have) for t in want)]
        if short:
            warn(f, f"{len(short)} wording slot(s) lack one of the declared languages "
                    f"({', '.join(sorted(want))}); the renderer will show nothing there "
                    f"for that language. First: {short[0]}")


def is_registry_file(path):
    """A module or widget file this repository ships: directly under modules/ or
    widgets/ beside this script. Test fixtures and examples are not."""
    try:
        rel = path.resolve().relative_to(BASE)
    except ValueError:
        return False
    return len(rel.parts) == 2 and rel.parts[0] in REGISTRY_DIRS


def lang_slots(obj, where, out):
    """Every per-language value under obj: an object whose keys are all language
    tags (`{en: …, fr: …}`, or a `copy` bag `{en: {…}, fr: {…}}`), with where it is."""
    if isinstance(obj, list):
        for i, v in enumerate(obj):
            lang_slots(v, f"{where}[{i}]", out)
        return out
    if not isinstance(obj, dict):
        return out
    if obj and all(isinstance(k, str) and LANG_TAG.match(k) for k in obj):
        out.append((where, obj))
        return out
    for k, v in obj.items():
        lang_slots(v, f"{where}.{k}" if where else k, out)
    return out


def wording_leaves(v, p=""):
    """The paths of every non-blank piece of wording inside one language's value:
    '' for a string, `journal.f.day[1]` inside a `copy` bag."""
    if isinstance(v, str):
        return {p} if v.strip() else set()
    out = set()
    if isinstance(v, list):
        for i, x in enumerate(v):
            out |= wording_leaves(x, f"{p}[{i}]")
    elif isinstance(v, dict):
        for k, x in v.items():
            out |= wording_leaves(x, f"{p}.{k}" if p else k)
    return out


def check_registry_languages(f, blocks):
    """Registry content is set up in en, fr and es: every per-language value
    carries all three, and a `copy` bag words in each language everything it
    words in any. One warning per missing language, naming the places."""
    missing = {t: [] for t in REGISTRY_LANGS}
    for b in blocks:
        name = b.get("block", "?") + (f" {b['id']}" if isinstance(b.get("id"), str) else "")
        for where, slot in lang_slots(b, "", []):
            have = {t: wording_leaves(v) for t, v in slot.items()}
            every = set().union(*have.values())
            if not every:
                continue                              # worded in no language at all
            for t in REGISTRY_LANGS:
                if not have.get(t):
                    missing[t].append(f"{name}: {where}")
                else:
                    missing[t] += [f"{name}: {where}.{t}.{leaf}" for leaf in sorted(every - have[t])]
    for t, places in missing.items():
        if places:
            more = f" (and {len(places) - 3} more)" if len(places) > 3 else ""
            warn(f, f"registry languages: {len(places)} per-language value(s) have no {t!r}; "
                    f"this repository's modules and widgets are set up in "
                    f"{', '.join(REGISTRY_LANGS[:-1])} and {REGISTRY_LANGS[-1]}. Add {t!r} at: "
                    f"{'; '.join(places[:3])}{more}")


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
    for k in ("menus", "body", "languages"):
        if meta.get(k) is not None:
            tpl[k] = meta[k]
    return meta, tpl


def check_template(f, tpl):
    """Every rule the renderer relies on, checked before anyone is handed the file."""
    if not isinstance(tpl, dict):
        err(f, "template is not an object")
        return
    # a booklet is a list of modules; each holds one activity in `mode` or
    # several in `activities`. Every activity is kept with the module holding it
    # (its id and its position, since two modules may wrongly share an id), so
    # a clash can name both sides.
    mods = tpl.get("modules") or []
    owned = [(a, (m.get("id"), i)) for i, m in enumerate(mods) for a in activities_of(m)]
    owned += [(a, None) for a in (tpl.get("modes") or []) if isinstance(a, dict)]
    modes = [a for a, _ in owned]
    owner_module = {id(a): m for m in mods if isinstance(m, dict) for a in activities_of(m)}
    if not modes and not tpl.get("_widgets_only"):
        err(f, "a booklet needs at least one module with an activity in it")
        for m in mods:
            if isinstance(m, dict) and "modes" in m and not isinstance(m.get("mode"), dict):
                err(f, retired_modes(m.get("id")))
        return
    # fields modules say up front they draw on from a board elsewhere
    declared_reads = {r for m in (tpl.get("modules") or [])
                      for r in (m.get("reads") or []) if isinstance(r, str)}
    # A module may declare whose it is. It lives in the module BLOCK rather
    # than in a file's front matter because front matter is discarded the
    # moment a module is pasted into a booklet — and the content travels, so
    # the terms have to travel with it.
    for m in (tpl.get("modules") or []):
        r = m.get("rights")
        if r is None:
            continue
        if not isinstance(r, dict):
            err(f, f"module {m.get('id')!r}: `rights` must be an object")
            continue
        for k in ("copyright", "license", "source"):
            if k in r and not (isinstance(r[k], str) and r[k].strip()):
                err(f, f"module {m.get('id')!r}: rights.{k} must be a non-empty string")
        if r.get("license") and not r.get("copyright"):
            warn(f, f"module {m.get('id')!r} states terms but no copyright holder — "
                    f"a licence with nobody granting it is not much of a grant")
    seen_mods = set()
    for m in mods:
        if not isinstance(m, dict) or not isinstance(m.get("id"), str):
            err(f, "every module needs a string id")
            continue
        if m["id"] in seen_mods:
            err(f, f"two modules share the id {m['id']!r} — adding one would silently replace the other")
        seen_mods.add(m["id"])
        if "mode" in m and "activities" in m:
            err(f, f"module {m['id']!r} carries both `mode` and `activities` — a module holds "
                   f"one activity in `mode` or several in `activities`, never both, and a "
                   f"renderer refuses it")
        elif "activities" in m:
            acts = m["activities"]
            if not (isinstance(acts, list) and acts and all(isinstance(a, dict) for a in acts)):
                err(f, f"module {m['id']!r}: `activities` must be a non-empty list of activities")
            elif len(acts) == 1:
                warn(f, f"module {m['id']!r} holds its one activity in `activities` — write it "
                        f"as `mode`, which renderers older than `activities` can still read")
            else:
                for a in acts:
                    head = a.get("head") or {}
                    if not (a.get("title") or head.get("title") or head.get("h")):
                        warn(f, f"activity {a.get('id')!r} in module {m['id']!r} has no title, "
                                f"so its module's page can only call it by its id")
        elif "modes" in m and not isinstance(m.get("mode"), dict):
            err(f, retired_modes(m["id"]))
        elif not isinstance(m.get("mode"), dict):
            err(f, f"module {m['id']!r} carries no activity")
        if "modes" in m and isinstance(m.get("mode"), dict):
            warn(f, f"module {m['id']!r} carries `modes` beside its `mode`; nothing reads "
                    f"`modes` (several activities go in `activities`)")
        md_ = m.get("display") or {}
        if "order" in md_ and not isinstance(md_["order"], (int, float)):
            err(f, f"module {m['id']!r} has a non-numeric display.order")
        if "menus" in m:
            check_menus(f, m["menus"], f"module {m['id']!r}", offered=offered_by(m, tpl))
        check_reading(f, m)

    # Activity ids are unique across the whole booklet, whichever module holds
    # them: entries, drafts and views are keyed by the id alone.
    card_fields = board_fields(tpl)
    seen_modes = {}
    for m, owner in owned:
        if not isinstance(m, dict) or not isinstance(m.get("id"), str):
            err(f, "every mode needs a string id")
            continue
        mid = m["id"]
        if mid in seen_modes:
            first = seen_modes[mid]
            if owner and first and owner == first:
                err(f, f"module {owner[0]!r} has two activities called {mid!r}")
            elif owner and first and owner[0] != first[0]:
                err(f, f"activity {mid!r} is in both module {first[0]!r} and module "
                       f"{owner[0]!r} — an activity id is the address of its entries, so two "
                       f"modules cannot share one, and a renderer refuses the second")
            else:
                err(f, f"two modes share the id {mid!r}")
        seen_modes.setdefault(mid, owner)
        if m.get("kind") not in MODE_KINDS:
            err(f, f"mode {mid!r} has kind {m.get('kind')!r}, which the renderer cannot draw "
                   f"(known: {', '.join(sorted(MODE_KINDS))})")
        md = m.get("display")
        if isinstance(md, dict) and "order" in md and not isinstance(md["order"], (int, float)):
            err(f, f"activity {mid!r} has a non-numeric display.order")
        check_pages(f, m, mid)
        # Every block of the activity, on whichever page and however deeply a
        # `group` (or a callout) nests it: block ids are unique across all of it,
        # and so is every answer field a block owns, because entries and drafts
        # are keyed by the activity and the field, never by the page.
        seen_blocks = {}
        field_page = {}
        for page, b, trail in walk_activity(m):
            here = block_place(page, trail)
            if not isinstance(b, dict) or not isinstance(b.get("id"), str):
                err(f, f"every block in {mid!r} needs a string id ({here})")
                continue
            bid = f"{mid}.{b['id']}"
            if b["id"] in seen_blocks:
                err(f, f"two blocks share the id {bid!r}: first {seen_blocks[b['id']]}, "
                       f"again {here}"
                       + (" (block ids are unique across all of an activity's pages, and "
                          "across its groups)" if page or trail else
                          " (block ids are unique across the whole activity, groups included)"))
            else:
                seen_blocks[b["id"]] = here
            if page is not None and not trail:
                for k in owned_keys(b):
                    first = field_page.setdefault(k, page)
                    if first != page:
                        err(f, f"activity {mid!r}: the answer field {k!r} is on page {first!r} and on "
                               f"page {page!r} — pages are layout, answers are keyed by field, so a "
                               f"field can be on one page only, and a renderer refuses the module")
            btype = b.get("type", "text")
            if btype not in BLOCK_TYPES:
                err(f, f"block {bid!r} has type {btype!r} (known: {', '.join(sorted(BLOCK_TYPES))})")
            place = (b.get("display") or {}).get("placement") or b.get("placement")
            if place and place not in PLACEMENTS:
                err(f, f"block {bid!r} has placement {place!r} (known: {', '.join(sorted(PLACEMENTS))})")
            d = b.get("display") or {}
            if "order" in d and not isinstance(d["order"], (int, float)):
                err(f, f"block {bid!r} has a non-numeric display.order — ordering would fall back to file order")
            check_block_needs(f, b, bid, btype)
            if m.get("kind") in ("board", "guide") and not isinstance(b.get("blocks"), list):
                for k in owned_keys(b):
                    if k in RECORD_KEYS:
                        warn(f, f"{m['kind']} activity {mid!r}: block {bid!r} keeps its answer under the key "
                                f"{k!r}, which the person's own record uses. A current reader keeps it in "
                                f"`fields`, but an older one writes it over the person's own {k!r}. "
                                f"Give the block another id, or another `keys` entry")
                    elif k in card_fields:
                        warn(f, f"{m['kind']} activity {mid!r}: block {bid!r} keeps its answer under the key "
                                f"{k!r}, which a card-board widget in this file already holds. Both write "
                                f"`fields.{k}`, so the answer and the cards would overwrite each other. "
                                f"Give the block another id, or another `keys` entry")
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
                of = b.get("of")
                if of is not None and not (isinstance(of, list) and all(isinstance(k, str) for k in of)):
                    err(f, f"didlog {bid!r}: `of` must be a list of block ids")
                else:
                    for k in (of or []):
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
                if not (isinstance(q, list) and len(q) == 2
                        and all(isinstance(x, str) and x for x in q)):
                    err(f, f"block {bid!r} of type {btype} must name its question as [scope, key]")
            if place == "folded" and not (b.get("copy") or b.get("label")):
                err(f, f"block {bid!r} is folded but unnamed — a disclosure with no summary "
                       f"is a control nobody can find")
            home = owner_module.get(id(m))
            if home is not None:
                check_wording(f, b, bid, btype, place, home, mods, tpl)

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
        for a in activities_of(m):
            named_widgets([b for _, b in activity_blocks(a)], named)
    for m in (tpl.get("modes") or []):
        if isinstance(m, dict):
            named_widgets([b for _, b in activity_blocks(m)], named)
    have = {w.get("id") for w in (tpl.get("widgets") or []) if isinstance(w, dict)}
    for wid in sorted(n for n in named if n and n not in have):
        err(f, f"a block draws with {wid!r}, which this file does not carry — "
               f"hand this booklet to anyone and that activity cannot draw "
               f"(it carries: {', '.join(sorted(x for x in have if x)) or 'nothing'})")
    for w in (tpl.get("widgets") or []):
        if not isinstance(w.get("id"), str):
            err(f, "every widget needs a string id")
            continue
        if "menus" in w:
            check_menus(f, w["menus"], f"widget {w['id']!r}", offered=offered_by(w, tpl))
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
                script = svg_script_in(fig.get("svg"))
                if script:
                    err(f, f"widget {w['id']!r}: figure {fig.get('id')!r} carries script "
                           f"({'; '.join(script)}). A figure is a drawing and never needs it, "
                           f"and a reader removes it before drawing, so the figure would not "
                           f"draw as written")
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

    # a module file's shell borrows its module's menus, already checked above
    if not any(isinstance(m, dict) and m.get("menus") is tpl.get("menus") for m in mods) \
            or tpl.get("menus") is None:
        declared = tpl.get("languages")
        check_menus(f, tpl.get("menus"), "template", key="menus",
                    offered=([t for t in declared if isinstance(t, str) and not lang_problem(t)],
                             "the booklet declares") if isinstance(declared, list) and declared else None)

    body = tpl.get("body")
    if body is not None:
        if not (isinstance(body, dict) and isinstance(body.get("front"), list)
                and isinstance(body.get("back"), list)):
            err(f, "template.body must name a front and a back region list")
        elif "jaw" in (body.get("back") or []):
            warn(f, "the back figure lists a jaw, which a view from behind cannot show")


# Reading material: a module's `sources` and `citations` registries, the
# citation marks `[^id]` in its reading text, and the `callout` and `sources`
# blocks. A renderer only displays whether a citation was verified, so nothing
# here checks a quote against a source either; it checks that every mark,
# citation and source points at something that is there.
CALLOUT_KINDS = ("diff", "law", "opinion")
SOURCE_KINDS = ("primary", "secondary", "law", "case")
CITE_MARK = re.compile(r"\[\^([A-Za-z0-9][A-Za-z0-9_.:-]*)\]")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def loc_values(v):
    """Every string a value holds: itself, or one per language."""
    if isinstance(v, str):
        return [v]
    if isinstance(v, dict):
        return [x for x in v.values() if isinstance(x, str)]
    return []


def marked_texts(b):
    """Every text of a block that may carry citation marks, the blocks nested
    in a group or a callout included. A heading carries none."""
    if not isinstance(b, dict):
        return []
    t = b.get("type", "text")
    out = []
    if t in ("prose", "quote", "callout"):
        out += loc_values(b.get("text"))
    if t == "deflist":
        for it in (b.get("items") or []):
            if isinstance(it, dict):
                out += loc_values(it.get("label")) + loc_values(it.get("body"))
    if t in ("group", "callout") and isinstance(b.get("blocks"), list):
        for x in b["blocks"]:
            out += marked_texts(x)
    return out


def nested(blocks):
    """Each block and every block nested inside it."""
    for b in blocks:
        if isinstance(b, dict):
            yield b
            if isinstance(b.get("blocks"), list):
                yield from nested(b["blocks"])


def link_ok(u):
    """A renderer links only http(s) or a relative address, never another scheme."""
    if not isinstance(u, str):
        return False
    v = re.sub(r"[\x00-\x20\x7f]", "", u)
    return bool(v) and (bool(re.match(r"^https?://", v, re.I)) or not re.match(r"^[a-z][a-z0-9+.-]*:", v, re.I))


def check_reading(f, m):
    mid = m.get("id")
    keys, ids = set(), set()
    srcs = m.get("sources")
    if srcs is not None and not isinstance(srcs, list):
        err(f, f"module {mid!r}: `sources` must be a list of sources")
    for i, s in enumerate(srcs if isinstance(srcs, list) else [], 1):
        if not isinstance(s, dict):
            err(f, f"module {mid!r}: source {i} is not an object")
            continue
        k = s.get("key")
        if not (isinstance(k, str) and k):
            err(f, f"module {mid!r}: source {i} needs a string `key`")
            k = f"#{i}"
        elif k in keys:
            err(f, f"module {mid!r}: two sources share the key {k!r} — a citation names its "
                   f"source by key, so a key can mean one source only")
        keys.add(k)
        if not is_named(s.get("title")):
            err(f, f"module {mid!r}: source {k!r} has no title")
        if s.get("kind") not in SOURCE_KINDS:
            err(f, f"module {mid!r}: source {k!r} has kind {s.get('kind')!r} "
                   f"(known: {', '.join(SOURCE_KINDS)})")
        if "url" in s and not link_ok(s["url"]):
            err(f, f"module {mid!r}: source {k!r} has a url a renderer will not link to "
                   f"(only http(s) or a relative address)")
    cites = m.get("citations")
    if cites is not None and not isinstance(cites, list):
        err(f, f"module {mid!r}: `citations` must be a list of citations")
    for i, c in enumerate(cites if isinstance(cites, list) else [], 1):
        if not isinstance(c, dict):
            err(f, f"module {mid!r}: citation {i} is not an object")
            continue
        cid = c.get("id")
        if not (isinstance(cid, str) and cid and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.:-]*", cid)):
            err(f, f"module {mid!r}: citation {i} needs an id of letters, digits and _ . : - "
                   f"(found {cid!r}), or no [^id] mark can name it")
            cid = cid if isinstance(cid, str) else f"#{i}"
        elif cid in ids:
            err(f, f"module {mid!r}: two citations share the id {cid!r} — a mark names its "
                   f"citation by id, so an id can mean one citation only")
        ids.add(cid)
        if c.get("source") not in keys:
            err(f, f"module {mid!r}: citation {cid!r} names the source {c.get('source')!r}, which "
                   f"is not in the module's `sources`")
        if not any(v.strip() for v in loc_values(c.get("quote"))):
            err(f, f"module {mid!r}: citation {cid!r} has an empty quote — the quote is what a "
                   f"reader is shown, and what verification is about")
        if c.get("page") in (None, ""):
            warn(f, f"module {mid!r}: citation {cid!r} names no page")
        pdf = c.get("pagePdf")
        if pdf is not None and not (isinstance(pdf, int) and not isinstance(pdf, bool) and pdf > 0):
            warn(f, f"module {mid!r}: citation {cid!r} has a pagePdf that is not a page number, "
                    f"so the original cannot be opened at it")
        if "url" in c and not link_ok(c["url"]):
            err(f, f"module {mid!r}: citation {cid!r} has a url a renderer will not link to "
                   f"(only http(s) or a relative address)")
        if c.get("verifiedOn") is not None and not (isinstance(c["verifiedOn"], str)
                                                    and ISO_DATE.match(c["verifiedOn"])):
            warn(f, f"module {mid!r}: citation {cid!r} has verifiedOn {c['verifiedOn']!r}; "
                    f"write the date as YYYY-MM-DD")
        if c.get("verifiedBy") is not None and c.get("verifiedOn") is None:
            warn(f, f"module {mid!r}: citation {cid!r} says how it was verified but not when, "
                    f"so no verified badge is shown")
    for a in activities_of(m):
        aid = a.get("id")
        for _, b in activity_blocks(a):
            if not isinstance(b, dict):
                continue
            bid = f"{aid}.{b.get('id')}"
            for x in nested([b]):
                t = x.get("type")
                xid = f"{aid}.{x.get('id')}"
                if t == "callout":
                    if x.get("kind") not in CALLOUT_KINDS:
                        err(f, f"callout {xid!r} has kind {x.get('kind')!r} "
                               f"(known: {', '.join(CALLOUT_KINDS)})")
                    if not any(v.strip() for v in loc_values(x.get("text"))) and not x.get("blocks"):
                        warn(f, f"callout {xid!r} has neither text nor blocks, so it says nothing")
                if t == "sources" and not keys:
                    warn(f, f"sources block {xid!r} is in module {mid!r}, which lists no sources")
            seen = []
            for s in marked_texts(b):
                for cid in CITE_MARK.findall(s):
                    if cid not in ids and cid not in seen:
                        seen.append(cid)
                        err(f, f"block {bid!r} marks [^{cid}], which is not in module {mid!r}'s "
                               f"`citations` — a renderer draws it as a broken mark")


def retired_modes(mid):
    """`modes` was the several-activities key's name during development, before
    release. Nothing reads it, so a module relying on it holds no activity."""
    return (f"module {mid!r} carries `modes`, which is not a module key — a module's "
            f"several activities go in `activities` (one stays in `mode`)")


def activities_of(m):
    """A module's activities, whichever key holds them: `mode` for one,
    `activities` for several. Anything malformed is left out here; check_template
    reports it."""
    if not isinstance(m, dict):
        return []
    if isinstance(m.get("activities"), list):
        return [a for a in m["activities"] if isinstance(a, dict)]
    return [m["mode"]] if isinstance(m.get("mode"), dict) else []


# An activity holds its blocks in `blocks`, or its pages in `pages` — a list of
# {id, title, blocks} — never both. Pages are layout only, so the rules that
# keep answers addressable (unique block ids, one owner per answer field) run
# across every page of the activity at once.
READING_BLOCKS = {"heading", "prose", "deflist", "quote", "image", "callout", "sources"}
KEYS_BY_TYPE = {"headlines": ["thoughts"]}
LEGACY_KEYS = {"bodymap": "regions", "quadrants": "emotions"}


def has_pages(a):
    return isinstance(a.get("pages"), list) and any(isinstance(p, dict) for p in a["pages"])


def activity_blocks(a):
    """(page id, block) for every block of an activity: the page id is None for
    blocks in `blocks`, and each page's own id (or '?') for blocks on a page."""
    out = []
    if has_pages(a):
        for p in a["pages"]:
            if isinstance(p, dict) and isinstance(p.get("blocks"), list):
                pid = p.get("id") if isinstance(p.get("id"), str) and p.get("id") else "?"
                out += [(pid, b) for b in p["blocks"]]
    if isinstance(a.get("blocks"), list):
        out += [(None, b) for b in a["blocks"]]
    return out


def owned_keys(b):
    """The answer fields a block owns, the way the renderer reads them: its
    `keys`, else the key its type owns, else its own id; a block that only reads
    owns none, and a group owns what the blocks inside it own."""
    if not isinstance(b, dict):
        return []
    if isinstance(b.get("blocks"), list):
        return [k for x in b["blocks"] for k in owned_keys(x)]
    t = b.get("type", "text")
    if t in READING_BLOCKS:
        return []
    kv = b.get("keys")
    if kv is not None and kv is not False and kv != 0 and kv != "":   # JS truthiness: [] counts
        keys = kv
    elif t in LEGACY_KEYS:
        keys = [LEGACY_KEYS[t]]
    else:
        keys = KEYS_BY_TYPE.get(t) or [b.get("id")]
    return [k for k in (keys if isinstance(keys, list) else []) if isinstance(k, str)]


def offered_by(obj, tpl):
    """The languages a module or widget offers, which a menu written one list per
    language must carry: the ones the booklet declares, else the ones its title
    is written in. None when neither says (a title in plain words)."""
    declared = tpl.get("languages")
    if isinstance(declared, list) and declared:
        return [t for t in declared if isinstance(t, str) and not lang_problem(t)], "the booklet declares"
    title = obj.get("title") if isinstance(obj, dict) else None
    if isinstance(title, dict) and title:
        return [t for t in title if isinstance(t, str) and not lang_problem(t)], "its title is written in"
    return None


def check_menus(f, menus, where, key=None, offered=None):
    """`menus` is an object of named menus. A menu is a list of strings, the same
    in every language, or one such list per language (`{"en": [...], "fr": [...]}`)
    whose lists run in the same order, so they must be the same length: an option
    is its place in the menu, and that is what a pick made in one language is
    recognised by in another. A per-language menu carries every language
    `offered` (see offered_by) names; es-AR is served by an `es` list."""
    if menus is None:
        return
    if not isinstance(menus, dict):
        err(f, f"{where}.{key or 'menus'} must be an object of named lists" if key
               else f"{where}: `menus` must be an object of named lists")
        return
    for name, items in menus.items():
        if isinstance(items, list):
            if not all(isinstance(x, str) for x in items):
                err(f, f"{where}: menu {name!r} must be a list of strings, or one such list per language")
            continue
        if not (isinstance(items, dict) and items
                and all(isinstance(t, str) and LANG_LIKE.match(t) for t in items)):
            err(f, f"{where}: menu {name!r} must be a list of strings, or one such list per language")
            continue
        bad = False
        for t, opts in items.items():
            why = lang_problem(t)
            if why:
                err(f, f"{where}: menu {name!r}: {why}")
                bad = True
            elif not isinstance(opts, list) or not all(isinstance(x, str) for x in opts):
                err(f, f"{where}: menu {name!r}: its {t!r} options must be a list of strings")
                bad = True
        if bad:
            continue
        sizes = {t: len(opts) for t, opts in items.items()}
        if len(set(sizes.values())) > 1:
            err(f, f"{where}: menu {name!r} has lists of different lengths "
                   f"({', '.join(f'{t} {n}' for t, n in sizes.items())}); each language lists the "
                   f"same options in the same order, because an option is its place in the menu")
        if offered:
            tags, whose = offered
            lacking = [t for t in tags if t not in items and t.split("-")[0] not in items]
            if lacking:
                err(f, f"{where}: menu {name!r} has no list in {', '.join(map(repr, lacking))}, "
                       f"a language {whose} ({', '.join(tags)}); a reader in it would be "
                       f"offered another language's options")


def walk_activity(a):
    """(page id, block, trail) for every block of an activity, the blocks nested
    inside a `group` or a `callout` included, in reading order. `trail` is the
    list of (type, id) of the blocks holding it, outermost first; it is empty for
    a block written directly in `blocks` or on a page."""
    def down(blocks, page, trail):
        for b in blocks:
            yield page, b, trail
            if isinstance(b, dict) and isinstance(b.get("blocks"), list):
                yield from down(b["blocks"], page, trail + [(b.get("type", "text"), b.get("id"))])
    for page, b in activity_blocks(a):
        yield page, b, []
        if isinstance(b, dict) and isinstance(b.get("blocks"), list):
            yield from down(b["blocks"], page, [(b.get("type", "text"), b.get("id"))])


def block_place(page, trail):
    """Where a block sits, in words: the page, and the groups it is inside."""
    inside = " > ".join(f"{t} {i!r}" for t, i in trail)
    if inside:
        return f"inside {inside}" + (f" on page {page!r}" if page else "")
    return f"on page {page!r}" if page else "at the top level"


def check_block_needs(f, b, bid, btype):
    """What SPEC.md's block table says each type needs, so it is not drawn as
    nothing."""
    def has_text(v):
        return isinstance(v, (str, dict)) and any(x.strip() for x in loc_values(v))
    if btype in ("heading", "prose", "quote") and not has_text(b.get("text")):
        err(f, f"{btype} block {bid!r} has no `text`, so it would draw nothing")
    if btype == "deflist":
        items = b.get("items")
        if not (isinstance(items, list) and items and all(
                isinstance(it, dict) and has_text(it.get("label")) and has_text(it.get("body"))
                for it in items)):
            err(f, f"deflist block {bid!r} needs `items`: a list of {{label, body}}, each with words")
    if btype == "image":
        if not b.get("src") or not link_ok(b.get("src")):
            err(f, f"image block {bid!r} needs a `src` that is an http(s) or relative address "
                   f"(a picture is linked, never embedded)")
        if not isinstance(b.get("alt"), (str, dict)):
            err(f, f"image block {bid!r} needs an `alt`")
    if btype == "group" and not (isinstance(b.get("blocks"), list) and b["blocks"]):
        err(f, f"group block {bid!r} needs `blocks`, a list of the blocks it holds")


# The scopes whose question wording the renderer supplies itself when a module
# words none of it (qDefault in booklet.html); a module may still override it.
BUILTIN_SCOPES = {"today", "checkin", "area"}


def wording_langs(tpl, m):
    """The languages a module has to word its questions in: the ones the booklet
    (or the module file) declares, else the ones its own `copy` is written in."""
    d = parse_languages(tpl.get("languages")) if tpl.get("languages") else None
    if d:
        return [t for t in d if isinstance(t, str) and not lang_problem(t)]
    return [k for k in (m.get("copy") or {}) if isinstance(k, str) and LANG_TAG.match(k)]


def copy_bag(m, tag):
    """The wording object a module holds for a language: the tag, else its
    primary language (es-AR is served by es), else nothing."""
    c = m.get("copy") if isinstance(m, dict) else None
    if not isinstance(c, dict):
        return None
    for k in (tag, tag.split("-")[0]):
        if isinstance(c.get(k), dict) and c[k]:
            return c[k]
    return None


def copy_lookup(tag, mods, home, fn):
    """fn(bag) for the module holding the block first, then any other module in
    the file (a booklet merges every module's copy), for one language."""
    for m in [home] + [x for x in mods if x is not home]:
        bag = copy_bag(m, tag)
        if bag is not None:
            v = fn(bag)
            if v is not None:
                return v
    return None


def q_wording(bag, scope, key):
    """[label, hint] a question reads from `copy.<scope>.f.<key>` or
    `copy.<scope>.<key>`, when its label is not empty."""
    d = bag.get(scope)
    if not isinstance(d, dict):
        return None
    own = (d.get("f") or {}).get(key) if isinstance(d.get("f"), dict) else None
    own = own or d.get(key)
    return own if isinstance(own, list) and own and isinstance(own[0], str) and own[0].strip() else None


def ref_wording(bag, ref):
    """What a copy reference such as `act.older` reaches in a bag: a non-empty
    string, or a [label, hint] list with a non-empty label."""
    v = bag
    for seg in ref.split("."):
        if not isinstance(v, dict):
            return None
        v = v.get(seg)
    if isinstance(v, str) and v.strip():
        return v
    if isinstance(v, list) and v and isinstance(v[0], str) and v[0].strip():
        return v
    return None


def check_wording(f, b, bid, btype, place, home, mods, tpl):
    """A block that asks something must say what, in every language on offer:
    otherwise the renderer draws a blank label or the block's own id."""
    langs = wording_langs(tpl, home)
    if btype in ("text", "headlines"):
        q = b.get("q")
        if not (isinstance(q, list) and len(q) == 2 and all(isinstance(x, str) and x for x in q)):
            return                                    # reported as a malformed `q`
        scope, key = q
        if scope in BUILTIN_SCOPES:
            return
        found = [l for l in langs
                 if copy_lookup(l, mods, home, lambda bag: q_wording(bag, scope, key))]
        missing = [l for l in langs if l not in found]
        if not langs:
            err(f, f"block {bid!r} asks the question {scope}.{key} but its module has no `copy` "
                   f"to word it in, so it would draw a blank label")
        elif missing:
            err(f, f"block {bid!r} asks the question {scope}.{key} with no wording in "
                   f"{', '.join(missing)}: copy.<language>.{scope}.f.{key} must be [label, hint]"
                   + (f" (it is worded in {', '.join(found)})" if found else " (it is worded in no language)")
                   + " — the renderer would draw a blank label")
    if btype == "list" or (place == "folded" and isinstance(b.get("copy"), str)):
        ref = b.get("copy")
        label = b.get("label")
        if btype == "list" and not (ref or label):
            return                                    # reported as nameless
        if isinstance(ref, str) and not ref.strip():
            ref = None
        elif ref is not None and not isinstance(ref, str):
            if btype == "list" and not label:
                err(f, f"list block {bid!r}: `copy` must be a reference string "
                       f"`<activity-id>.<key>`, not {type(ref).__name__}")
            return
        bad = []
        for l in langs:
            if btype == "list" and isinstance(label, str) and label.strip():
                break
            if btype == "list" and isinstance(label, dict):
                if any(isinstance(label.get(k), str) and label[k].strip() for k in (l, l.split("-")[0])):
                    continue
            if ref is None or copy_lookup(l, mods, home, lambda bag: ref_wording(bag, ref)) is None:
                bad.append(l)
        if bad:
            if ref is None:
                err(f, f"list block {bid!r} has a `label` with no wording in {', '.join(bad)}, "
                       f"and no `copy` reference to fall back on")
            else:
                err(f, f"block {bid!r} names the copy entry {ref!r}, which the module's `copy` "
                       f"does not hold for {', '.join(bad)} — the renderer would show "
                       f"{'the block id' if place == 'folded' else 'a nameless block'}")


def is_named(title):
    """Whether a title says anything, in any language."""
    if isinstance(title, str):
        return bool(title.strip())
    if isinstance(title, dict):
        return any(isinstance(v, str) and v.strip() for v in title.values())
    return False


def check_pages(f, a, mid):
    """The shape of an activity's `pages`, when it has one."""
    if "pages" not in a:
        return
    if "blocks" in a:
        err(f, f"activity {mid!r} carries both `blocks` and `pages` — an activity holds its "
               f"blocks in `blocks`, or its pages in `pages`, never both")
    pages = a["pages"]
    if not (isinstance(pages, list) and pages and all(isinstance(p, dict) for p in pages)):
        err(f, f"activity {mid!r}: `pages` must be a non-empty list of pages, each "
               f"{{id, title, blocks}}")
        return
    if len(pages) == 1:
        warn(f, f"activity {mid!r} holds its one page in `pages` — write it as `blocks`, "
                f"which renderers older than `pages` can still read")
    seen = set()
    for i, p in enumerate(pages, 1):
        pid = p.get("id")
        if not (isinstance(pid, str) and pid):
            err(f, f"activity {mid!r}: page {i} needs a string id")
        elif pid in seen:
            err(f, f"activity {mid!r} has two pages called {pid!r}")
        else:
            seen.add(pid)
        if "blocks" in p and not isinstance(p["blocks"], list):
            err(f, f"activity {mid!r}: the blocks of page {pid or i!r} must be a list")
        d = p.get("display") or {}
        if "order" in d and not isinstance(d["order"], (int, float)):
            err(f, f"activity {mid!r}: page {pid or i!r} has a non-numeric display.order")
        if len(pages) > 1 and not is_named(p.get("title")):
            warn(f, f"activity {mid!r}: page {pid or i!r} has no title, so its menu can only "
                    f"call it by its number")


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
        if b.get("block") == "board" and board_has_content(b):
            err(f, "a preset must ship empty: its board block has content")
        if b.get("block") == "person" and (b.get("name") or b.get("email")):
            err(f, "a preset must ship empty: it carries a name or an email address")
        if b.get("block") == "drafts":
            drafts_content(f, b)


def blank(v):
    """Nothing a person wrote: no text (spaces do not count), no list items, no
    values in an object. A number or a true is something."""
    if v is None or v is False:
        return True
    if isinstance(v, str):
        return not v.strip()
    if isinstance(v, (list, tuple)):
        return all(blank(x) for x in v)
    if isinstance(v, dict):
        return all(blank(x) for x in v.values())
    return False


def row_has_content(row):
    """A Now or area row is a `{kind, text, since, starter}`; its `since` and
    `starter` are bookkeeping, so only its text can be content."""
    if isinstance(row, dict):
        return not blank(row.get("text"))
    return not blank(row)


AREA_TEXT = ("label", "matters", "difficult", "known", "fits", "notdecide")


def board_has_content(b):
    """The record keeps Now rows and areas that nothing has been written in yet,
    so a row or an area is content only when it holds something."""
    if any(row_has_content(r) for r in (b.get("archive") or [])):
        return True
    now = b.get("now")
    if isinstance(now, dict) and any(row_has_content(r) for r in (now.get("items") or [])):
        return True
    for a in (b.get("areas") or []):
        if not isinstance(a, dict):
            if not blank(a):
                return True
            continue
        if any(not blank(a.get(k)) for k in AREA_TEXT):
            return True
        if any(row_has_content(r) for r in (a.get("items") or [])):
            return True
    return False


def drafts_problems(b):
    """What is wrong with the shape of a `drafts` block's `activities`: an
    object keyed by activity id, none of them `today` or `checkin` (those are
    the block's own keys), each holding an object keyed by field id."""
    if "activities" not in b or b["activities"] is None:
        return []
    acts = b["activities"]
    if not isinstance(acts, dict):
        kind = "a list" if isinstance(acts, list) else \
               "a string" if isinstance(acts, str) else "a " + type(acts).__name__
        return [f"`activities` in the drafts block must be an object keyed by activity id (found {kind})"]
    out = []
    for k, v in acts.items():
        if not k:
            out.append("`activities` in the drafts block has an empty activity id")
        elif k in BUILTIN_ACTIVITIES:
            out.append(f"`activities` in the drafts block holds {k!r}, which is a built-in activity; "
                       f"`today` and `checkin` are keys of the block itself")
        elif not isinstance(v, dict):
            kind = "a list" if isinstance(v, list) else "a string" if isinstance(v, str) \
                   else "null" if v is None else "a " + type(v).__name__
            out.append(f"`activities.{k}` in the drafts block must be an object keyed by field id (found {kind})")
    return out


def drafts_content(f, b):
    """A preset carries no draft: not of `today` or `checkin`, and not of any
    other activity in `activities`. A malformed `activities` is reported by its
    shape (check_drafts) and not judged again here."""
    for k in BUILTIN_ACTIVITIES:
        if not blank(b.get(k)):
            err(f, f"a preset must ship empty: its drafts block carries a draft of {k!r}")
    if drafts_problems(b):
        return
    for k, v in (b.get("activities") or {}).items():
        err(f, f"a preset must ship empty: its drafts block carries a draft of the activity {k!r} "
               f"under `activities`")


def check_drafts(f, blocks):
    for b in blocks:
        if b.get("block") == "drafts":
            for m in drafts_problems(b):
                err(f, m)


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
    if fm.get("languages"):
        shell["languages"] = parse_languages(fm["languages"])
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
    # A widget's words may carry any subset of the supported languages; which
    # tags are valid is checked for every kind of file in check_languages().
    check_template(f, {"modules": [], "widgets": [w], "_widgets_only": True})



# ---- format v0.2 -----------------------------------------------------------
# A v0.2 booklet is Markdown: front matter, prose, and Booklet lines
# written `> [!kind|id words] Title`, with data in fenced blocks. These checks
# mirror parseV2() in booklet.html, so the linter and the page agree on what is
# wrong with a file. See SPEC.md for the format.
V2_LINE = re.compile(r'^>[ \t]?\[!([A-Za-z][A-Za-z0-9-]*)(?:\|([^\]]*))?\]([+-]?)[ \t]*(.*)$')
V2_ID = re.compile(r'^[A-Za-z0-9][A-Za-z0-9-]*$')
V2_FLAGS = {"module": {"end"}, "activity": {"repeat", "daily", "pinned", "hidden"},
            "widget": {"skippable", "readonly", "describe"}, "text": {"long"},
            "choice": {"open"}, "multi": {"open"}}
V2_QUESTIONS = {"text", "lines", "widget", "choice", "multi", "scale", "number", "date", "matrix"}
V2_DRAWN = {"text", "lines", "widget", "choice", "multi", "scale", "number", "date"}  # the kinds the reference page draws today
V2_STRUCTURE = {"module", "activity", "data", "records", "manifest", "menu", "hint", "solution"}


def v2_words(kind, s):
    out = {"id": None, "flags": set(), "set": {}}
    for w in (s or "").split():
        kv = re.match(r'^([A-Za-z][A-Za-z0-9-]*)=(.*)$', w)
        if kv:
            out["set"][kv.group(1)] = kv.group(2)
        elif w.lower() in V2_FLAGS.get(kind, set()):
            out["flags"].add(w.lower())
        elif out["id"] is None:
            out["id"] = w
        else:
            out["flags"].add(w.lower())
    return out


def check_v2(f, text, fm):
    """Lint a v0.2 booklet. Every problem names its line."""
    lang = fm.get("lang", "")
    if not lang:
        err(f, "front matter has no `lang:` — a v0.2 file is written in one language")
    else:
        why = lang_problem(lang)
        if why:
            err(f, f"front matter `lang: {lang}`: {why}")
    if not fm.get("title"):
        warn(f, "front matter has no `title:`")
    lines = text.replace("\r\n", "\n").split("\n")
    i = 0
    if lines and lines[0].strip() == "---":
        i = 1
        while i < len(lines) and lines[i].strip() != "---":
            i += 1
        i += 1
    ids, block_ids, embeds, acts, entry_refs = {}, {}, [], set(), []
    open_mod, open_line, section, seen_activity = None, 0, "content", False
    while i < len(lines):
        ln, n = lines[i], i + 1
        fm_ = re.match(r'^ {0,3}(`{3,}|~{3,})(.*)$', ln)
        if fm_:
            mark, info = fm_.group(1), fm_.group(2).strip()
            k = i + 1
            while k < len(lines):
                c = re.match(r'^ {0,3}(`{3,}|~{3,})[ \t]*$', lines[k])
                if c and c.group(1)[0] == mark[0] and len(c.group(1)) >= len(mark):
                    break
                k += 1
            if k >= len(lines):
                err(f, f"line {n}: a fence is opened and never closed")
            code = "\n".join(lines[i + 1:k])
            m = k + 1
            while m < len(lines) and not lines[m].strip():
                m += 1
            bid = None
            if m < len(lines):
                b = re.match(r'^\^([A-Za-z0-9-]+)$', lines[m].strip())
                if b:
                    bid = b.group(1)
                    if bid in block_ids:
                        err(f, f"line {m + 1}: the block id ^{bid} is used twice")
                    block_ids[bid] = info
            words = info.split()
            if words and words[0].lower() == "booklet":
                what = words[1].lower() if len(words) > 1 else ""
                try:
                    obj = json.loads(code)
                except ValueError as e:
                    err(f, f"line {n}: the `booklet {what}` block is not valid JSON ({e.msg}, its line {e.lineno})")
                    obj = None
                if what == "widget":
                    if not bid:
                        err(f, f"line {n}: a widget block needs a ^id on the line after it")
                    if isinstance(obj, dict):
                        if not obj.get("engine"):
                            err(f, f"line {n}: the widget ^{bid} names no `engine`")
                        for fig in obj.get("figures") or []:
                            bad = svg_script_in((fig or {}).get("svg") or "") if isinstance(fig, dict) else None
                            if bad:
                                err(f, f"line {n}: the widget ^{bid} has {bad} in a figure — a figure is a drawing, never a program")
                elif what in ("entries", "draft"):
                    if len(words) < 3:
                        err(f, f"line {n}: `booklet {what}` needs the activity it belongs to")
                    else:
                        entry_refs.append((n, words[2]))
                elif what not in ("answers", "module"):
                    warn(f, f"line {n}: `booklet {what}` is not a block this format defines")
            i = (m if bid else k) + 1
            continue
        mm = V2_LINE.match(ln)
        if mm:
            kind, w = mm.group(1).lower(), v2_words(mm.group(1).lower(), mm.group(2))
            where = f"line {n}"
            if kind == "data":
                section = "data"
            elif kind == "records":
                section = "records"
            elif section == "content":
                if kind == "module":
                    if "end" in w["flags"]:
                        if not open_mod:
                            err(f, f"{where}: a module is closed that was never opened")
                        elif w["id"] and w["id"] != open_mod:
                            err(f, f"{where}: this closes {w['id']!r}, but {open_mod!r} is open")
                        open_mod = None
                    else:
                        if open_mod:
                            err(f, f"{where}: {w['id']!r} opens before {open_mod!r} (line {open_line}) is closed")
                        if not w["id"]:
                            err(f, f"{where}: a module line needs an id")
                        open_mod, open_line = w["id"], n
                elif kind == "activity":
                    seen_activity = True
                    if w["id"]:
                        acts.add(w["id"])
                elif kind in V2_QUESTIONS:
                    if not w["id"]:
                        err(f, f"{where}: this {kind} question has no id, so its answer would have nowhere to go")
                    elif kind not in V2_DRAWN:
                        warn(f, f"{where}: {kind} questions are not drawn by the reference page yet")
                    if kind == "widget":
                        body = []
                        k = i + 1
                        while k < len(lines) and lines[k].startswith(">") and not V2_LINE.match(lines[k]):
                            body.append(lines[k]); k += 1
                        e = re.search(r'!\[\[[^\]#|]*#\^([A-Za-z0-9-]+)', "\n".join(body))
                        if e:
                            embeds.append((n, e.group(1)))
                        else:
                            err(f, f"{where}: the widget {w['id']!r} names no data block (write ![[#^its-id]] under the line)")
                    # Markdown lets only a list starting at 1 interrupt a paragraph:
                    # a list starting at 0 (or 2…) straight under the line joins its title
                    nxt = lines[i + 1] if i + 1 < len(lines) else ""
                    if re.match(r'^ {0,3}(?!1[.)])\d+[.)][ \t]', nxt):
                        err(f, f"line {n + 1}: a numbered list that does not start at 1 needs a blank line above it, "
                               f"or Markdown reads it as part of the question's title")
                elif kind not in V2_STRUCTURE:
                    pass                                   # a reading callout; any kind is allowed
            for key in (w["id"],) if kind in V2_QUESTIONS | {"module", "activity", "menu"} and w["id"] else ():
                if not V2_ID.match(key):
                    err(f, f"line {n}: the id {key!r} may hold only letters, digits and dashes")
                if key in ids and not (kind == "module" and "end" in w["flags"]):
                    err(f, f"line {n}: the id {key!r} is also used on line {ids[key]}")
                ids.setdefault(key, n)
        i += 1
    if open_mod:
        err(f, f"line {open_line}: the module {open_mod!r} is opened and never closed")
    for n, ref in embeds:
        if ref not in block_ids:
            err(f, f"line {n}: ![[#^{ref}]] points at no block in this file")
        elif not block_ids[ref].lower().startswith("booklet widget"):
            err(f, f"line {n}: ^{ref} is not a widget block")
    for n, ref in entry_refs:
        if ref not in acts:
            warn(f, f"line {n}: records for {ref!r}, which no activity line names")


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
    check_languages(f, fm, blocks_of(text)[0])
    if REGISTRY_ALL or is_registry_file(path):
        check_registry_languages(f, blocks_of(text)[0])

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
        return
    if fm.get("booklet") == "2":
        check_v2(f, text, fm)
        return
    # No earlier format is read (2026-09-29) — this mirrors the renderer's own
    # parseFile(), which only ever calls parseV2(). `booklet: 1` and anything
    # else are rejected outright rather than checked against an earlier format's rules.
    err(f, f"front matter must say `booklet: 2` (found {fm.get('booklet')!r}) — "
           f"no earlier format is read")


def main():
    global REGISTRY_ALL
    REGISTRY_ALL = "--registry" in sys.argv[1:]
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
