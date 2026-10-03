#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Ben Armstrong
"""
Lint a booklet file against the v0.5 format in SPEC.md.

A booklet is one portable Markdown file: front matter that says `booklet: 0.5`,
prose, Booklet lines written `> [!kind|id words] Title`, and data in fenced
blocks. A malformed file is an activity that renders wrong or not at all for
whoever was handed it, so this linter catches it before the file is shared. Its
checks mirror parseBooklet() in booklet.html, so the two agree on what is wrong.

What it checks: the front matter (`booklet: 0.5`, one `lang:`), fences that are
closed, unique block and question ids, modules that open and close, widgets that
name a data block that exists, widget JSON that parses and names an engine, no
script in a widget's SVG, numbered-list lines that would swallow a question's
title, queries and data blocks, and records that name an activity. Any file whose
front matter is not `booklet: 0.5` is rejected; no earlier format is read.

Usage:  python3 lint-booklet.py [--registry] [path ...]
Default (no arguments): every *.md file in modules/, widgets/, and
examples/ next to this script, skipping any of those directories that don't
exist and skipping readme.md (case-insensitive). `--registry` is accepted so the
registry's CI line keeps working; a v0.5 file is written in one language, so it
adds no rule of its own.
Exit 0 clean, 1 on any error. Warnings never fail the build.
"""
import html, json, pathlib, re, sys, unicodedata, urllib.parse

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

# Languages: a supported language, optionally with a region (`es`, `es-AR`, `fr-CA`).
LANGS = ("en", "es", "fr")
LANG_TAG = re.compile(r"^(en|es|fr)(-([A-Z]{2}|[0-9]{3}))?$")
# a key that looks like a language tag at all, however wrong
LANG_LIKE = re.compile(r"^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$")


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


# A v0.5 booklet is Markdown: front matter, prose, and Booklet lines
# written `> [!kind|id words] Title`, with data in fenced blocks. These checks
# mirror parseBooklet() in booklet.html, so the linter and the page agree on what is
# wrong with a file. See SPEC.md for the format.
CALLOUT_LINE = re.compile(r'^>[ \t]?\[!([A-Za-z][A-Za-z0-9-]*)(?:\|([^\]]*))?\]([+-]?)[ \t]*(.*)$')
ID_PATTERN = re.compile(r'^[A-Za-z0-9][A-Za-z0-9-]*$')
CALLOUT_FLAGS = {"module": {"end"}, "activity": {"repeat", "daily", "hidden"},
            "widget": {"readonly", "describe"}, "text": {"long"},
            "choice": {"open"}, "multi": {"open"}}
QUESTION_KINDS = {"text", "lines", "widget", "choice", "multi", "scale", "number", "date", "matrix"}
DRAWN_QUESTION_KINDS = {"text", "lines", "widget", "choice", "multi", "scale", "number", "date", "matrix"}  # the kinds the reference page draws today
STRUCTURE_KINDS = {"module", "activity", "data", "records", "manifest", "menu", "hint", "solution"}


def callout_words(kind, s):
    out = {"id": None, "flags": set(), "set": {}, "old": []}
    for w in (s or "").split():
        kv = re.match(r'^([A-Za-z][A-Za-z0-9-]*):(.*)$', w)
        if kv:
            out["set"][kv.group(1)] = kv.group(2)
        elif re.match(r'^[A-Za-z][A-Za-z0-9-]*=', w):
            out["old"].append(w)
        elif w.lower() in CALLOUT_FLAGS.get(kind, set()):
            out["flags"].add(w.lower())
        elif out["id"] is None:
            out["id"] = w
        else:
            out["flags"].add(w.lower())
    return out


