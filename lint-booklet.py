#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Ben Armstrong
"""
Lint a booklet file against the v0.8 format in SPEC.md.

A booklet is one portable Markdown file: front matter that says `booklet: 0.8`,
prose, Booklet lines written `> [!kind|id words] Title`, and data in fenced
blocks. A malformed file is an activity that renders wrong or not at all for
whoever was handed it, so this linter catches it before the file is shared. Its
checks mirror parseBooklet() in booklet.html, so the two agree on what is wrong.

What it checks: the front matter (`booklet: 0.8`, one `lang:`), fences that are
closed, unique block and question ids, modules that open and close, widgets that
name a data block that exists, widget JSON that parses and names an engine, no
script in a widget's SVG, numbered-list lines that would swallow a question's
title, queries and data blocks, and records that name an activity. Any file whose
front matter is not `booklet: 0.8` is rejected; no earlier format is read.

Usage:  python3 lint-booklet.py [--registry] [path ...]
Default (no arguments): every *.md file in modules/, widgets/, and
examples/ next to this script, skipping any of those directories that don't
exist and skipping readme.md (case-insensitive). `--registry` is accepted so the
registry's CI line keeps working; a v0.8 file is written in one language, so it
adds no rule of its own.
Exit 0 clean, 1 on any error. Warnings never fail the build.
"""
import html, json, math, pathlib, re, sys, unicodedata, urllib.parse

BASE = pathlib.Path(__file__).resolve().parent

errors, warnings = [], []
def err(f, m):  errors.append(f"{f}: {m}")
def warn(f, m): warnings.append(f"{f}: {m}")


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

# Languages. A booklet's `lang` is the language its content is written in: any well-formed tag, a lowercase
# language with an optional region (`es`, `es-AR`, `de`, `pt-BR`). The renderer's own interface has strings
# for en, es (with es-AR over it) and fr; for any other language the interface falls back to English.
LANGS = ("en", "es", "fr")
LANG_TAG = re.compile(r"^[a-z]{2,3}(-([A-Z]{2}|[0-9]{3}))?$")
# a key that looks like a language tag at all, however wrong
LANG_LIKE = re.compile(r"^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$")


def lang_problem(tag):
    """Why a language tag is not well-formed, or None."""
    if not isinstance(tag, str) or not LANG_LIKE.match(tag):
        return f"{tag!r} is not a language tag"
    if LANG_TAG.match(tag):
        return None
    return (f"{tag!r} is not spelled the way a tag is: lowercase language, "
            f"uppercase region (es-AR)")


def lang_warning(tag):
    """A warning when the interface has no strings for the tag's language, or None."""
    if tag.split("-")[0] in LANGS:
        return None
    return (f"front matter `lang: {tag}`: the renderer's interface has no strings for this language "
            f"(it has {', '.join(LANGS)}), so it will show its own words in English around this booklet")


def front_matter(text):
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---", 3)
    if end < 0:
        return None, text
    fm = {}
    for line in text[4:end].split("\n"):
        m = re.match(r'^([A-Za-z_][\w-]*):\s*["\']?(.*?)["\']?\s*$', line)
        if m:
            fm[m.group(1)] = m.group(2)
    return fm, text[end + 4:]


# A v0.8 booklet is Markdown: front matter, prose, and Booklet lines
# written `> [!kind|id words] Title`, with data in fenced blocks. These checks
# mirror parseBooklet() in booklet.html, so the linter and the page agree on what is
# wrong with a file. See SPEC.md for the format.
CALLOUT_LINE = re.compile(r'^>[ \t]?\[!([A-Za-z][A-Za-z0-9-]*)(?:\|([^\]]*))?\]([+-]?)[ \t]*(.*)$')
# a row closes with `> [!row end]`: the one booklet line whose flag follows the kind, since a row has no id
ROW_END = re.compile(r'^>[ \t]?\[!(row)([ \t]+end)\]([+-]?)[ \t]*(.*)$', re.I)
ID_PATTERN = re.compile(r'^[A-Za-z0-9][A-Za-z0-9-]*$')
# What each kind of booklet line takes after its id: a flag is a bare word, `key:` a setting written key:value.
# The same table is KIND_SETTINGS in booklet.html and in SPEC.md section 4 (test/guard.test.js pins the three
# together). A kind in this table is a kind the format defines; any other kind with an id or settings is unknown.
KIND_SETTINGS = {
    "module": ("end",), "activity": ("repeat", "daily", "hidden"), "row": ("end",), "text": ("long",),
    "lines": (), "scale": (), "matrix": (), "date": (), "menu": (), "hint": (), "solution": (),
    "data": (), "records": (), "manifest": (),
    "choice": ("open", "menu:"), "multi": ("open", "menu:"),
    "number": ("min:", "max:", "step:"), "widget": ("readonly", "describe"),
}
NUMBER_SETTINGS = ("min", "max", "step")
CALLOUT_FLAGS = {k: {s for s in v if not s.endswith(":")} for k, v in KIND_SETTINGS.items()}
# the widget engines the renderer has
ENGINES = ("svg-regions", "grid-select")
TONE_NAMES = ("warm", "green", "amber", "slate", "teal")
QUESTION_KINDS = {"text", "lines", "widget", "choice", "multi", "scale", "number", "date", "matrix"}
STRUCTURE_KINDS = {"module", "activity", "data", "records", "manifest", "menu", "hint", "solution", "row"}


def callout_words(kind, s):
    out = {"id": None, "flags": set(), "set": {}, "old": []}
    for w in (s or "").split():
        kv = re.match(r'^([A-Za-z][A-Za-z0-9-]*):(.*)$', w)
        if kv:
            out["set"][kv.group(1).lower()] = kv.group(2)
        elif re.match(r'^[A-Za-z][A-Za-z0-9-]*=', w):
            out["old"].append(w)
        elif w.lower() in CALLOUT_FLAGS.get(kind, set()):
            out["flags"].add(w.lower())
        elif out["id"] is None:
            out["id"] = w
        else:
            out["flags"].add(w.lower())
    return out


