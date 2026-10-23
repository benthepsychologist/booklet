#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Ben Armstrong
"""
Lint a booklet file against the v0.13 format in SPEC.md.

A booklet is one portable Markdown file: front matter that says `booklet: "0.13"`,
prose, Booklet lines written `> [!kind|id words] Title`, and data in fenced
blocks. A malformed file is an activity that renders wrong or not at all for
whoever was handed it, so this linter catches it before the file is shared. Its
checks mirror parseBooklet() in booklet.html, so the two agree on what is wrong.

What it checks: the front matter (`booklet: "0.13"`, one `lang:`), fences that are
closed, ids that are unique within their module (module ids within the file), modules that open and close, widgets that
name a data block that exists, widget JSON that parses and names an engine, no
script in a widget's SVG, numbered-list lines that would swallow a question's
title, queries and data blocks, and records that name an activity. It reports what the renderer refuses or drops (an activity or
module line with no id; a choice or multi with no options and a scale with no or repeated anchors; a records line naming no module;
records outside `%%`), what it keeps and reports (anything but a record inside the records region, an entry with no `ts`, a record
block outside the region, a `> [!` line it cannot read), and six slips that draw wrong without a word (`---` straight under text, a hint
or solution not folded or not under its question, `[x]` in a menu, a price that reads as a formula, tiles with no `value`). Any file whose
front matter has no `booklet:` marker, or one that is not a 0.x version, is rejected; another 0.x marker is a warning and the file is checked as 0.13 (nothing before v1.0 is stable). A block id or a footnote
id that two modules both use is a warning, not an error: Booklet reads each in its own module, while
Obsidian and GitHub read those two across the whole file.

Usage:  python3 lint-booklet.py [path ...]
        python3 lint-booklet.py --marker             prints the front-matter line a file should carry (booklet: "0.13") and exits 0
        python3 lint-booklet.py --help               prints this text
A tool that writes booklets should ask for the marker with --marker, not hard-code it.
Default (no arguments): every *.md file in modules/, widgets/, and
examples/ next to this script, skipping any of those directories that don't
exist and skipping readme.md (case-insensitive).
Findings print in line order, file by file, an error marked `ERROR` and a warning `warn`.
Exit 0 clean, 1 on any error. Warnings never fail the build.
"""
import difflib, html, json, math, pathlib, re, sys, unicodedata, urllib.parse

BASE = pathlib.Path(__file__).resolve().parent

# The format this linter reads, as TEXT: `0.10` is not the number 0.1, and a version is never turned into a number
FORMAT_VERSION = "0.13"

errors, warnings = [], []
# Every finding, in the order found; main() prints each file's findings in line order. A finding's line is the one its message
# names (`line 12: ...`); one that names none is about the whole file and prints first.
findings = []
FILE_NO = 0
def _add(kind, f, m):
    at = re.match(r"line (\d+)", m)
    findings.append((FILE_NO, int(at.group(1)) if at else 0, len(findings), kind, f"{f}: {m}"))
def err(f, m):
    errors.append(f"{f}: {m}")
    _add("ERROR", f, m)
def warn(f, m):
    warnings.append(f"{f}: {m}")
    _add("warn ", f, m)


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


# A v0.13 booklet is Markdown: front matter, prose, and Booklet lines
# written `> [!kind|id words] Title`, with data in fenced blocks. These checks
# mirror parseBooklet() in booklet.html, so the linter and the page agree on what is
# wrong with a file. See SPEC.md for the format.
CALLOUT_LINE = re.compile(r'^>[ \t]?\[!([A-Za-z0-9][A-Za-z0-9-]*)(?:\|([^\]]*))?\]([+-]?)[ \t]*(.*)$')
# the old way to close a row (before 0.13), which a reader does not read: a row closes with `> [!row|end]`
OLD_ROW_END = re.compile(r'^>[ \t]?\[!row[ \t]+end\]', re.I)
ID_PATTERN = re.compile(r'^[A-Za-z0-9][A-Za-z0-9-]*$')
# What each kind of booklet line takes after its id: a flag is a bare word, `key:` a setting written key:value.
# The same table is KIND_SETTINGS in booklet.html and in SPEC.md section 4 (test/guard.test.js pins the three
# together). A kind in this table is a kind the format defines; any other kind with an id or settings is unknown.
KIND_SETTINGS = {
    "module": ("end", "icon:"), "activity": ("repeat", "daily", "hidden", "icon:", "parent:", "status:"), "row": ("end",), "text": ("long",),
    "lines": (), "scale": (), "matrix": (), "date": (), "menu": (), "hint": (), "solution": (),
    "data": (), "records": (), "manifest": (), "notice": (), "group": (), "diff": (), "law": (), "opinion": (),
    "choice": ("open", "menu:"), "multi": ("open", "menu:"),
    "number": ("min:", "max:", "step:"), "widget": ("readonly", "describe"),
}
NUMBER_SETTINGS = ("min", "max", "step")
# the kinds that take no id: their words are settings only
NO_ID_KINDS = ("row", "notice", "manifest", "hint", "solution", "group", "diff", "law", "opinion")
# Booklet's icon set: the names in art/icons/ (Lucide 1.48). GENERATED: `node test/art-sprite.js --write booklet.html` rewrites
# the list between the markers, and `--check` fails if it has drifted. An `icon:` setting or an `icon` role value outside it is reported.
# icons:start
ICON_NAMES = frozenset((
    "activity", "anchor", "archive", "arrow-left", "arrow-right", "award", "badge-check", "bed", "book", "book-open",
    "bookmark", "box", "brain", "briefcase", "bug", "calendar", "calendar-clock", "camera", "chart-column",
    "chart-line", "chart-pie", "check", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle",
    "circle-alert", "circle-check", "circle-dashed", "circle-dot", "circle-help", "clipboard-list", "clock", "cloud",
    "code", "coffee", "cog", "coins", "compass", "contrast", "database", "download", "droplet", "ear", "ellipsis",
    "external-link", "eye", "feather", "fence", "file-text", "flag", "flame", "flask-conical", "folder",
    "folder-open", "footprints", "gauge", "gavel", "gift", "git-compare", "glasses", "globe", "graduation-cap",
    "hammer", "hand", "hand-heart", "handshake", "hash", "heart", "hourglass", "house", "image", "inbox", "info",
    "key", "landmark", "layers", "layout-grid", "leaf", "life-buoy", "lightbulb", "link", "list", "list-checks",
    "list-ordered", "list-tree", "lock", "mail", "map", "map-pin", "menu", "message-circle", "messages-square", "mic",
    "microscope", "milestone", "minus", "moon", "mountain", "music", "notebook", "notebook-pen", "octagon-alert",
    "package", "package-plus", "palette", "pause", "pen-line", "pencil", "phone", "piggy-bank", "play", "plus",
    "puzzle", "quote", "refresh-cw", "repeat", "rocket", "rotate-ccw", "route", "ruler", "scale", "scissors",
    "search", "send", "settings", "shapes", "shield", "ship-wheel", "shuffle", "signpost", "sliders-horizontal",
    "smile", "sparkles", "sprout", "square-check", "star", "stethoscope", "sticky-note", "sun", "sunrise", "table",
    "target", "telescope", "tent", "thumbs-up", "timer", "traffic-cone", "trees", "triangle-alert", "trophy",
    "umbrella", "user", "users", "wallet", "waves", "wind", "wrench", "x", "zap",
))
# icons:end
# the widget engines the renderer has
ENGINES = ("svg-regions", "grid-select")
COLOUR_NAMES = ("warm", "green", "amber", "slate", "teal")
QUESTION_KINDS = {"text", "lines", "widget", "choice", "multi", "scale", "number", "date", "matrix"}
STRUCTURE_KINDS = {"module", "activity", "data", "records", "manifest", "menu", "hint", "solution", "row", "notice", "group", "diff", "law", "opinion"}
# what a module's notice (`> [!notice]`) may say about itself
NOTICE_KEYS = ("license", "copyright", "source", "version")


def callout_words(kind, s):
    """`kind|id words` -> the id, the flags and the key:value settings. For a kind that takes an id (SPEC.md section 4) the
    first word is the id, whatever it is called, and every word after it is a setting; a kind that takes none has settings only."""
    out = {"id": None, "flags": set(), "set": {}}
    for n, w in enumerate((s or "").split()):
        kv = re.match(r'^([A-Za-z][A-Za-z0-9-]*):(.*)$', w)
        if n == 0 and kind not in NO_ID_KINDS:
            out["id"] = w
        elif kv:
            out["set"][kv.group(1).lower()] = kv.group(2)
        else:
            out["flags"].add(w.lower())
    return out