QUERY_KEYS = {"from", "fields", "newest", "empty"}
QUERY_KEYS_V4 = ("as", "group", "limit", "title", "value", "label", "note", "tone")
QUERY_VIEWS = ("cards", "table", "list", "tiles")
# the settings that name a field of the rows being drawn
QUERY_FIELD_KEYS = ("group", "title", "value", "label", "note", "tone")


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
        if key not in QUERY_KEYS and key not in QUERY_KEYS_V4:
            err(f, f"line {n + 1 + off}: a query has no setting {key!r} (it takes from, fields, newest, empty, as, group, limit, title, value, label, note, tone)")
        s[key] = m.group(2).strip().strip('"\'')
    if here is None:
        err(f, f"line {n}: a query belongs in an activity's prose")
    if "as" in s and s["as"].lower() not in QUERY_VIEWS:
        err(f, f"line {n}: the query's `as: {s['as']}` is not one of {', '.join(QUERY_VIEWS)}")
    if "limit" in s and not re.fullmatch(r'[1-9][0-9]*', s["limit"]):
        err(f, f"line {n}: the query's `limit: {s['limit']}` must be a positive whole number")
    src_id = s.get("from", "")
    src_act, src_q, src_data = None, None, None
    if not src_id:
        err(f, f"line {n}: a query needs `from:`, the activity or question it shows")
    elif src_id in act_info:
        src_act = src_id
    elif src_id in q_owner:
        src_act, src_q = q_owner[src_id], src_id
    elif src_id in data_blocks:
        d_mod, d_keys = data_blocks[src_id]
        if any_module and d_mod is not None and d_mod != mod:
            err(f, f"line {n}: the query's `from: {src_id}` is a data block in another module (a query reads within its own module, or the data section)")
        else:
            src_data = d_keys
            if s.get("as", "").lower() == "cards":
                err(f, f"line {n}: the query's `as: cards` draws kept entries, not the data block {src_id!r}")
    else:
        err(f, f"line {n}: the query's `from: {src_id}` names no activity, question or data block in this file")
    # a setting that names a field the rows never carry: a warning, never an error
    names = None
    if src_data is not None:
        names = src_data
    elif src_act:
        names = {q for q, a in q_owner.items() if a == src_act and (src_q is None or q == src_q)} | {"date"}
    if names is not None:
        for key in QUERY_FIELD_KEYS:
            if key in s and s[key] not in names:
                warn(f, f"line {n}: the query's `{key}: {s[key]}` names a field the rows never carry")
        if src_data is not None and "fields" in s:
            for name in [x.strip() for x in s["fields"].split(",") if x.strip()]:
                if name not in names:
                    warn(f, f"line {n}: the query's `fields: {name}` names a field the rows never carry")
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
    if "newest" in s and not re.fullmatch(r'[1-9][0-9]*', s["newest"]):
        err(f, f"line {n}: the query's `newest: {s['newest']}` must be a positive whole number")


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


def check_format(f, text, fm):
    """Lint a v0.5 booklet. Every problem names its line."""
    lang = fm.get("lang", "")
    if not lang:
        err(f, "front matter has no `lang:` — a v0.5 file is written in one language")
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
    act_info, q_owner, cur_act, queries, any_module = {}, {}, None, [], False
    loose_questions = []   # questions before any activity line
    open_mod, open_line, section, seen_activity = None, 0, "content", False
    menus, menu_uses, data_blocks = {}, [], {}
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
            if words and words[0].lower() == "booklet" and section == "content" \
                    and len(words) > 1 and words[1].lower() == "query":
                queries.append((n, code, open_mod, cur_act))
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
                            data_blocks[bid] = (open_mod if section == "content" else None, keys, n)
                elif what in ("entries", "draft"):
                    if len(words) < 3:
                        err(f, f"line {n}: `booklet {what}` needs the activity it belongs to")
                    else:
                        entry_refs.append((n, words[2]))
                elif what not in ("answers", "module"):
                    warn(f, f"line {n}: `booklet {what}` is not a block this format defines")
            i = (m if bid else k) + 1
            continue
        mm = CALLOUT_LINE.match(ln)
        if mm:
            kind, w = mm.group(1).lower(), callout_words(mm.group(1).lower(), mm.group(2))
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
                    elif kind not in DRAWN_QUESTION_KINDS:
                        warn(f, f"{where}: {kind} questions are not drawn by the reference page yet")
                    if kind == "widget":
                        body = []
                        k = i + 1
                        while k < len(lines) and lines[k].startswith(">") and not CALLOUT_LINE.match(lines[k]):
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
        check_query(f, n, code, mod, here, act_info, q_owner, any_module, {k: v[:2] for k, v in data_blocks.items()})
    for bid, (_, _, n) in data_blocks.items():
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
    fm, body = front_matter(text)
    if fm is None:
        err(f, "no front matter — a booklet opens with a `---` block on line 1")
        return
    if fm.get("booklet") == "0.5":
        check_format(f, text, fm)
        return
    old = fm.get("booklet")
    if old in ("0.1", "0.2", "0.3", "0.4"):
        err(f, f"front matter says booklet: {old}; this is format 0.5. Change the marker to booklet: 0.5"
               + (" (and write settings as key:value, for example min:0)." if old == "0.2" else "."))
        return
    # No earlier format is read — this mirrors the renderer's own
    # parseFile(), which only ever calls parseBooklet(). Anything else is
    # rejected outright rather than checked against an earlier format's rules.
    err(f, f"front matter must say `booklet: 0.5` (found {fm.get('booklet')!r}) — "
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