# A query's twelve keys, the six views, and which keys each view draws. A new key or view needs two
# real pages that need it (SPEC.md, design rules for views). `from`, `as` and `empty` apply to every view.
QUERY_KEYS = ("from", "as", "fields", "group", "limit", "parent", "empty", "label", "value", "note", "badge", "tone")
QUERY_VIEWS = ("cards", "table", "list", "tiles", "bars", "line")
VIEW_DRAWS = {
    "cards": ("fields", "limit"),
    "table": ("fields", "group", "limit", "badge", "tone"),
    "list": ("label", "value", "note", "badge", "tone", "fields", "group", "limit", "parent"),
    "tiles": ("label", "value", "note", "tone", "group", "limit"),
    "bars": ("label", "value", "tone", "limit"),
    "line": ("label", "value", "fields", "limit"),
}
QUERY_EVERY_VIEW = ("from", "as", "empty")
# the settings that name a field of the rows being drawn
QUERY_FIELD_KEYS = ("group", "parent", "label", "value", "note", "badge", "tone")


def _flat(v):
    return v is None or isinstance(v, (str, int, float, bool))


def data_problem(obj):
    """Why a `booklet data` object is not rows a generator wrote, or None. JSON
    only: this linter reads no YAML. Returns (problem, rows, fields)."""
    rows = obj.get("rows") if isinstance(obj, dict) else obj
    if not isinstance(rows, list):
        return "holds no list of rows (an object with `rows`, or the list itself)", [], {}
    for r in rows:
        if not isinstance(r, dict):
            return "has a row that is not an object", [], {}
        for k, v in r.items():
            if not (_flat(v) or (isinstance(v, list) and all(_flat(x) for x in v))):
                return f"has a nested value in {k!r} (a value is a string, number, true, false, nothing, or a list of those)", [], {}
    fields = {}
    if isinstance(obj, dict) and "fields" in obj:
        fields = obj["fields"]
        if not isinstance(fields, dict) or not all(isinstance(x, str) for x in fields.values()):
            return "has `fields` that is not an object of labels", [], {}
    return None, rows, fields


IMPLICIT_ACTIVITY = "(the file)"


def check_query(f, n, code, mod, here, act_info, q_owner, any_module, data_blocks=None):
    """A `booklet query` block: `key: value` lines, read within its own module."""
    data_blocks = data_blocks or {}
    s = {}
    for off, raw in enumerate(code.split("\n")):
        ln = raw.strip()
        if not ln:
            continue
        m = re.match(r'^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$', ln)
        if not m:
            err(f, f"line {n + 1 + off}: a query line is written `key: value` (found {ln!r})")
            continue
        key = m.group(1).lower()
        if key not in QUERY_KEYS:
            err(f, f"line {n + 1 + off}: a query has no setting {key!r} (it takes {', '.join(QUERY_KEYS)})")
        s[key] = m.group(2).strip().strip('"\'')
    if here is None:
        err(f, f"line {n}: a query belongs in an activity's prose")
    if "as" in s and s["as"].lower() not in QUERY_VIEWS:
        err(f, f"line {n}: the query's `as: {s['as']}` is not one of {', '.join(QUERY_VIEWS)}")
    if "limit" in s and not re.fullmatch(r'[1-9][0-9]*', s["limit"]):
        err(f, f"line {n}: the query's `limit: {s['limit']}` must be a positive whole number")
    src_id = s.get("from", "")
    src_act, src_q, src_data, src_nums, src_rows = None, None, None, set(), []
    if not src_id:
        err(f, f"line {n}: a query needs `from:`, the activity or question it shows")
    elif src_id in act_info:
        src_act = src_id
    elif src_id in q_owner:
        src_act, src_q = q_owner[src_id], src_id
    elif src_id in data_blocks:
        d_mod, d_keys, d_nums, d_rows = data_blocks[src_id]
        if any_module and d_mod is not None and d_mod != mod:
            err(f, f"line {n}: the query's `from: {src_id}` is a data block in another module (a query reads within its own module, or the data section)")
        else:
            src_data, src_nums, src_rows = d_keys, d_nums, d_rows
            if s.get("as", "").lower() == "cards":
                err(f, f"line {n}: the query's `as: cards` draws kept entries, not the data block {src_id!r}")
    else:
        err(f, f"line {n}: the query's `from: {src_id}` names no activity, question or data block in this file")
    # the view in force: the one named, else the default for what is read (cards for kept entries, a table for a data block)
    view = s.get("as", "").lower()
    if view not in QUERY_VIEWS:
        view = "cards" if src_act else ("table" if src_data is not None else "")
    drawn = VIEW_DRAWS.get(view, ())
    ignored = [k for k in QUERY_KEYS if k in s and k not in QUERY_EVERY_VIEW and view and k not in drawn]
    for key in ignored:
        if "as" in s:
            warn(f, f"line {n}: the query's `as: {view}` does not draw `{key}`")
        else:
            warn(f, f"line {n}: the query's default view, `{view}`, does not draw `{key}`")
    # a setting that names a field the rows never carry: a warning, never an error
    names = None
    if src_data is not None:
        names = src_data
    elif src_act:
        names = {q for q, a in q_owner.items() if a == src_act and (src_q is None or q == src_q)} | {"date"}
    if names is not None:
        for key in QUERY_FIELD_KEYS:
            if key in s and key not in ignored and s[key] not in names:
                warn(f, f"line {n}: the query's `{key}: {s[key]}` names a field the rows never carry")
        if src_data is not None and "fields" in s and "fields" not in ignored:
            for name in [x.strip() for x in s["fields"].split(",") if x.strip()]:
                if name not in names:
                    warn(f, f"line {n}: the query's `fields: {name}` names a field the rows never carry")
        # nesting reads the field `id`, and a nested list is not grouped
        if src_data is not None and "parent" in s and "parent" not in ignored and "id" not in names:
            warn(f, f"line {n}: the query's `parent: {s['parent']}` needs rows with an `id` field, and these carry none")
        pkey = s.get("parent", "parent")
        if src_data is not None and "id" in names and view == "list" and any(str(r.get(pkey, "")).strip() for r in src_rows):
            ids = [str(r.get("id", "")).strip() for r in src_rows]
            if not all(ids):
                warn(f, f"line {n}: the nested list has {ids.count('')} row(s) with no `id`; nothing can sit under a row that has none")
            for dup in sorted({x for x in ids if x and ids.count(x) > 1}):
                warn(f, f"line {n}: the nested list has {ids.count(dup)} rows with the `id` {dup!r}; the first one is used")
        if "parent" in s and "group" in s and view == "list":
            warn(f, f"line {n}: a nested list is not grouped, so `group: {s['group']}` is not drawn")
        # a chart draws numbers: a value field with no number in any row draws nothing
        if src_data is not None and view in ("bars", "line"):
            if view == "bars" or "fields" not in s:
                wanted = [s.get("value", "value")]
            else:
                wanted = [x.strip() for x in s["fields"].split(",") if x.strip()]
            for name in wanted:
                if name in names and name not in src_nums:
                    warn(f, f"line {n}: the query's `as: {view}` has no number in the field {name!r}, so it draws nothing")
                elif names and name not in names and name == "value" and "value" not in s and "fields" not in s:
                    warn(f, f"line {n}: the query's `as: {view}` reads the field 'value', which the rows never carry (name the field with `value:`)")
    if src_act:
        src_mod, keeps = act_info[src_act]
        # a file with no module fence is one module
        if any_module and src_mod != mod:
            err(f, f"line {n}: the query's `from: {src_id}` is in another module (a query reads within its own module only)")
        elif src_q is None and not keeps:
            err(f, f"line {n}: the query's `from: {src_id}` keeps no entries (only a repeat activity does)")
    if "fields" in s and src_act:
        for name in [x.strip() for x in s["fields"].split(",") if x.strip()]:
            if name == "date":
                continue
            if q_owner.get(name) != src_act or (src_q and name != src_q):
                err(f, f"line {n}: the query's `fields: {name}` is not a question of {src_act!r}")