# A query's fourteen keys, the six views, and which keys each view draws. A new key or view needs two
# real pages that need it (SPEC.md, design rules for views). `from`, `as` and `empty` apply to every view.
QUERY_KEYS = ("from", "as", "fields", "group", "limit", "parent", "empty", "label", "value", "note", "badge", "tone", "link", "icon")
QUERY_VIEWS = ("cards", "table", "list", "tiles", "bars", "line")
VIEW_DRAWS = {
    "cards": ("label", "value", "note", "badge", "tone", "fields", "group", "limit", "link", "icon"),
    "table": ("fields", "group", "limit", "badge", "tone", "link", "icon"),
    "list": ("label", "value", "note", "badge", "tone", "fields", "group", "limit", "parent", "link", "icon"),
    "tiles": ("label", "value", "note", "tone", "group", "limit", "link", "icon"),
    "bars": ("label", "value", "tone", "limit"),
    "line": ("label", "value", "fields", "limit"),
}
QUERY_EVERY_VIEW = ("from", "as", "empty")
# the settings that name a field of the rows being drawn
QUERY_FIELD_KEYS = ("group", "parent", "label", "value", "note", "badge", "tone", "link", "icon")


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
        err(f, f"line {n}: a query needs `from:`, the activity, question or data block it shows")
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
    # cards over kept entries are titled by their date and list their questions: the roles that name a row's parts are not drawn there
    # (over a data block they are: `label` the title, `value` the figure, `note`, `badge`, `tone`)
    if view == "cards" and src_act:
        for key in ("label", "value", "note", "badge", "tone"):
            if key in s:
                warn(f, f"line {n}: the query's `{key}:` is not drawn on cards over kept entries (each card is titled by its date and lists its questions); use `as: list` or `as: table` to draw it")
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
        # an `icon` role value is a name from Booklet's icon set (section 6); one that is not is not drawn
        if src_data is not None and "icon" in drawn:
            ikey = s.get("icon", "icon")
            bad = sorted({str(r.get(ikey)).strip() for r in src_rows
                          if str(r.get(ikey, "")).strip() and str(r.get(ikey)).strip() not in ICON_NAMES})
            if bad:
                shown = ", ".join(repr(x) for x in bad[:5]) + (f" and {len(bad) - 5} more" if len(bad) > 5 else "")
                warn(f, f"line {n}: the rows' `{ikey}` holds {shown}, which {'is' if len(bad) == 1 else 'are'} not in Booklet's icon set (art/icons/), so no picture is drawn for {'it' if len(bad) == 1 else 'them'}" + (icon_hint(bad[0]) if len(bad) == 1 else ""))
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
        # tiles draw the field `value`: with none, and a number in some other field, each tile is a pill with no number
        if src_data is not None and view == "tiles" and "value" not in s and "value" not in names and src_nums:
            num = next(k for r in src_rows for k in r if k in src_nums)
            warn(f, f"line {n}: the query's `as: tiles` has no `value:` and no row has a `value` field, so each tile is a pill with no number; "
                    f"`{num}` holds a number, so add `value: {num}`")
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
TH_STYLES = ("teaching", "briefing")
TH_HEX = re.compile(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})")
TH_BASE = {
    "paper": {
        "paper": "#f8f6f1", "paper-deep": "#efebe3", "ink": "#24323a",
        "muted": "#56646b", "reader": "#24323a", "field": "#fefdfb",
        "surface": "#fefdfb", "warn": "#a04e34", "warn-soft": "#ffe4de",
        "accent": "#1e5e6b", "accent-soft": "#e4efef", "on-accent": "#ffffff",
        "on-ink": "#ffffff", "mark": "#fff3b0", "tone-warm": "#f9e3e8",
        "tone-warm-deep": "#a3405b", "tone-green": "#e1f1e7", "tone-green-deep": "#2d7751",
        "tone-amber": "#f8ebd0", "tone-amber-deep": "#8b5f10", "tone-slate": "#e6e9ec",
        "tone-slate-deep": "#3e4e59", "tone-teal": "#e4efef", "tone-teal-deep": "#15464f",
        "h-sky": "#e3eef7", "h-sky-vivid": "#3f7fb5", "h-sky-solid": "#2f6fa8",
        "h-sky-deep": "#2f6596", "h-rose": "#f9e3e8", "h-rose-vivid": "#bf5470",
        "h-rose-solid": "#b4475f", "h-rose-deep": "#a3405b", "h-sage": "#e2f0e7",
        "h-sage-vivid": "#4f8c6b", "h-sage-solid": "#3d7f5b", "h-sage-deep": "#3b6e52",
        "h-sun": "#fbf0d6", "h-sun-vivid": "#b07a0f", "h-sun-solid": "#9a6408",
        "h-sun-deep": "#8a5e0b", "h-lilac": "#ece8f6", "h-lilac-vivid": "#7462b5",
        "h-lilac-solid": "#6553ad", "h-lilac-deep": "#6453a6", "h-petrol": "#e4efef",
        "h-petrol-vivid": "#1e5e6b", "h-petrol-solid": "#1e5e6b", "h-petrol-deep": "#15464f",
        "h-slate": "#e6e9ec", "h-slate-vivid": "#5b6b76", "h-slate-solid": "#4e5d68",
        "h-slate-deep": "#3e4e59", "on-solid": "#ffffff",
    },
    "daylight": {
        "paper": "#ffffff", "paper-deep": "#f3f4f6", "ink": "#1f2328",
        "muted": "#57606a", "reader": "#1f2328", "field": "#ffffff",
        "surface": "#ffffff", "warn": "#a04e34", "warn-soft": "#fbe9e4",
        "accent": "#103e46", "accent-soft": "#e6f0f1", "on-accent": "#ffffff",
        "on-ink": "#ffffff", "mark": "#fff3b0", "tone-warm": "#fae8ec",
        "tone-warm-deep": "#a3405b", "tone-green": "#e1f1e7", "tone-green-deep": "#2d7751",
        "tone-amber": "#f8ebd0", "tone-amber-deep": "#8b5f10", "tone-slate": "#eceff1",
        "tone-slate-deep": "#3e4e59", "tone-teal": "#e6f0f0", "tone-teal-deep": "#15464f",
        "h-sky": "#e8f1f9", "h-sky-vivid": "#3f7fb5", "h-sky-solid": "#2f6fa8",
        "h-sky-deep": "#2f6596", "h-rose": "#fae8ec", "h-rose-vivid": "#bf5470",
        "h-rose-solid": "#b4475f", "h-rose-deep": "#a3405b", "h-sage": "#e6f2ea",
        "h-sage-vivid": "#4f8c6b", "h-sage-solid": "#3d7f5b", "h-sage-deep": "#3b6e52",
        "h-sun": "#fbf2dc", "h-sun-vivid": "#b07a0f", "h-sun-solid": "#9a6408",
        "h-sun-deep": "#8a5e0b", "h-lilac": "#efecf8", "h-lilac-vivid": "#7462b5",
        "h-lilac-solid": "#6553ad", "h-lilac-deep": "#6453a6", "h-petrol": "#e6f0f0",
        "h-petrol-vivid": "#1e5e6b", "h-petrol-solid": "#1e5e6b", "h-petrol-deep": "#15464f",
        "h-slate": "#eceff1", "h-slate-vivid": "#5b6b76", "h-slate-solid": "#4e5d68",
        "h-slate-deep": "#3e4e59", "on-solid": "#ffffff",
    },
    "night": {
        "paper": "#11181c", "paper-deep": "#1d2a31", "ink": "#e7edef",
        "muted": "#a9b7bd", "reader": "#e7edef", "field": "#18232a",
        "surface": "#18232a", "warn": "#e08a6b", "warn-soft": "#3a2620",
        "accent": "#7cc0cb", "accent-soft": "#163139", "on-accent": "#0e1a1e",
        "on-ink": "#11181c", "mark": "#5c4e12", "tone-warm": "#381f28",
        "tone-warm-deep": "#ec93aa", "tone-green": "#172e24", "tone-green-deep": "#8cc8a5",
        "tone-amber": "#31281a", "tone-amber-deep": "#f0ba55", "tone-slate": "#232d33",
        "tone-slate-deep": "#a9bbc6", "tone-teal": "#163139", "tone-teal-deep": "#7cc0cb",
        "h-sky": "#172a3b", "h-sky-vivid": "#88b8e4", "h-sky-solid": "#3a78b0",
        "h-sky-deep": "#88b8e4", "h-rose": "#381f28", "h-rose-vivid": "#ec93aa",
        "h-rose-solid": "#b24a64", "h-rose-deep": "#ec93aa", "h-sage": "#172e24",
        "h-sage-vivid": "#8cc8a5", "h-sage-solid": "#3e8160", "h-sage-deep": "#8cc8a5",
        "h-sun": "#31281a", "h-sun-vivid": "#f0ba55", "h-sun-solid": "#946410",
        "h-sun-deep": "#f0ba55", "h-lilac": "#25223a", "h-lilac-vivid": "#b3a5ee",
        "h-lilac-solid": "#6e5db8", "h-lilac-deep": "#b3a5ee", "h-petrol": "#163139",
        "h-petrol-vivid": "#7cc0cb", "h-petrol-solid": "#2a7280", "h-petrol-deep": "#7cc0cb",
        "h-slate": "#232d33", "h-slate-vivid": "#a9bbc6", "h-slate-solid": "#56666f",
        "h-slate-deep": "#a9bbc6", "on-solid": "#ffffff",
    },
    "contrast": {
        "paper": "#ffffff", "paper-deep": "#ededed", "ink": "#000000",
        "muted": "#1a1a1a", "reader": "#000000", "field": "#ffffff",
        "surface": "#ffffff", "warn": "#8b0000", "warn-soft": "#fde7e7",
        "accent": "#003b49", "accent-soft": "#ffffff", "on-accent": "#ffffff",
        "on-ink": "#ffffff", "mark": "#ffe600", "tone-warm": "#ffe9ee",
        "tone-warm-deep": "#7a0f2e", "tone-green": "#e8f5e0", "tone-green-deep": "#1b4d0e",
        "tone-amber": "#fff3c4", "tone-amber-deep": "#5c4300", "tone-slate": "#e6eaee",
        "tone-slate-deep": "#243746", "tone-teal": "#ddf2f0", "tone-teal-deep": "#004d45",
        "h-sky": "#e6f0fa", "h-sky-vivid": "#003a70", "h-sky-solid": "#003a70",
        "h-sky-deep": "#003a70", "h-rose": "#ffe9ee", "h-rose-vivid": "#7a0f2e",
        "h-rose-solid": "#7a0f2e", "h-rose-deep": "#7a0f2e", "h-sage": "#e8f5e0",
        "h-sage-vivid": "#1b4d0e", "h-sage-solid": "#1b4d0e", "h-sage-deep": "#1b4d0e",
        "h-sun": "#fff3c4", "h-sun-vivid": "#5c4300", "h-sun-solid": "#5c4300",
        "h-sun-deep": "#5c4300", "h-lilac": "#efeafb", "h-lilac-vivid": "#3a2380",
        "h-lilac-solid": "#3a2380", "h-lilac-deep": "#3a2380", "h-petrol": "#ddf2f0",
        "h-petrol-vivid": "#004d45", "h-petrol-solid": "#004d45", "h-petrol-deep": "#004d45",
        "h-slate": "#e6eaee", "h-slate-vivid": "#243746", "h-slate-solid": "#243746",
        "h-slate-deep": "#243746", "on-solid": "#ffffff",
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
# the hues: deep text on its wash, on a card and on the page; ink on the wash; then the pictures, at 3 to 1: the vivid line
# on the wash and white on the solid fill
TH_HUES = ("sky", "rose", "sage", "sun", "lilac", "petrol", "slate")
for _h in TH_HUES:
    TH_PAIRS += [("h-" + _h + "-deep", "h-" + _h), ("h-" + _h + "-deep", "surface"), ("h-" + _h + "-deep", "paper"),
                 ("ink", "h-" + _h), ("h-" + _h + "-vivid", "h-" + _h, 3), ("on-solid", "h-" + _h + "-solid", 3)]
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


def _th_tint(P, tgt, t0, fgs, gfx=()):
    """A tint of paper toward tgt, as strong as t0, eased back until every colour in fgs reads on it (4.5) and every one in gfx (3)."""
    for k in (1, .7, .4, 0):
        c = _th_mix(P, tgt, t0 * k)
        if all(_th_ratio(f, c) >= 4.5 for f in fgs) and all(_th_ratio(f, c) >= 3 for f in gfx):
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
        for h in TH_HUES:
            d = g("h-" + h + "-deep")
            o["h-" + h] = _th_tint(P, d, .16 if dark else .12, [d, I], [g("h-" + h + "-vivid")])
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
        fails = [(x[0], x[1], _th_ratio(val(x[0]), val(x[1]))) for x in TH_PAIRS
                 if _th_ratio(val(x[0]), val(x[1])) < (x[2] if len(x) > 2 else 4.5)]
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
        lists = {"base": TH_BASES, "font": TH_FONTS, "density": TH_DENSITIES, "style": TH_STYLES}
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
            err(f, f"line {at}: a theme has no setting {key!r} (it takes base, paper, ink, accent, good, warn, bad, font, density, style)")
    for key, pair, ratio in theme_derive(spec)["dropped"]:
        warn(f, f"line {n}: the theme's `{key}` leaves {pair} at {ratio}:1, under 4.5 to 1, so the renderer will use the base theme's {key} instead")


# ---- Rows (format 0.5): `> [!row]` ... `> [!row|end]` -----------------------------------------------
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


# any line that starts like a Booklet line, readable or not (the renderer's `calloutLine`)
CALLOUT_ANY = re.compile(r'^>[ \t]?\[!')
FENCE_LINE = re.compile(r'^ {0,3}(`{3,}|~{3,})(.*)$')
RECORD_KINDS = ("answers", "entries", "draft")
DESIGN_KINDS = ("widget", "data", "theme", "query")


def fence_end(lines, i, mark):
    """The index of the line that closes the fence opened at line i by `mark`, or len(lines) if it never closes."""
    k = i + 1
    while k < len(lines):
        c = re.match(r'^ {0,3}(`{3,}|~{3,})[ \t]*$', lines[k])
        if c and c.group(1)[0] == mark[0] and len(c.group(1)) >= len(mark):
            break
        k += 1
    return k


def body_end(lines, i):
    """The index past the `>` lines that belong to the Booklet line at i. A `> [!` line ends them, readable or not."""
    k = i + 1
    while k < len(lines) and lines[k].startswith(">") and not CALLOUT_ANY.match(lines[k]):
        k += 1
    return k


def claim_end(kind, lines, i):
    """The index past everything the renderer reads as belonging to the Booklet line at i: its body, then the list straight under
    a choice, multi (a task list), scale (a numbered list), menu (bullets) or matrix (bullets, then numbered anchors)."""
    k = body_end(lines, i)
    pat = {"choice": TASK, "multi": TASK, "scale": NUMBERED, "menu": BULLET, "matrix": BULLET}.get(kind)
    if pat:
        got, k2 = list_below(lines, k, pat)
        if got:
            k = k2
            if kind == "matrix":
                k = list_below(lines, k, NUMBERED)[1]
    return k


def records_regions(lines, start):
    """The records regions of a file, found the way the renderer finds them (SPEC.md section 8): from the `%%` directly before a
    records line (only blank lines between), or from the records line itself when no `%%` is there, to the `%%` that closes it, or
    the end of the file. Returns [(first line index, last line index, opened by `%%`, closed by `%%`, the records line's index)]."""
    regs, rs, via, rec_at, i = [], None, False, None, start
    while i < len(lines):
        ln = lines[i]
        fm_ = FENCE_LINE.match(ln)
        if fm_:
            i = fence_end(lines, i, fm_.group(1)) + 1
            continue
        if ln.strip() == "%%":
            if rs is not None:
                regs.append((rs, i, via, True, rec_at))
                rs = None
            else:
                j = i + 1
                while j < len(lines) and not lines[j].strip():
                    j += 1
                if j < len(lines) and re.match(r'^>[ \t]?\[!records\b', lines[j], re.I):
                    rs, via, rec_at = i, True, j
            i += 1
            continue
        mm = CALLOUT_LINE.match(ln)
        if mm:
            if mm.group(1).lower() == "records" and rs is None:
                rs, via, rec_at = i, False, i
            i = claim_end(mm.group(1).lower(), lines, i)
            continue
        i += 1
    if rs is not None:
        regs.append((rs, len(lines) - 1, via, False, rec_at))
    return regs


def icon_close(name, n=3):
    """Up to three names from the icon set that are close to `name`: the same words in another order (`check-circle`,
    `circle-check`), a close spelling (`compas`), or a name sharing a word of four letters or more (`calendar-days`)."""
    low = name.lower()
    words = set(re.split(r"[-_ ]+", low)) - {""}
    names = sorted(ICON_NAMES)
    out = [low] if low in ICON_NAMES and name != low else []          # `Check` -> `check`
    out += [c for c in names if set(c.split("-")) == words]
    out += [c for c in names if any(len(x) >= 4 and x in c.split("-") for x in words)]
    out += difflib.get_close_matches(low, names, n=n, cutoff=0.75)
    seen = []
    for c in out:
        if c not in seen and (c != low or name != low):
            seen.append(c)
    return seen[:n]


def icon_hint(name):
    near = icon_close(name)
    return f"; did you mean {', '.join('`' + c + '`' for c in near)}?" if near else ""


HTML_BLOCK_START = re.compile(r'^ {0,3}<[A-Za-z/!?]')
THEMATIC_BREAK = re.compile(r'^ {0,3}([-*_])([ \t]*\1){2,}[ \t]*$')


def continues_paragraph(line):
    """Would this line, straight under a callout's lines, continue their paragraph (Markdown's "lazy continuation")? Not when it is blank,
    starts a quote (`>`), or starts a block of its own: a fence, a heading, a thematic break, a list item or an HTML block."""
    if not line.strip() or line.startswith(">"):
        return False
    if (FENCE_LINE.match(line) or re.match(r'^ {0,3}#{1,6}([ \t]|$)', line) or THEMATIC_BREAK.match(line)
            or re.match(r'^ {0,3}[-*+][ \t]+\S', line) or re.match(r'^ {0,3}1[.)][ \t]+\S', line) or HTML_BLOCK_START.match(line)):
        return False
    return True


def check_settings(f, n, kind, w):
    """A line's settings against KIND_SETTINGS, and an unknown kind (SPEC.md section 4)."""
    allowed = KIND_SETTINGS.get(kind)
    if allowed is None:
        if w["id"] or w["set"] or w["flags"]:
            warn(f, f"line {n}: `{kind}` is not a kind this format defines, so a renderer shows the line as a "
                    f"callout and says it does not know the kind")
        return
    if w["id"] and kind not in NO_ID_KINDS and w["id"].lower() in {a for a in allowed if not a.endswith(":")}:
        warn(f, f"line {n}: `{w['id']}` is this {kind}'s id; settings follow the id")
    takes = ", ".join(("`" + s + "`") for s in allowed)
    said = f"it takes {takes}" if allowed else "it takes no settings at all"
    for key, val in w["set"].items():
        if key + ":" not in allowed:
            err(f, f"line {n}: a {kind} line takes no `{key}:` setting ({said})")
        elif key in NUMBER_SETTINGS and not re.fullmatch(r"-?[0-9]+(\.[0-9]+)?", val.strip()):
            err(f, f"line {n}: `{key}:{val}` must be a number")
        elif key == "icon" and "end" in w["flags"]:
            err(f, f"line {n}: a module's end line takes no `icon:` (write it on the opening line)")
        elif key == "icon" and val not in ICON_NAMES:
            err(f, f"line {n}: `icon:{val}` is not a name in Booklet's icon set (art/icons/), so a renderer ignores it" + icon_hint(val))
        elif key == "status" and val != "off":
            err(f, f"line {n}: `status:{val}` is not a setting a line takes (only `status:off`, which hides the card's status line); a renderer ignores it")
        elif key == "parent" and not ID_PATTERN.match(val):
            err(f, f"line {n}: `parent:{val}` must be an activity id (letters, digits and dashes)")
    for flag in sorted(w["flags"]):
        if flag not in allowed:
            err(f, f"line {n}: a {kind} line takes no `{flag}` setting ({said})")
    if "daily" in w["flags"] and "repeat" not in w["flags"]:
        err(f, f"line {n}: `daily` needs `repeat` (write `repeat daily`)")


def check_notice(f, n, w, lines, i, mod, has_activity, seen, in_content):
    """A module's notice: one callout inside the module's fence, before its first activity, with no id and no settings
    (checked with the rest of the line's settings), holding `key: value` lines for license, copyright, source and version."""
    if not (in_content and mod) or has_activity:
        err(f, f"line {n}: a notice belongs inside a module's fence, before the module's first activity")
        return
    if mod in seen:
        err(f, f"line {n}: the module {mod!r} has two notices (a module has one)")
    seen.add(mod)
    k = i + 1
    while k < len(lines) and lines[k].startswith(">") and not CALLOUT_ANY.match(lines[k]):
        body = re.sub(r'^>[ \t]?', '', lines[k]).strip()
        if body:
            kv = re.match(r'^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$', body)
            if not kv:
                err(f, f"line {k + 1}: a notice line is written `key: value` (found {body!r})")
            elif kv.group(1).lower() not in NOTICE_KEYS:
                err(f, f"line {k + 1}: a notice has {', '.join(NOTICE_KEYS)}, not {kv.group(1)!r}")
        k += 1


def check_format(f, text, fm):
    """Lint a v0.13 booklet. Every problem names its line."""
    fm_title, fm_id = fm.get("title", ""), fm.get("id", "")
    lang = fm.get("lang", "")
    if not lang:
        err(f, "front matter has no `lang:` — a v0.13 file is written in one language; add `lang: en` (or es, es-AR, fr, or any other language tag)")
    else:
        why = lang_problem(lang)
        if why:
            err(f, f"front matter `lang: {lang}`: {why}; write a language tag such as en, es, es-AR or fr")
        elif lang_warning(lang):
            warn(f, lang_warning(lang))
    if not fm.get("title"):
        warn(f, "front matter has no `title:`")
    if "start" in fm and fm["start"] != "home":
        err(f, f"front matter `start: {fm['start']}`: the only value is `start: home` (a booklet that holds one activity or one module opens "
               "straight into it unless it says `start: home`); the renderer reports it and ignores it")
    lines = text.replace("\r\n", "\n").split("\n")
    i = 0
    if lines and lines[0].strip() == "---":
        i = 1
        while i < len(lines) and lines[i].strip() != "---":
            i += 1
        i += 1
    # An id belongs to its module (SPEC.md section 4). Every table below is kept per scope: a module's id,
    # or None for the activities outside every fence (one module with no name) and for the data section
    # (blocks and menus outside every fence), which every module may also use.
    ids, block_ids, embeds, entry_refs = {}, {}, [], []
    acts = {}                # scope -> {activity id: line}
    parents = {}             # scope -> [(activity id, its parent: setting, line)]
    mod_ids = {}             # module ids -> line
    note_defs = {}           # scope -> {footnote id: line}
    act_info, q_owner, cur_act, queries, any_module = {}, {}, None, [], False
    loose_questions = []   # questions before any activity line
    early_questions = []   # the same, with their line and kind, before the file's first module or activity line
    open_mod, open_line, section, seen_activity = None, 0, "content", False
    rec_id = None            # the module id on the records line the blocks below sit under (None: the line names none)
    rec_lines = []           # (line, id) of every records line that names a module, checked once the file is read
    data_scope = None        # the module a `> [!data|module-id]` section belongs to, until the next data, records, module or activity line
    notice_seen, mod_has_activity = set(), False
    body_start = i
    menus, menu_uses, data_blocks = {}, [], {}
    theme_seen = False
    rowst = {"open": None, "start": 0}
    noid_line = None         # the line of a module opened without an id, until something closes it
    last_q = False           # a question is straight above: a hint or solution here folds under it (the renderer's lastQ)
    prev_prose = False       # the line above is prose in the renderer's buffer, so `---` under it makes it a heading
    regions = records_regions(lines, i)
    reg_at = {r[0]: r for r in regions}
    in_region, saved_section = None, "content"

    def scope_mod():
        """The module a block, menu or footnote belongs to: the one whose fence holds it or whose data section it is
        under; None for a shared one (the plain data section) and for what sits outside every fence."""
        return open_mod if section == "content" else data_scope if section == "data" else None

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

    def check_record_block(n, info, code):
        """A fenced block inside the records region (SPEC.md section 8): a record is read, anything else is kept as written."""
        words = info.split()
        is_booklet = bool(words) and words[0].lower() == "booklet"
        what = words[1].lower() if len(words) > 1 else ""
        if not is_booklet or what in DESIGN_KINDS:
            shown = f"a `booklet {what}` block" if is_booklet else "a fenced block"
            warn(f, f"line {n}: {shown} inside the records region is not a record, so it is kept as written and not read; "
                    f"move it above the records, or delete it")
        elif what == "sync":
            return                      # a record SPEC.md defines (section 8) that this renderer keeps and does not read
        elif what not in RECORD_KINDS:
            warn(f, f"line {n}: `booklet {what}` is not a block this format defines")
        elif what != "answers" and len(words) < 3:
            warn(f, f"line {n}: `booklet {what}` names no activity, so it is kept as written and not read; write `booklet {what} my-activity`")
        else:
            try:
                obj = json.loads(code)
            except ValueError as e:
                err(f, f"line {n}: the `booklet {what}` block is not valid JSON ({e.msg}, its line {e.lineno}); a record that cannot be read is a reader's "
                       f"answers or entries the page cannot use, so fix the comma or quote")
                return
            if not isinstance(obj, dict):
                warn(f, f"line {n}: the `{info}` block holds no object, so it is kept as written and not read; write a JSON object, `{{ ... }}`")
                return
            if what == "entries":
                items = obj.get("items")
                if not isinstance(items, list):
                    warn(f, f"line {n}: the `booklet entries {words[2]}` block holds no `items` list, so it is kept as written and not read; "
                            f"write `{{\"items\": [ ... ]}}`")
                elif not all(isinstance(e, dict) and e.get("ts") for e in items):
                    warn(f, f"line {n}: an entry in the `booklet entries {words[2]}` block has no `ts`, so the block is kept as written and not read; "
                            f"give every entry a `ts`, the time it was kept (`\"ts\": \"2026-09-27T14:02:00Z\"`)")
            if what != "answers":
                entry_refs.append((n, words[2], rec_id))

    while i < len(lines):
        ln, n = lines[i], i + 1
        was_prose, prev_prose = prev_prose, False
        if i in reg_at:
            in_region, saved_section, section = reg_at[i], section, "records"
            rec_id = None
            if rowst["open"]:
                close_row(i, "runs into the records section")
            if not in_region[2]:
                warn(f, f"line {in_region[4] + 1}: the records section is not inside `%%` … `%%`; put the records region between `%%` lines "
                    f"(one above `> [!records]`, one after the last record) so editors hide it; the renderer reads it either way")
        if in_region:
            if ln.strip() == "%%" and i == in_region[1] and in_region[3]:
                in_region, section = None, saved_section        # the closing `%%`: the file is design again
                i += 1
                continue
            if not ln.strip() or (ln.strip() == "%%" and i == in_region[0]):
                i += 1
                continue
            fr = FENCE_LINE.match(ln)
            if fr:
                k = fence_end(lines, i, fr.group(1))
                m = k + 1
                while m < len(lines) and not lines[m].strip():
                    m += 1
                has_id = m < len(lines) and re.match(r'^\^([A-Za-z0-9-]+)$', lines[m].strip())
                if re.match(r'^booklet\b', fr.group(2).strip(), re.I) or has_id:
                    if k >= len(lines):
                        err(f, f"line {n}: a fence is opened and never closed")
                    check_record_block(n, fr.group(2).strip(), "\n".join(lines[i + 1:k]))
                    i = (m if has_id else k) + 1
                    continue
            else:
                mm = CALLOUT_LINE.match(ln)
                if mm:
                    kind = mm.group(1).lower()
                    if kind == "records":
                        w = callout_words(kind, mm.group(2))
                        check_settings(f, n, kind, w)
                        rec_id = w["id"]
                        if w["id"]:
                            rec_lines.append((n, w["id"]))
                    else:
                        warn(f, f"line {n}: a `> [!{kind}]` line inside the records region is not a record, so it is kept as written and not read; "
                                f"move it above the records, or delete it")
                    i = claim_end(kind, lines, i)
                    continue
                if CALLOUT_ANY.match(ln):
                    warn(f, f"line {n}: this `> [!` line cannot be read (a Booklet line is written `> [!kind|id words] Title`), so it is left as text"
                            + (" and it ends the callout above it" if i > 0 and lines[i - 1].startswith(">") else ""))
                    i = body_end(lines, i)
                    continue
            start = i          # prose: it runs to the next record, Booklet line or `%%`
            while i < len(lines):
                l2 = lines[i]
                if l2.strip() == "%%" or CALLOUT_ANY.match(l2):
                    break
                f2 = FENCE_LINE.match(l2)
                if f2:
                    k = fence_end(lines, i, f2.group(1))
                    m = k + 1
                    while m < len(lines) and not lines[m].strip():
                        m += 1
                    if re.match(r'^booklet\b', f2.group(2).strip(), re.I) or (m < len(lines) and re.match(r'^\^[A-Za-z0-9-]+$', lines[m].strip())):
                        break
                    i = k + 1
                    continue
                i += 1
            warn(f, f"line {start + 1}: this text sits inside the records region, where only records are read, so it is kept as written and not read; "
                    f"move it above the records, or delete it")
            continue
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
                    bscope = scope_mod()
                    if bid in block_ids.setdefault(bscope, {}):
                        err(f, f"line {m + 1}: the block id ^{bid} is used twice" + (f" in the module {bscope!r}" if bscope else ""))
                    block_ids[bscope][bid] = info
            words = info.split()
            if not (words and words[0].lower() == "booklet") and not bid:
                last_q = False                      # a plain code fence is prose to the renderer
                prev_prose = True                   # and a `---` straight after it is no page break
            if words and words[0].lower() == "booklet" and len(words) > 1 and words[1].lower() == "query":
                last_q = False
                if section == "content":
                    queries.append((n, code, open_mod, cur_act))
                elif section == "data":
                    err(f, f"line {n}: a query belongs in an activity's prose, not in the data section")
                i = (m if bid else k) + 1
                continue
            if words and words[0].lower() == "booklet" and len(words) > 1 and words[1].lower() == "theme":
                in_module = bool(scope_mod())
                check_theme(f, n, code, in_module, theme_seen)
                theme_seen = theme_seen or not in_module
                i = (m if bid else k) + 1
                continue
            if words and words[0].lower() == "booklet":
                what = words[1].lower() if len(words) > 1 else ""
                if what in RECORD_KINDS or what == "sync":
                    warn(f, f"line {n}: a `booklet {what}` block outside the records region is not read; "
                            f"put it under a `> [!records]` line, inside `%%` … `%%`")
                    i = (m if bid else k) + 1
                    continue
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
                                if not (isinstance(col, str) and col in COLOUR_NAMES):
                                    err(f, f"line {n}: the widget ^{bid} has the colour {col!r}, which is not a colour name ({', '.join(COLOUR_NAMES)})")
                        for fig in obj.get("figures") or []:
                            bad = svg_script_in((fig or {}).get("svg") or "") if isinstance(fig, dict) else None
                            if bad:
                                err(f, f"line {n}: the widget ^{bid} has {', '.join(bad)} in a figure — a figure is a drawing, never a program")
                elif what == "data":
                    if not bid:
                        err(f, f"line {n}: a data block needs a ^id on the line after it")
                    elif obj is not None:
                        why, rows, flds = data_problem(obj)
                        if why:
                            err(f, f"line {n}: the data block ^{bid} {why}")
                        else:
                            keys = set(flds) | {k for r in rows for k in r}
                            nums = {k for r in rows for k, v in r.items() if isinstance(v, (int, float)) and not isinstance(v, bool)}
                            data_blocks.setdefault(scope_mod(), {})[bid] = (keys, n, nums, rows)
                elif what != "sync":
                    warn(f, f"line {n}: `booklet {what}` is not a block this format defines")
            i = (m if bid else k) + 1
            continue
        nd = re.match(r'^\[\^([A-Za-z0-9][A-Za-z0-9_.:-]*)\]:[ \t]+\S', ln)
        if nd:
            nscope = scope_mod()
            seen_note = note_defs.setdefault(nscope, {})
            if nd.group(1) in seen_note:
                warn(f, f"line {n}: the footnote id [^{nd.group(1)}] is defined twice" + (f" in the module {nscope!r}" if nscope else "")
                        + f" (first on line {seen_note[nd.group(1)]}); a reader uses the first")
            else:
                seen_note[nd.group(1)] = n
        if rowst["open"] and re.match(r'^ {0,3}([-*_])([ \t]*\1){2,}[ \t]*$', ln):
            prev = lines[i - 1] if i > 0 else ""
            under_text = prev.strip() and not prev.lstrip().startswith(">") and not re.match(r'^ {0,3}(`{3,}|~{3,})', prev)
            if not (ln.lstrip().startswith("-") and under_text):
                close_row(i, "runs into a page break")
        if OLD_ROW_END.match(ln):
            err(f, f"line {n}: `> [!row end]` is not a row's close (0.13); write `> [!row|end]`")
        mm = CALLOUT_LINE.match(ln)
        if mm:
            kind, w = mm.group(1).lower(), callout_words(mm.group(1).lower(), mm.group(2))
            where = f"line {n}"
            check_settings(f, n, kind, w)
            if rowst["open"] and kind in ("data", "records", "module", "activity"):
                close_row(i, "runs into " + {"module": "a module fence", "activity": "an activity line"}.get(kind, f"the {kind} section"))
            if kind == "notice":
                check_notice(f, n, w, lines, i, open_mod if section == "content" else None,
                             mod_has_activity, notice_seen, section == "content")
            if section == "data" and kind in ("module", "activity"):
                # a module or an activity line ends a data section: what follows is the booklet's own text again
                section, data_scope = "content", None
            if kind == "data":
                section = "data"
                data_scope = None
                if w["id"]:
                    if w["id"] in mod_ids:
                        data_scope = w["id"]
                    else:
                        err(f, f"{where}: this data section names the module {w['id']!r}, which the file has not opened")
            elif section == "content":
                if kind in ("menu", "manifest", "notice", "hint", "solution") or kind in QUESTION_KINDS or (kind == "row" and "end" in w["flags"]):
                    pass                                    # these leave the question above them its hint and solution
                else:
                    last_q = False
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
                        if not open_mod and noid_line:
                            err(f, f"{where}: this closes {w['id']!r}, but the module opened on line {noid_line} has no id, so nothing can close it")
                            noid_line = None
                        elif not open_mod:
                            err(f, f"{where}: a module is closed that was never opened")
                        elif w["id"] and w["id"] != open_mod:
                            err(f, f"{where}: this closes {w['id']!r}, but {open_mod!r} is open")
                        open_mod = None
                    else:
                        if open_mod:
                            err(f, f"{where}: {w['id']!r} opens before {open_mod!r} (line {open_line}) is closed")
                        if not w["id"]:
                            err(f, f"{where}: a module line needs an id; write `> [!module|my-module] Title` (and close it with `> [!module|my-module end]`)")
                        open_mod, open_line = w["id"], n
                        noid_line = None if w["id"] else n
                        mod_has_activity = False
                        any_module = True
                        if w["id"]:
                            if w["id"] in mod_ids:
                                err(f, f"{where}: the module id {w['id']!r} is also used on line {mod_ids[w['id']]}")
                            mod_ids.setdefault(w["id"], n)
                elif kind == "activity":
                    seen_activity = True
                    mod_has_activity = True
                    cur_act = w["id"] or "(an activity with no id)"
                    if not w["id"]:
                        err(f, f"{where}: an activity line needs an id; write `> [!activity|my-id] Title`. A kept entry is stored under the activity's "
                               f"id, so an id the renderer makes up from the title is lost the day the title changes, orphaning the entries")
                    if w["set"].get("status") == "off" and any(re.sub(r'^>[ \t]?', '', x).strip() for x in lines[i + 1:body_end(lines, i)]):
                        warn(f, f"{where}: `status:off` hides the card's status line, so the `>` lines under this activity line (its status text) are not drawn")
                    status_lines = [re.sub(r'^>[ \t]?', '', x) for x in lines[i + 1:body_end(lines, i)]]
                    if any(x.strip() for x in status_lines):
                        if any(re.match(r'^\s*(>|#{1,6}([ \t]|$)|[-*+][ \t]|\d+[.)][ \t]|`{3,}|~{3,})', x) for x in status_lines):
                            warn(f, f"{where}: a `>` line under this activity line is block syntax (a quote or nested callout, a heading, a list item or a code fence); "
                                    f"the lines under an activity line are its card's status text, one line of inline Markdown, so it would show as literal characters")
                    end = body_end(lines, i)
                    if end < len(lines) and continues_paragraph(lines[end]):
                        warn(f, f"line {end + 1}: text straight under the activity line" + (" and its `>` lines" if end > i + 1 else "") + ", with no blank line between, is read by Markdown "
                                f"and Obsidian as part of the callout, but a renderer takes it as the activity's own paragraph (its blurb); leave a blank line after the activity line" + (" and its `>` lines" if end > i + 1 else ""))
                    if w["id"]:
                        acts.setdefault(open_mod, {})[w["id"]] = n
                        if w["set"].get("parent") is not None:
                            parents.setdefault(open_mod, []).append((w["id"], w["set"]["parent"], n))
                        act_info.setdefault(open_mod, {})[w["id"]] = (open_mod, "repeat" in w["flags"] or "daily" in w["flags"])
                elif kind in QUESTION_KINDS:
                    if w["id"] and cur_act:
                        q_owner.setdefault(open_mod, {})[w["id"]] = cur_act
                    elif w["id"]:
                        loose_questions.append(w["id"])
                        if not seen_activity and not any_module:
                            early_questions.append((n, kind))
                    if not w["id"]:
                        err(f, f"{where}: this {kind} question has no id, so its answer would have nowhere to go; write `> [!{kind}|my-id] Title`")
                    bad_q = False
                    if kind == "widget":
                        body = lines[i + 1:body_end(lines, i)]
                        e = re.search(r'!\[\[[^\]#|]*#\^([A-Za-z0-9-]+)', "\n".join(body))
                        if e:
                            embeds.append((n, e.group(1), open_mod))
                        else:
                            err(f, f"{where}: the widget {w['id']!r} names no data block (write ![[#^its-id]] under the line)")
                    after_body = body_end(lines, i)        # a list is read from here: the renderer takes the body first
                    if kind == "matrix" and w["id"]:
                        items, after = list_below(lines, after_body, BULLET)
                        anchors, _ = list_below(lines, after, NUMBERED)
                        if not items:
                            err(f, f"{where}: the matrix {w['id']!r} has no items (a bulleted list under the line)")
                        if not anchors:
                            err(f, f"{where}: the matrix {w['id']!r} has no anchors (a numbered list under its items)")
                        nums = [a.group(1).lstrip("0") or "0" for a in anchors]
                        dup = sorted({x for x in nums if nums.count(x) > 1}, key=int)
                        if dup:
                            err(f, f"{where}: the matrix {w['id']!r} repeats anchor number {', '.join(dup)} (each anchor needs its own number)")
                    if kind in ("choice", "multi") and w["id"]:
                        own, _ = list_below(lines, after_body, TASK)
                        if w["set"].get("menu"):
                            if own:
                                err(f, f"{where}: the question {w['id']!r} has both `menu:{w['set']['menu']}` and a list of its own (use one)")
                            menu_uses.append((n, w["set"]["menu"], open_mod))
                        elif not own:
                            bad_q = True
                            plain, _ = list_below(lines, after_body, BULLET)
                            err(f, f"{where}: this {kind} question {w['id']!r} has no options under it, so it is not drawn; write each option as a task list "
                                   f"item, `- [ ] Option`, straight under the line or after one blank line" + (" (the bullets under it are plain bullets, which a menu takes, not a choice)" if plain else ""))
                    if kind == "scale" and w["id"]:
                        anchors, _ = list_below(lines, after_body, NUMBERED)
                        if not anchors:
                            bad_q = True
                            plain, _ = list_below(lines, after_body, BULLET)
                            err(f, f"{where}: this scale question {w['id']!r} has no anchors under it, so it is not drawn; write them as a numbered list, "
                                   f"`1. Low`, `2. High`, straight under the line or after one blank line" + (" (the bullets under it are plain bullets, and a scale's anchors are numbered)" if plain else ""))
                        else:
                            nums = [a.group(1).lstrip("0") or "0" for a in anchors]
                            dup = sorted({x for x in nums if nums.count(x) > 1}, key=int)
                            if dup:
                                err(f, f"{where}: the scale {w['id']!r} repeats anchor number {', '.join(dup)}; the number is the stored answer, "
                                       f"so each anchor needs its own")
                    if kind in ("choice", "multi", "scale") and w["id"] and not bad_q:
                        got, after_list = list_below(lines, after_body, TASK if kind != "scale" else NUMBERED)
                        if got and after_list < len(lines) and re.match(r"^[ \t]+\S", lines[after_list]) and not (TASK if kind != "scale" else NUMBERED).match(lines[after_list]):
                            warn(f, f"line {after_list + 1}: the line after this list is indented, so the list ends there: put each option on one line")
                    if w["id"] and not bad_q:
                        last_q = True
                    # Markdown lets only a list starting at 1 interrupt a paragraph:
                    # a list starting at 0 (or 2…) straight under the line joins its title
                    nxt = lines[i + 1] if i + 1 < len(lines) else ""
                    if re.match(r'^ {0,3}(?!1[.)])\d+[.)][ \t]', nxt):
                        err(f, f"line {n + 1}: a numbered list that does not start at 1 needs a blank line above it, "
                               f"or Markdown reads it as part of the question's title")
                elif kind in ("hint", "solution"):
                    if mm.group(3) != "-":
                        warn(f, f"{where}: a {kind} that is not folded is drawn open, outside its question; write `> [!{kind}]-`")
                    if not last_q:
                        warn(f, f"{where}: this {kind} is not directly under a question, so it is drawn on its own; put it straight under the question "
                                f"it belongs to, with nothing between (no text, no other callout)")
            if kind == "menu":
                items, after_menu = list_below(lines, body_end(lines, i), BULLET)
                if not items:
                    err(f, f"{where}: the menu {w['id']!r} has no items (a bulleted list under the line)")
                for off, im in enumerate(items):
                    if re.match(r'^[ \t]*[-*+][ \t]+\[[xX]\]', im.string):
                        warn(f, f"line {after_menu - len(items) + off + 1}: a menu cannot mark a right answer; to have one, give the question its "
                                f"own task list (`- [x] Mars`) in place of `menu:`, or drop the `[x]`")
                if w["id"]:
                    menus.setdefault(w["id"], []).append(scope_mod())
            for key in (w["id"],) if kind in QUESTION_KINDS | {"module", "activity", "menu"} and w["id"] else ():
                if not ID_PATTERN.match(key):
                    err(f, f"line {n}: the id {key!r} may hold only letters, digits and dashes")
                if kind == "module":
                    continue          # module ids are kept in their own table, above
                # a module's activities, questions and menus share one namespace; a menu outside every fence is the data section's
                scope = open_mod
                if kind == "menu":
                    scope = scope_mod() or "\0shared"
                table = ids.setdefault(scope, {})
                if key in table:
                    err(f, f"line {n}: the id {key!r} is also used on line {table[key]}" + (f" in the module {scope!r}" if scope and scope != "\0shared" else ""))
                table.setdefault(key, n)
            i = claim_end(kind, lines, i)
            continue
        # not a Booklet line: prose, a page break, or a line that starts like one and cannot be read
        if ln.strip() == "%%":
            prev_prose = was_prose              # a bare `%%` outside a region is nothing to the renderer: the line above still counts
            i += 1
            continue
        if re.match(r'^ {1,3}>[ \t]?\[!', ln):
            warn(f, f"line {n}: a Booklet line starts at the left edge; this one is indented, so it is read as text. Remove the spaces")
        if CALLOUT_ANY.match(ln) and not OLD_ROW_END.match(ln):
            warn(f, f"line {n}: this `> [!` line cannot be read (a Booklet line is written `> [!kind|id words] Title`: the kind is letters, digits and "
                    f"dashes), so it is left as text" + (", and it ends the callout above it" if i > 0 and lines[i - 1].startswith(">") else ""))
        if ln.strip():
            brk = re.match(r'^ {0,3}([-*_])([ \t]*\1){2,}[ \t]*$', ln)
            if brk and re.match(r'^ {0,3}-', ln) and was_prose:
                warn(f, f"line {n}: `{ln.strip()}` straight under text makes that line a heading and is not a page break; write `***`, "
                        f"or leave a blank line above it; for a heading, write `## …`")
            last_q = False
            prev_prose = not brk or (re.match(r'^ {0,3}-', ln) is not None and was_prose)
        i += 1
    if rowst["open"]:
        close_row(len(lines), "is never closed")
    if not any(l.strip() for l in lines[body_start:]):
        warn(f, "this booklet holds nothing yet: no module and no activity (it opens as an empty booklet with this name)")
    if noid_line:
        err(f, f"line {noid_line}: the module opened here has no id, so it is never closed (an end line repeats the module's id)")
    if open_mod:
        err(f, f"line {open_line}: the module {open_mod!r} is opened and never closed")
    for n, mid, mod in menu_uses:
        # a menu is read in its own module first, then in the data section (a menu outside every fence), never in another module
        if mid not in menus:
            err(f, f"line {n}: `menu:{mid}` names no menu in this file (write `> [!menu|{mid}]` with a bulleted list)")
        elif mod not in menus[mid] and None not in menus[mid]:
            err(f, f"line {n}: `menu:{mid}` names a menu in another module only (a module reads its own menus, or the data section's)")
        elif mod is not None and mod not in menus[mid]:
            warn(f, f"line {n}: `menu:{mid}` is defined outside module {mod!r}, so the module would not travel whole")
    for n, ref, mod in embeds:
        # a block is read in its own module first, then in the data section, never in another module
        found = block_ids.get(mod, {}).get(ref) if mod in block_ids else None
        if found is None:
            found = block_ids.get(None, {}).get(ref)
        if found is None and any(ref in t for k, t in block_ids.items() if k != mod):
            err(f, f"line {n}: ![[#^{ref}]] points at a block in another module only (a module reads its own blocks, or the data section's)")
        elif found is None:
            err(f, f"line {n}: ![[#^{ref}]] points at no block in this file")
        elif not found.lower().startswith("booklet widget"):
            err(f, f"line {n}: ^{ref} is not a widget block")
    # A file with no activity line and no module line is one activity (SPEC section 3),
    # so its queries and questions belong to that one activity.
    if seen_activity or any_module:
        for n, kind in early_questions:
            err(f, f"line {n}: a {kind} question belongs inside an activity, not before the file's first module or activity line")
    if not seen_activity and not any_module:
        act_info.setdefault(None, {})[IMPLICIT_ACTIVITY] = (None, False)
        for q in loose_questions:
            q_owner.setdefault(None, {})[q] = IMPLICIT_ACTIVITY
        queries = [(n, code, mod, here or IMPLICIT_ACTIVITY) for n, code, mod, here in queries]
    for n, code, mod, here in queries:
        # the query's own module first, then the data section; what lies only in another module is told apart so it is reported as such
        a_view, q_view, d_view = {}, {}, {}
        for sc in [k for k in act_info if k != mod] + [mod]:
            for aid, info in act_info.get(sc, {}).items():
                a_view[aid] = info
        for sc in [k for k in q_owner if k != mod] + [mod]:
            for qid, aid in q_owner.get(sc, {}).items():
                q_view[qid] = aid if sc == mod else f"{sc}/{aid}"
                if sc != mod:
                    a_view.setdefault(f"{sc}/{aid}", act_info.get(sc, {}).get(aid, (sc, False)))
        for sc in [k for k in data_blocks if k not in (mod, None)] + [None, mod]:
            for bid, (keys, ln, nums, rows) in data_blocks.get(sc, {}).items():
                d_view[bid] = (sc, keys, nums, rows)
        check_query(f, n, code, mod, here, a_view, q_view, any_module, d_view)
    for scope, table in data_blocks.items():
        # a data block's id may not also be a question's or an activity's within its module (outside every fence: the module with no name)
        for bid, (_, n, _, _) in table.items():
            other = ids.get(scope, {})
            if bid in other:
                err(f, f"line {n}: the data block id ^{bid} is also the id on line {other[bid]}, so a query could not tell them apart")
    for scope, rows in parents.items():
        # `parent:` means what it means on a list row (SPEC.md section 3): a parent outside the module puts the activity at the
        # top, and an activity that is its own ancestor is drawn once, at the top. The first of two activities with one id is used.
        known = acts.get(scope, {})
        link = {}
        for aid, par, n in rows:
            link.setdefault(aid, (par, n))
        for aid, (par, n) in link.items():
            if par not in known:
                warn(f, f"line {n}: `parent:{par}` is not an activity of " + (f"the module {scope!r}" if scope else "the module with no name (the activities outside every module fence)") + f", so {aid!r} sits at the top")
                continue
        # a loop: walk each chain once, keeping what is already settled, so a chain thousands deep costs one pass
        settled, loops = set(), set()
        for start in link:
            if start in settled:
                continue
            path, on_path, cur = [], {}, start
            while cur is not None and cur in link and cur not in settled and cur not in on_path:
                on_path[cur] = len(path)
                path.append(cur)
                nxt = link[cur][0]
                cur = nxt if nxt in known else None
            if cur is not None and cur in on_path:
                loops.update(path[on_path[cur]:])
            settled.update(path)
        for aid in sorted(loops, key=lambda x: link[x][1]):
            par, n = link[aid]
            warn(f, f"line {n}: `parent:{par}` loops back to {aid!r} (it is its own ancestor), so it is drawn once, at the top")
    # a records line is read by the exact id it carries: a module of this file, or an activity outside every module (the
    # activities outside a module are one module with no name). One naming neither is reported by the renderer, which keeps its
    # blocks as written and does not read them. A file with no activity line is one activity, named from its title: not checked.
    one_activity = not seen_activity and not any_module
    own = {re.sub(r"[^A-Za-z0-9-]+", "-", t.lower()).strip("-") for t in (fm_title, fm_id) if t} if one_activity else set()
    for n, rid in rec_lines:
        if rid not in mod_ids and rid not in acts.get(None, {}) and rid not in own:
            warn(f, f"line {n}: the records line names {rid!r}, which is no module of this file (nor an activity outside every module), "
                    f"so its blocks are kept as written and not read; name the module these records belong to; if that module is gone, delete them")
    for n, ref, rid in entry_refs:
        if rid and rid not in mod_ids and rid not in acts.get(None, {}) and rid not in own:
            continue                                         # a records line naming nothing: reported on that line
        scope = rid if rid in mod_ids else None
        if ref not in acts.get(scope, {}):
            warn(f, f"line {n}: records for {ref!r}, which no activity line names")
    # Booklet reads a block id or a footnote id in its own module. Obsidian reads `![[#^id]]` as the first block with that
    # id in the note, and Markdown reads `[^id]` and its definition across the whole file (Obsidian, GitHub), so a second
    # module's own id is shown as the first one's there.
    seen_at = {}
    for scope, table in block_ids.items():
        for bid in table:
            seen_at.setdefault(("block", bid), []).append(scope)
    for scope, table in note_defs.items():
        for nid in table:
            seen_at.setdefault(("footnote", nid), []).append(scope)
    for (what, key), scopes in sorted(seen_at.items(), key=lambda x: (x[0][0], x[0][1])):
        if len(scopes) > 1:
            names = " and ".join(("the module " + repr(sc)) if sc else "the data section or the activities outside every module" for sc in scopes)
            mark = f"^{key}" if what == "block" else f"[^{key}]"
            warn(f, f"the {what} id {mark} is used in {names}: Booklet reads each in its own module, but Obsidian and GitHub will show the first one for all of them")
    # after a records region the file is design again, which a save moves above the records (SPEC.md section 8): said once
    if regions:
        inside = set()
        for a, z, _, _, _ in regions:
            inside.update(range(a, z + 1))
        late = next((k for k in range(regions[0][0], len(lines)) if k not in inside and lines[k].strip()), None)
        if late is not None:
            warn(f, f"line {late + 1}: this comes after the records region, and a save moves it above the records (the records sit at the end of a "
                    f"file); write it above the records yourself")
    check_links(f, lines)
    check_images(f, lines)
    check_prices(f, lines, body_start, regions)


def fence_skip(ln, fence):
    """Fenced-code tracking, one line at a time: `fence` is the fence character now open (or None), and the answer is
    (the fence after this line, whether to skip the line). A line that opens or closes a fence is skipped, and so is
    every line inside one. The two line-by-line checks below (images, links) share it."""
    m = re.match(r'^ {0,3}(`{3,}|~{3,})(.*)$', ln)
    if m:
        if fence is None:
            fence = m.group(1)[0]
        elif m.group(1)[0] == fence and not m.group(2).strip():
            fence = None
        return fence, True
    return fence, fence is not None


# Inline maths as the renderer reads it (INLINE_RE in booklet.html): a backslash escape, a code span, `$$display$$`, and `$inline$`,
# whose text starts and ends on something that is not a space and whose closing `$` is not followed by a digit.
MATH_RE = re.compile(
    r"\\[\\`*_{}\[\]()#+.!~=$<>|-]"
    r"|(?P<cf>`+)[\s\S]*?(?P=cf)"
    r"|\$\$[\s\S]+?\$\$"
    r"|\$(?P<math>(?:\\[\s\S]|[^\s$\\])(?:(?:\\[\s\S]|[^$\\])*?(?:\\[\s\S]|[^\s$\\]))?)\$(?![0-9])")


# a word of two letters or more standing on its own: a price carries one ("a month"), ordinary arithmetic ("7 + 5", "2x") does not
PRICE_WORD = re.compile(r"(?<![A-Za-z0-9\\])[A-Za-z]{2,}(?![A-Za-z0-9])")


def check_prices(f, lines, start, regions):
    """A price in prose that reads as a formula: `It costs $5 a month ($) or $50 a year` draws "5 a month (" in maths italics. Only a
    formula that starts with a digit is reported (a formula that starts with a letter is maths, and the maths in this repository's
    examples starts with one), and not one that carries maths markup (a backslash command, `^`, `_`, `{` or `=`)."""
    skip = set()
    for a, z, _, _, _ in regions:
        skip.update(range(a, z + 1))
    para, fence = [], None
    lines = re.sub(r"<!--.*?-->", lambda m: re.sub(r"[^\n]", " ", m.group()), "\n".join(lines), flags=re.S).split("\n")   # a comment is not read

    def flush():
        if not para:
            return
        text = "\n".join(t for _, t in para)
        for m in MATH_RE.finditer(text):
            formula = m.group("math")
            if formula and formula[0].isdigit() and not re.search(r"[\\^_{}=]", formula) and PRICE_WORD.search(formula):
                at = para[text.count("\n", 0, m.start())][0]
                formula = re.sub(r"\s+", " ", formula)
                shown = formula if len(formula) <= 30 else formula[:30] + "..."
                warn(f, f"line {at + 1}: `${shown}$` reads as a formula, drawn as maths, not as the text you wrote; "
                        f"if it is a price, write each dollar sign as `\\$` (`\\$5`)")
        para.clear()

    for k in range(start, len(lines)):
        ln = lines[k]
        fence, skipped = fence_skip(ln, fence)
        if k in skip or skipped or not ln.strip():
            flush()
            continue
        # a booklet line (its title) and each list item are their own words: a `$` there does not pair with one on the next line
        stripped = re.sub(r"^>[ \t]?", "", ln)
        line = bool(re.match(r"^>[ \t]*\[!", ln))
        if line or re.match(r"^\s*(?:[-*+]|\d+[.)])\s", stripped):
            flush()
        para.append((k, stripped))
        if line:
            flush()
    flush()


# a relative image path the renderer will read from the host's store (SPEC.md section 6); the part rules are checked beside it
IMAGE_PATH = re.compile(r'^(?=.{1,200}$)[A-Za-z0-9_./-]+\.(?:svg|png|jpe?g|webp|gif)$', re.I)


def check_images(f, lines):
    """An image is linked, never embedded, and a renderer fetches an image only from a store its host declares
    (SPEC.md section 6). A remote address (`http:`, `https:`, or one that starts `//`) is a warning: a renderer does
    not fetch it. An address with any other scheme (`data:`, `javascript:`, `file:` ...) is an error. A relative path
    is fine, but a warning when it is one the renderer never reads (a `..`, a leading `/`, a character outside
    letters, digits and `_ . / -`, or an extension it does not draw). Reference-style
    images are read through their `[id]: address` definitions; code fences and inline code are not images."""
    fence, defs, found = None, {}, []
    for k, ln in enumerate(lines):
        fence, skip = fence_skip(ln, fence)
        if skip:
            continue
        bare = re.sub(r'`[^`]*`', '', ln)
        d = re.match(r'^ {0,3}\[([^\]]+)\]:[ \t]*(<[^>]*>|\S+)', bare)
        if d:
            defs[d.group(1).strip().lower()] = d.group(2).strip("<>")
        for m in re.finditer(r'!\[[^\]]*\]\((<[^>]*>|(?:[^()\s]|\([^()\s]*\))*)(?:\s+"[^"]*"|\s+\'[^\']*\')?\)', bare):
            found.append((k + 1, m.group(1).strip("<>")))
        for m in re.finditer(r'!\[([^\]]*)\]\[([^\]]*)\]', bare):
            found.append((k + 1, ("ref", (m.group(2) or m.group(1)).strip().lower())))
    for n, a in found:
        if isinstance(a, tuple):
            a = defs.get(a[1])
            if a is None:
                continue
        flat = re.sub(r'[\x00-\x1f\s]', '', a)
        scheme = re.match(r'^([A-Za-z][A-Za-z0-9+.-]*):', flat)
        shown = a if len(a) <= 60 else a[:60] + "..."
        if flat.startswith("//") or (scheme and scheme.group(1).lower() in ("http", "https")):
            warn(f, f"line {n}: the image {shown} has a remote address; a renderer does not fetch remote images, so it shows the alt text and the address as text")
        elif scheme:
            err(f, f"line {n}: the image {shown} has an address with the scheme `{scheme.group(1).lower()}:`; an image is linked by a relative path, never embedded or given another scheme")
        elif not IMAGE_PATH.match(a) or any(p == "" or p.startswith(".") for p in a.split("/")):
            warn(f, f"line {n}: the image {shown} is not a path the renderer reads from a store (letters, digits, _ . / - only, at most 200 characters, no empty part and no part that begins with a dot so no .. and no ./, no leading /, ending .svg, .png, .jpg, .jpeg, .webp or .gif); it shows the alt text and the address as text")


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
    """Warn on a `[[#Heading]]` or `](#slug)` link that points at no heading in its own module (the activities
    outside every module fence are one module), or only at a heading in another module, which Booklet does
    not follow. A heading is a markdown heading, or the title on an activity or question line
    (`> [!activity|id] Title`). Code fences and `#^block` refs are not links."""
    heads, links, fence, scope = {}, [], None, None
    for k, ln in enumerate(lines):
        fence, skip = fence_skip(ln, fence)
        if skip:
            continue
        mm = CALLOUT_LINE.match(ln)
        if mm and mm.group(1).lower() == "module":
            w = callout_words("module", mm.group(2))
            scope = None if "end" in w["flags"] else w["id"]
        h = re.match(r'^ {0,3}#{1,6}[ \t]+(.*?)[ \t]*$', ln)
        if h:
            heads.setdefault(scope, []).append(_plain_heading(h.group(1)))
        c = re.match(r'^\s*>\s*\[!\w+(?:\|[^\]]*)?\][+-]?\s*(.*?)\s*$', ln)
        if c and c.group(1):
            heads.setdefault(scope, []).append(_plain_heading(c.group(1)))
        bare = re.sub(r'`[^`]*`', '', ln)
        for m in re.finditer(r'(?<!!)\[\[#(?!\^)([^\]|]+)(?:\|[^\]]*)?\]\]', bare):
            links.append((k + 1, m.group(1), False, scope))
        for m in re.finditer(r'(?<!!)\[[^\]]*\]\(#([^)\s]*)\)', bare):
            links.append((k + 1, m.group(1), True, scope))
    norms = {sc: {_link_norm(x) for x in hs} for sc, hs in heads.items()}
    slugs = {sc: {_link_slug(x) for x in hs} for sc, hs in heads.items()}
    for n, target, by_slug, sc in links:
        if by_slug:
            try:
                want = _link_slug(urllib.parse.unquote(target))
            except Exception:
                want = _link_slug(target)
            here = bool(want) and want in slugs.get(sc, set())
            elsewhere = bool(want) and any(want in v for k2, v in slugs.items() if k2 != sc)
        else:
            want = _link_norm(target)
            here = want in norms.get(sc, set())
            elsewhere = any(want in v for k2, v in norms.items() if k2 != sc)
        if not here:
            kind = f"](#{target})" if by_slug else f"[[#{target}]]"
            if elsewhere:
                warn(f, f"line {n}: the link {kind} points at a heading only in another module, which Booklet does not follow (a link is read in its own module)")
            else:
                warn(f, f"line {n}: the link {kind} points at no heading in this file")


def check_file(path):
    global FILE_NO
    FILE_NO += 1
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
    marker = fm.get("booklet")
    if isinstance(marker, str) and re.fullmatch(r"0\.\d+", marker):
        # A YAML tool (Obsidian's properties panel, GitHub) reads an unquoted `0.10` as the number 0.1 and may write it
        # back that way; so does any unquoted marker whose minor ends in 0
        raw = next((l for l in text.split("\n")[1:] if re.match(r'^booklet:', l)), "")
        bare = re.match(r'^booklet:[ \t]*(0\.\d*0)[ \t]*$', raw)
        if bare:
            m = bare.group(1)
            as_num = re.sub(r"0+$", "", m)
            warn(f, f'front matter says `booklet: {m}` without quotes; write it in quotes, `booklet: "{m}"`, or a YAML tool will read it as {as_num}')
        if marker != FORMAT_VERSION:
            warn(f, f"this file says booklet: {marker}; the current format is {FORMAT_VERSION}, and it is checked as {FORMAT_VERSION}")
        check_format(f, text, fm)
        return
    # A file with no marker, or a marker that is not a 0.x version, is not a booklet for this linter (and the
    # renderer refuses it the same way)
    err(f, f"front matter must say `booklet: \"{FORMAT_VERSION}\"` (found {fm.get('booklet')!r}); "
           f"a marker is a 0.x version, and the current one is {FORMAT_VERSION}")


def main():
    flags = [a for a in sys.argv[1:] if a.startswith("-")]
    if "--help" in flags or "-h" in flags:
        print(__doc__.strip())
        return 0
    if "--marker" in flags:
        print(f'booklet: "{FORMAT_VERSION}"')
        return 0
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

    for _, _, _, kind, text in sorted(findings):
        print(f"{kind} {text}")
    n = len(paths)
    print(f"\n{n} booklet file{'' if n == 1 else 's'} checked · "
          f"{len(errors)} error{'' if len(errors) == 1 else 's'} · "
          f"{len(warnings)} warning{'' if len(warnings) == 1 else 's'}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())