# ---- A theme block (format 0.5): `booklet theme`, key: value lines --------------------------------
# Data, never CSS: each key takes one strict value. The contrast check below is the renderer's own
# (themeDerive in booklet.html), ported number for number: test/theme-block.test.js runs both on the same
# inputs and requires the same result. The tables are the four built-in themes' tokens that the check
# reads, in lowercase; the same test requires them to equal the stylesheet's.
TH_BASES = ("paper", "daylight", "night", "contrast")
TH_COLOURS = ("paper", "ink", "accent", "good", "warn", "bad")
TH_FONTS = ("default", "serif", "sans", "mono", "readable")
TH_DENSITIES = ("compact", "comfortable", "roomy")
TH_HEX = re.compile(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})")
TH_BASE = {
    "paper": {
        "paper": "#f7f2e8", "paper-deep": "#eee6da", "ink": "#292421", "muted": "#59514b",
        "reader": "#292421", "field": "#ffffff", "surface": "#ffffff", "warn": "#a04e34",
        "warn-soft": "#ffe4de", "accent": "#103e46", "accent-soft": "#e3eaea", "on-accent": "#ffffff",
        "on-ink": "#ffffff", "mark": "#fff3b0", "tone-warm": "#f0d9cf", "tone-warm-deep": "#9a4a31",
        "tone-green": "#dce7d2", "tone-green-deep": "#4f6b3a", "tone-amber": "#f6edd0", "tone-amber-deep": "#80621a",
        "tone-slate": "#d9dee2", "tone-slate-deep": "#465b66", "tone-teal": "#d5e3e1", "tone-teal-deep": "#166b63",
    },
    "daylight": {
        "paper": "#ffffff", "paper-deep": "#f3f4f6", "ink": "#1f2328", "muted": "#57606a",
        "reader": "#1f2328", "field": "#ffffff", "surface": "#ffffff", "warn": "#a04e34",
        "warn-soft": "#fbe9e4", "accent": "#103e46", "accent-soft": "#e6f0f1", "on-accent": "#ffffff",
        "on-ink": "#ffffff", "mark": "#fff3b0", "tone-warm": "#f0d9cf", "tone-warm-deep": "#9a4a31",
        "tone-green": "#dce7d2", "tone-green-deep": "#4f6b3a", "tone-amber": "#f6edd0", "tone-amber-deep": "#80621a",
        "tone-slate": "#d9dee2", "tone-slate-deep": "#465b66", "tone-teal": "#d5e3e1", "tone-teal-deep": "#166b63",
    },
    "night": {
        "paper": "#16191d", "paper-deep": "#1e2328", "ink": "#e6e1d8", "muted": "#a8a198",
        "reader": "#e6e1d8", "field": "#1e2328", "surface": "#1e2328", "warn": "#e08a6b",
        "warn-soft": "#3a2620", "accent": "#7cc4c9", "accent-soft": "#1f3438", "on-accent": "#0f1a1c",
        "on-ink": "#16191d", "mark": "#5c4e12", "tone-warm": "#3a2620", "tone-warm-deep": "#e8a58c",
        "tone-green": "#222e1d", "tone-green-deep": "#9cc27a", "tone-amber": "#332b14", "tone-amber-deep": "#d9b25a",
        "tone-slate": "#2a3238", "tone-slate-deep": "#a9bbc6", "tone-teal": "#1c3331", "tone-teal-deep": "#7fd1c6",
    },
    "contrast": {
        "paper": "#ffffff", "paper-deep": "#ededed", "ink": "#000000", "muted": "#1a1a1a",
        "reader": "#000000", "field": "#ffffff", "surface": "#ffffff", "warn": "#8b0000",
        "warn-soft": "#fde7e7", "accent": "#003b49", "accent-soft": "#ffffff", "on-accent": "#ffffff",
        "on-ink": "#ffffff", "mark": "#ffe600", "tone-warm": "#ffe9e4", "tone-warm-deep": "#8b0000",
        "tone-green": "#e8f5e0", "tone-green-deep": "#1b4d0e", "tone-amber": "#fff3c4", "tone-amber-deep": "#5c4300",
        "tone-slate": "#e6eaee", "tone-slate-deep": "#243746", "tone-teal": "#ddf2f0", "tone-teal-deep": "#004d45",
    },
}
TH_PAIRS = [("ink", "paper"), ("ink", "paper-deep"), ("muted", "paper"), ("accent", "paper"), ("on-accent", "accent"),
            ("ink", "field"), ("reader", "field"), ("ink", "surface"), ("accent", "surface"), ("muted", "surface"),
            ("warn", "paper"), ("on-ink", "ink"), ("on-ink", "muted"), ("ink", "accent-soft"), ("ink", "mark"),
            ("warn", "warn-soft")]
for _t in ("warm", "green", "amber", "slate", "teal"):
    TH_PAIRS += [("tone-" + _t + "-deep", "tone-" + _t), ("ink", "tone-" + _t)]
# the views: a plain pill, a toned value on a card, a quiet note and a label on a toned tile
TH_PAIRS += [("reader", "paper-deep"), ("muted", "paper-deep")]
for _t in ("warm", "green", "amber"):
    TH_PAIRS += [("tone-" + _t + "-deep", "surface"), ("muted", "tone-" + _t), ("reader", "tone-" + _t)]
TH_OWES = {"paper": ["paper"], "ink": ["ink"], "reader": ["ink"], "on-ink": ["paper"], "accent": ["accent"],
           "warn": ["bad"], "tone-green-deep": ["good"], "tone-amber-deep": ["warn"], "tone-warm-deep": ["bad"]}


def _th_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = h[0] * 2 + h[1] * 2 + h[2] * 2
    n = int(h, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]


def _th_hex(c):
    return "#" + "".join("%02x" % max(0, min(255, int(v))) for v in c)


def _th_lum(c):
    r, g, b = [(v / 255 / 12.92 if v / 255 <= .03928 else ((v / 255 + .055) / 1.055) ** 2.4) for v in c]
    return .2126 * r + .7152 * g + .0722 * b


def _th_ratio(a, b):
    x, y = _th_lum(a), _th_lum(b)
    return (max(x, y) + .05) / (min(x, y) + .05)


def _th_mix(a, b, t):
    return [int(math.floor(v + (b[i] - v) * t + .5)) for i, v in enumerate(a)]


def _th_tint(P, tgt, t0, fgs):
    """A tint of paper toward tgt, as strong as t0, eased back until every colour in fgs reads on it."""
    for k in (1, .7, .4, 0):
        c = _th_mix(P, tgt, t0 * k)
        if all(_th_ratio(f, c) >= 4.5 for f in fgs):
            return c
    return P


def _th_build(B, use):
    g = lambda n: _th_rgb(B[n])
    c = lambda k: _th_rgb(use[k]) if k in use else None
    P, I, A = c("paper") or g("paper"), c("ink") or g("ink"), c("accent") or g("accent")
    deep = {"green": c("good") or g("tone-green-deep"), "amber": c("warn") or g("tone-amber-deep"),
            "warm": c("bad") or g("tone-warm-deep"), "slate": g("tone-slate-deep"), "teal": g("tone-teal-deep")}
    dark = _th_lum(P) < _th_lum(I)
    pi = "paper" in use or "ink" in use
    o = {}
    if pi:
        pd = _th_mix(P, I, .05)
        fd = pd if dark else _th_mix(P, [255, 255, 255], .7)
        o.update({"paper": P, "ink": I, "reader": I, "paper-deep": pd, "field": fd, "surface": fd, "rule": _th_mix(P, I, .18)})
        mu = I
        for t in (.28, .2, .12, 0):
            m = _th_mix(I, P, t)
            if all(_th_ratio(m, x) >= 4.5 for x in (P, fd, pd)):
                mu = m
                break
        o.update({"muted": mu, "placeholder": _th_mix(I, P, .5), "on-ink": P, "on-ink-soft": _th_mix(P, I, .12), "bar-bg": P,
                  "mark": _th_tint(P, deep["amber"], .3, [I])})
    if "accent" in use or pi:
        o["accent"] = A
        o["accent-soft"] = _th_tint(P, A, .14 if dark else .1, [I])
        o["rg-on"] = _th_mix(P, A, .25 if dark else .1)
        best = g("on-accent")
        for x in (P, I):
            if _th_ratio(x, A) > _th_ratio(best, A):
                best = x
        o["on-accent"] = best
    if "bad" in use or pi:
        o["warn"] = deep["warm"]
        o["warn-soft"] = _th_tint(P, deep["warm"], .2 if dark else .12, [deep["warm"]])
    for t in ("warm", "green", "amber", "slate", "teal"):
        own = (t == "green" and "good" in use) or (t == "amber" and "warn" in use) or (t == "warm" and "bad" in use)
        if own:
            o["tone-" + t + "-deep"] = deep[t]
        if own or pi:
            o["tone-" + t] = _th_tint(P, deep[t], .16 if dark else .14, [deep[t], I])
    return {k: _th_hex(v) for k, v in o.items()}


def _th_owes(tok, o, use):
    if tok not in o:
        return []
    d = TH_OWES.get(tok)
    if d is None:
        d = ["paper", "ink"]
        if tok in ("accent-soft", "rg-on", "on-accent"):
            d = d + ["accent"]
        elif tok == "warn-soft":
            d = d + ["bad"]
        elif tok == "mark":
            d = d + ["warn"]
        else:
            m = re.fullmatch(r"tone-(green|amber|warm)", tok)
            if m:
                d = d + [{"green": "good", "amber": "warn", "warm": "bad"}[m.group(1)]]
    return [k for k in d if k in use]


def theme_derive(spec):
    """The renderer's themeDerive, ported: {base, tokens, dropped: [(key, pair, ratio)]}."""
    base = spec.get("base") if spec.get("base") in TH_BASES else "paper"
    B = TH_BASE[base]
    use = {k: spec[k] for k in TH_COLOURS if isinstance(spec.get(k), str) and TH_HEX.fullmatch(spec[k])}
    dropped = []
    for _ in range(8):
        o = _th_build(B, use)
        val = lambda t: _th_rgb(o.get(t) or B[t])
        fails = [(f, b, _th_ratio(val(f), val(b))) for f, b in TH_PAIRS if _th_ratio(val(f), val(b)) < 4.5]
        if not fails:
            return {"base": base, "tokens": o, "dropped": dropped}
        hit = {}
        for f, b, r in fails:
            d = _th_owes(f, o, use) + _th_owes(b, o, use)
            pick = [k for k in d if k not in ("paper", "ink")]
            for k in (pick or d):
                hit.setdefault(k, (f, b, r))
        if not hit:
            break
        for k, (f, b, r) in hit.items():
            use.pop(k, None)
            dropped.append((k, f + " on " + b, round(r * 100) / 100))
    return {"base": base, "tokens": {}, "dropped": dropped}


def check_theme(f, n, code, in_module, have_theme):
    """A `booklet theme` block: key: value lines, one per booklet, outside every module fence."""
    if in_module:
        err(f, f"line {n}: a theme belongs to the booklet, not to a module (put the theme block outside the module's fence)")
        return
    if have_theme:
        err(f, f"line {n}: a booklet has one theme block; this is a second")
        return
    spec = {}
    for off, raw in enumerate(code.split("\n")):
        ln = raw.strip()
        if not ln:
            continue
        at = n + 1 + off
        m = re.match(r'^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$', ln)
        if not m:
            err(f, f"line {at}: a theme line is written `key: value` (found {ln!r})")
            continue
        key, val = m.group(1).lower(), m.group(2).strip()
        if len(val) >= 2 and ((val[0] == '"' and val[-1] == '"') or (val[0] == "'" and val[-1] == "'")):
            val = val[1:-1]
        lists = {"base": TH_BASES, "font": TH_FONTS, "density": TH_DENSITIES}
        if key in lists:
            if val in lists[key]:
                spec[key] = val
            else:
                err(f, f"line {at}: the theme's `{key}: {val}` is not one of {', '.join(lists[key])}")
        elif key in TH_COLOURS:
            if TH_HEX.fullmatch(val):
                spec[key] = val.lower()
            else:
                err(f, f"line {at}: the theme's `{key}: {val}` must be a hex colour, #rgb or #rrggbb (no names, no rgb(), no CSS)")
        else:
            err(f, f"line {at}: a theme has no setting {key!r} (it takes base, paper, ink, accent, good, warn, bad, font, density)")
    for key, pair, ratio in theme_derive(spec)["dropped"]:
        warn(f, f"line {n}: the theme's `{key}` leaves {pair} at {ratio}:1, under 4.5 to 1, so the renderer will use the base theme's {key} instead")


# ---- Rows (format 0.5): `> [!row]` ... `> [!row end]` -----------------------------------------------
def row_cells(rows):
    """How many cells a row's lines make, by the renderer's rule: each heading at the shallowest level used
    starts a cell (what comes before the first is one more); with no headings each block is a cell."""
    heads, fence, blocks, cur = [], None, [], False
    first_content = None
    for i, ln in enumerate(rows):
        fm_ = re.match(r'^ {0,3}(`{3,}|~{3,})(.*)$', ln)
        if fm_:
            if fence is None:
                fence = fm_.group(1)[0]
            elif fm_.group(1)[0] == fence and not fm_.group(2).strip():
                fence = None
            if first_content is None:
                first_content = i
            cur = True
            continue
        if fence:
            continue
        h = re.match(r'^ {0,3}(#{1,6})[ \t]+\S', ln)
        if h:
            heads.append((i, len(h.group(1))))
        if ln.strip():
            if first_content is None:
                first_content = i
            if not cur:
                blocks.append(i)
            cur = True
        else:
            cur = False
    if first_content is None:
        return 0
    if heads:
        lo = min(l for _, l in heads)
        starts = [i for i, l in heads if l == lo]
        return len(starts) + (1 if first_content < starts[0] else 0)
    return len(blocks)


BULLET = re.compile(r'^[ \t]*[-*+][ \t]+(?:\[[ xX]\][ \t]+)?(.*)$')
TASK = re.compile(r'^[ \t]*[-*+][ \t]+\[[ xX]\][ \t]+')
NUMBERED = re.compile(r'^[ \t]*(\d+)[.)][ \t]+(.*)$')


def list_below(lines, i, pattern):
    """The lines of one list straight under line i (zero or one blank line
    between): returns (the pattern's matches, the index after the list)."""
    j, blanks = i, 0
    while j < len(lines) and not lines[j].strip():
        j += 1
        blanks += 1
        if blanks > 1:
            return [], i
    out = []
    while j < len(lines):
        m = pattern.match(lines[j])
        if not m:
            break
        out.append(m)
        j += 1
    return (out, j) if out else ([], i)


def check_settings(f, n, kind, w):
    """A line's settings against KIND_SETTINGS, and an unknown kind (SPEC.md section 4)."""
    allowed = KIND_SETTINGS.get(kind)
    if allowed is None:
        if w["id"] or w["set"] or w["flags"]:
            warn(f, f"line {n}: `{kind}` is not a kind this format defines, so a renderer shows the line as a "
                    f"callout and says it does not know the kind")
        return
    takes = ", ".join(("`" + s + "`") for s in allowed)
    said = f"it takes {takes}" if allowed else "it takes no settings at all"
    for key, val in w["set"].items():
        if key + ":" not in allowed:
            err(f, f"line {n}: a {kind} line takes no `{key}:` setting ({said})")
        elif key in NUMBER_SETTINGS and not re.fullmatch(r"-?[0-9]+(\.[0-9]+)?", val.strip()):
            err(f, f"line {n}: `{key}:{val}` must be a number")
    for flag in sorted(w["flags"]):
        if flag not in allowed:
            err(f, f"line {n}: a {kind} line takes no `{flag}` setting ({said})")
    if "daily" in w["flags"] and "repeat" not in w["flags"]:
        err(f, f"line {n}: `daily` only follows `repeat` (write `repeat daily`)")


def check_format(f, text, fm):
    """Lint a v0.8 booklet. Every problem names its line."""
    lang = fm.get("lang", "")
    if not lang:
        err(f, "front matter has no `lang:` — a v0.8 file is written in one language")
    else:
        why = lang_problem(lang)
        if why:
            err(f, f"front matter `lang: {lang}`: {why}")
        elif lang_warning(lang):
            warn(f, lang_warning(lang))
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
    act_info, q_owner, cur_act, queries, any_module = {}, {}, None, [], False
    loose_questions = []   # questions before any activity line
    open_mod, open_line, section, seen_activity = None, 0, "content", False
    menus, menu_uses, data_blocks = {}, [], {}
    theme_seen = False
    rowst = {"open": None, "start": 0}

    def close_row(end, why=None):
        """The open row ends at line index `end`: say what is wrong with it, or how thin it is."""
        o, body = rowst["open"], lines[rowst["start"]:end]
        rowst["open"] = None
        if why:
            err(f, f"line {o}: the row opened here {why}")
            return
        cells = row_cells(body)
        if cells == 0:
            warn(f, f"line {o}: this row is empty")
        elif cells == 1:
            warn(f, f"line {o}: this row has one cell, so nothing sits beside anything (start a second cell with another heading)")

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
            if words and words[0].lower() == "booklet" and len(words) > 1 and words[1].lower() == "query":
                if section == "content":
                    queries.append((n, code, open_mod, cur_act))
                elif section == "data":
                    err(f, f"line {n}: a query belongs in an activity's prose, not in the data section")
                i = (m if bid else k) + 1
                continue
            if words and words[0].lower() == "booklet" and len(words) > 1 and words[1].lower() == "theme":
                if section != "records":
                    in_module = bool(open_mod) and section == "content"
                    check_theme(f, n, code, in_module, theme_seen)
                    theme_seen = theme_seen or not in_module
                i = (m if bid else k) + 1
                continue
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
                        elif obj.get("engine") not in ENGINES:
                            err(f, f"line {n}: the widget ^{bid} names the engine {obj.get('engine')!r}, which is not one of {', '.join(ENGINES)}")
                        for cell in obj.get("cells") or []:
                            if isinstance(cell, dict) and "color" in cell:
                                col = cell["color"]
                                if isinstance(col, str):
                                    if col not in TONE_NAMES:
                                        err(f, f"line {n}: the widget ^{bid} has the colour {col!r}, which is not a tone name ({', '.join(TONE_NAMES)}); a pair of hex colours is an object with `tint` and `deep`")
                                elif not isinstance(col, dict):
                                    err(f, f"line {n}: the widget ^{bid} has a colour that is neither a tone name ({', '.join(TONE_NAMES)}) nor a pair of hex colours")
                                else:
                                    for part in ("tint", "deep"):
                                        v = col.get(part)
                                        if v is not None and not (isinstance(v, str) and re.fullmatch(r"#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})", v)):
                                            err(f, f"line {n}: the widget ^{bid} has a `{part}` of {v!r}, which is not a hex colour (#rgb or #rrggbb); the renderer will not use it")
                        for fig in obj.get("figures") or []:
                            bad = svg_script_in((fig or {}).get("svg") or "") if isinstance(fig, dict) else None
                            if bad:
                                err(f, f"line {n}: the widget ^{bid} has {', '.join(bad)} in a figure — a figure is a drawing, never a program")
                elif what == "data":
                    if section == "records":
                        pass
                    elif not bid:
                        err(f, f"line {n}: a data block needs a ^id on the line after it")
                    elif obj is not None:
                        why, rows, flds = data_problem(obj)
                        if why:
                            err(f, f"line {n}: the data block ^{bid} {why}")
                        else:
                            keys = set(flds) | {k for r in rows for k in r}
                            nums = {k for r in rows for k, v in r.items() if isinstance(v, (int, float)) and not isinstance(v, bool)}
                            data_blocks[bid] = (open_mod if section == "content" else None, keys, n, nums, rows)
                elif what in ("entries", "draft"):
                    if len(words) < 3:
                        err(f, f"line {n}: `booklet {what}` needs the activity it belongs to")
                    else:
                        entry_refs.append((n, words[2]))
                elif what != "answers":
                    warn(f, f"line {n}: `booklet {what}` is not a block this format defines")
            i = (m if bid else k) + 1
            continue
        if rowst["open"] and re.match(r'^ {0,3}([-*_])([ \t]*\1){2,}[ \t]*$', ln):
            prev = lines[i - 1] if i > 0 else ""
            under_text = prev.strip() and not prev.lstrip().startswith(">") and not re.match(r'^ {0,3}(`{3,}|~{3,})', prev)
            if not (ln.lstrip().startswith("-") and under_text):
                close_row(i, "runs into a page break")
        mm = CALLOUT_LINE.match(ln) or ROW_END.match(ln)
        if mm:
            kind, w = mm.group(1).lower(), callout_words(mm.group(1).lower(), mm.group(2))
            where = f"line {n}"
            check_settings(f, n, kind, w)
            if rowst["open"] and kind in ("data", "records", "module", "activity"):
                close_row(i, "runs into " + {"module": "a module fence", "activity": "an activity line"}.get(kind, f"the {kind} section"))
            if kind == "data":
                section = "data"
            elif kind == "records":
                section = "records"
            elif section == "content":
                if kind == "row":
                    if "end" in w["flags"]:
                        if not rowst["open"]:
                            err(f, f"{where}: a row is closed that was never opened")
                        else:
                            close_row(i)
                    elif rowst["open"]:
                        err(f, f"{where}: a row opens inside a row (rows do not nest)")
                    else:
                        rowst["open"], rowst["start"] = n, i + 1
                elif kind == "module":
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
                        any_module = True
                elif kind == "activity":
                    seen_activity = True
                    cur_act = w["id"] or None
                    if w["id"]:
                        acts.add(w["id"])
                        act_info[w["id"]] = (open_mod, "repeat" in w["flags"] or "daily" in w["flags"])
                elif kind in QUESTION_KINDS:
                    if w["id"] and cur_act:
                        q_owner[w["id"]] = cur_act
                    elif w["id"]:
                        loose_questions.append(w["id"])
                    if not w["id"]:
                        err(f, f"{where}: this {kind} question has no id, so its answer would have nowhere to go")
                    if kind == "widget":
                        body = []
                        k = i + 1
                        while k < len(lines) and lines[k].startswith(">") and not (CALLOUT_LINE.match(lines[k]) or ROW_END.match(lines[k])):
                            body.append(lines[k]); k += 1
                        e = re.search(r'!\[\[[^\]#|]*#\^([A-Za-z0-9-]+)', "\n".join(body))
                        if e:
                            embeds.append((n, e.group(1)))
                        else:
                            err(f, f"{where}: the widget {w['id']!r} names no data block (write ![[#^its-id]] under the line)")
                    if kind == "matrix" and w["id"]:
                        items, after = list_below(lines, i + 1, BULLET)
                        anchors, _ = list_below(lines, after, NUMBERED)
                        if not items:
                            err(f, f"{where}: the matrix {w['id']!r} has no items (a bulleted list under the line)")
                        if not anchors:
                            err(f, f"{where}: the matrix {w['id']!r} has no anchors (a numbered list under its items)")
                        nums = [a.group(1).lstrip("0") or "0" for a in anchors]
                        dup = sorted({x for x in nums if nums.count(x) > 1}, key=int)
                        if dup:
                            err(f, f"{where}: the matrix {w['id']!r} repeats anchor number {', '.join(dup)} (each anchor needs its own number)")
                    if kind in ("choice", "multi") and w["set"].get("menu"):
                        own, _ = list_below(lines, i + 1, TASK)
                        if own:
                            err(f, f"{where}: the question {w['id']!r} has both `menu:{w['set']['menu']}` and a list of its own (use one)")
                        menu_uses.append((n, w["set"]["menu"], open_mod))
                    # Markdown lets only a list starting at 1 interrupt a paragraph:
                    # a list starting at 0 (or 2…) straight under the line joins its title
                    nxt = lines[i + 1] if i + 1 < len(lines) else ""
                    if re.match(r'^ {0,3}(?!1[.)])\d+[.)][ \t]', nxt):
                        err(f, f"line {n + 1}: a numbered list that does not start at 1 needs a blank line above it, "
                               f"or Markdown reads it as part of the question's title")
                elif kind not in STRUCTURE_KINDS:
                    pass                                   # a reading callout; any kind is allowed
            if kind == "menu" and section != "records":
                items, _ = list_below(lines, i + 1, BULLET)
                if not items:
                    err(f, f"{where}: the menu {w['id']!r} has no items (a bulleted list under the line)")
                if w["id"]:
                    menus.setdefault(w["id"], []).append(open_mod if section == "content" else None)
            for old in w["old"]:
                err(f, f"line {n}: settings are written key:value (found {old}); write {old.replace('=', ':', 1)}")
            for key in (w["id"],) if kind in QUESTION_KINDS | {"module", "activity", "menu"} and w["id"] else ():
                if not ID_PATTERN.match(key):
                    err(f, f"line {n}: the id {key!r} may hold only letters, digits and dashes")
                if key in ids and not (kind == "module" and "end" in w["flags"]):
                    err(f, f"line {n}: the id {key!r} is also used on line {ids[key]}")
                ids.setdefault(key, n)
        i += 1
    if rowst["open"]:
        close_row(len(lines), "is never closed")
    if open_mod:
        err(f, f"line {open_line}: the module {open_mod!r} is opened and never closed")
    for n, mid, mod in menu_uses:
        if mid not in menus:
            err(f, f"line {n}: `menu:{mid}` names no menu in this file (write `> [!menu|{mid}]` with a bulleted list)")
        elif mod is not None and mod not in menus[mid]:
            warn(f, f"line {n}: `menu:{mid}` is defined outside module {mod!r}, so the module would not travel whole")
    for n, ref in embeds:
        if ref not in block_ids:
            err(f, f"line {n}: ![[#^{ref}]] points at no block in this file")
        elif not block_ids[ref].lower().startswith("booklet widget"):
            err(f, f"line {n}: ^{ref} is not a widget block")
    # A file with no activity line and no module line is one activity (SPEC section 3),
    # so its queries and questions belong to that one activity.
    if not seen_activity and not any_module:
        act_info[IMPLICIT_ACTIVITY] = (None, False)
        for q in loose_questions:
            q_owner[q] = IMPLICIT_ACTIVITY
        queries = [(n, code, mod, here or IMPLICIT_ACTIVITY) for n, code, mod, here in queries]
    for n, code, mod, here in queries:
        check_query(f, n, code, mod, here, act_info, q_owner, any_module, {k: (v[0], v[1], v[3], v[4]) for k, v in data_blocks.items()})
    for bid, (_, _, n, _, _) in data_blocks.items():
        if bid in ids:
            err(f, f"line {n}: the data block id ^{bid} is also the id on line {ids[bid]}, so a query could not tell them apart")
    for n, ref in entry_refs:
        if ref not in acts:
            warn(f, f"line {n}: records for {ref!r}, which no activity line names")
    check_links(f, lines)


def _plain_heading(s):
    s = re.sub(r'[ \t]+#+[ \t]*$', '', s)
    s = re.sub(r'\[\[([^\]|]*)\|([^\]]*)\]\]', r'\2', s)
    s = re.sub(r'\[\[([^\]]*)\]\]', r'\1', s)
    s = re.sub(r'!?\[([^\]]*)\]\([^)]*\)', r'\1', s)
    return re.sub(r'[*_`]+', '', s).strip()


def _link_norm(s):
    return re.sub(r'\s+', ' ', s).strip().lower()


def _link_slug(s):
    s = unicodedata.normalize("NFC", s).replace("\ufe0f", "").replace("\u200d", "")
    s = re.sub(r'[^\w\s-]', '', _link_norm(s))
    return re.sub(r'\s', '-', s).strip('-')


def check_links(f, lines):
    """Warn on a `[[#Heading]]` or `](#slug)` link that points at no heading in
    the file. A heading is a markdown heading, or the title on an activity or
    question line (`> [!activity|id] Title`). Code fences and `#^block` refs are
    not links."""
    heads, links, fence = [], [], None
    for k, ln in enumerate(lines):
        fm_ = re.match(r'^ {0,3}(`{3,}|~{3,})(.*)$', ln)
        if fm_:
            if fence is None:
                fence = fm_.group(1)[0]
            elif fm_.group(1)[0] == fence and not fm_.group(2).strip():
                fence = None
            continue
        if fence:
            continue
        h = re.match(r'^ {0,3}#{1,6}[ \t]+(.*?)[ \t]*$', ln)
        if h:
            heads.append(_plain_heading(h.group(1)))
        c = re.match(r'^\s*>\s*\[!\w+(?:\|[^\]]*)?\][+-]?\s*(.*?)\s*$', ln)
        if c and c.group(1):
            heads.append(_plain_heading(c.group(1)))
        bare = re.sub(r'`[^`]*`', '', ln)
        for m in re.finditer(r'(?<!!)\[\[#(?!\^)([^\]|]+)(?:\|[^\]]*)?\]\]', bare):
            links.append((k + 1, m.group(1), False))
        for m in re.finditer(r'(?<!!)\[[^\]]*\]\(#([^)\s]*)\)', bare):
            links.append((k + 1, m.group(1), True))
    norms = {_link_norm(x) for x in heads}
    slugs = {_link_slug(x) for x in heads}
    for n, target, by_slug in links:
        if by_slug:
            try:
                want = _link_slug(urllib.parse.unquote(target))
            except Exception:
                want = _link_slug(target)
            ok = bool(want) and want in slugs
        else:
            ok = _link_norm(target) in norms
        if not ok:
            kind = f"](#{target})" if by_slug else f"[[#{target}]]"
            warn(f, f"line {n}: the link {kind} points at no heading in this file")


def check_file(path):
    # a path outside the repo is a normal thing to lint (a file someone was
    # handed, a temp copy), so name it plainly rather than insisting on a
    # repo-relative one
    try:
        f = path.relative_to(BASE)
    except ValueError:
        f = path
    text = path.read_text(encoding="utf-8")
    fm, _ = front_matter(text)
    if fm is None:
        err(f, "no front matter — a booklet opens with a `---` block on line 1")
        return
    if fm.get("booklet") == "0.8":
        check_format(f, text, fm)
        return
    old = fm.get("booklet")
    if old in ("0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7"):
        err(f, f"front matter says booklet: {old}; this is format 0.8. Change the marker to booklet: 0.8"
               + (" (and write settings as key:value, for example min:0)." if old == "0.2" else "."))
        return
    # No earlier format is read — this mirrors the renderer's own
    # parseFile(), which only ever calls parseBooklet(). Anything else is
    # rejected outright rather than checked against an earlier format's rules.
    err(f, f"front matter must say `booklet: 0.8` (found {fm.get('booklet')!r}) — "
           f"no earlier format is read")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if args:
        paths = [pathlib.Path(a).resolve() for a in args]
    else:
        # every booklet in the repo's standard directories, but not the prose
        # that documents them; a directory that doesn't exist is skipped
        paths = sorted(x for d in ("modules", "widgets", "examples")
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