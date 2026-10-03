#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Ben Armstrong
"""
Lint a booklet file against the v0.2 format in SPEC.md.

A booklet is one portable Markdown file: front matter that says `booklet: 0.2`,
prose, Booklet lines written `> [!kind|id words] Title`, and data in fenced
blocks. A malformed file is an activity that renders wrong or not at all for
whoever was handed it, so this linter catches it before the file is shared. Its
checks mirror parseBooklet() in booklet.html, so the two agree on what is wrong.

What it checks: the front matter (`booklet: 0.2`, one `lang:`), fences that are
closed, unique block and question ids, modules that open and close, widgets that
name a data block that exists, widget JSON that parses and names an engine, no
script in a widget's SVG, numbered-list lines that would swallow a question's
title, and records that name an activity. Any file whose front matter is not
`booklet: 0.2` is rejected; no earlier format is read.

Usage:  python3 lint-booklet.py [--registry] [path ...]
Default (no arguments): every *.md file in modules/, widgets/, and
examples/ next to this script, skipping any of those directories that don't
exist and skipping readme.md (case-insensitive). `--registry` is accepted so the
registry's CI line keeps working; a v0.2 file is written in one language, so it
adds no rule of its own.
Exit 0 clean, 1 on any error. Warnings never fail the build.
"""
import html, json, pathlib, re, sys

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


# A v0.2 booklet is Markdown: front matter, prose, and Booklet lines
# written `> [!kind|id words] Title`, with data in fenced blocks. These checks
# mirror parseBooklet() in booklet.html, so the linter and the page agree on what is
# wrong with a file. See SPEC.md for the format.
CALLOUT_LINE = re.compile(r'^>[ \t]?\[!([A-Za-z][A-Za-z0-9-]*)(?:\|([^\]]*))?\]([+-]?)[ \t]*(.*)$')
ID_PATTERN = re.compile(r'^[A-Za-z0-9][A-Za-z0-9-]*$')
CALLOUT_FLAGS = {"module": {"end"}, "activity": {"repeat", "daily", "hidden"},
            "widget": {"readonly", "describe"}, "text": {"long"},
            "choice": {"open"}, "multi": {"open"}}
QUESTION_KINDS = {"text", "lines", "widget", "choice", "multi", "scale", "number", "date", "matrix"}
DRAWN_QUESTION_KINDS = {"text", "lines", "widget", "choice", "multi", "scale", "number", "date"}  # the kinds the reference page draws today
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


def check_query(f, n, code, mod, here, act_info, q_owner, any_module):
    """A `booklet query` block: `key: value` lines, read within its own module."""
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
            err(f, f"line {n + 1 + off}: a query has no setting {key!r} (it takes from, fields, newest, empty)")
        s[key] = m.group(2).strip().strip('"\'')
    if here is None:
        err(f, f"line {n}: a query belongs in an activity's prose")
    src_id = s.get("from", "")
    src_act, src_q = None, None
    if not src_id:
        err(f, f"line {n}: a query needs `from:`, the activity or question it shows")
    elif src_id in act_info:
        src_act = src_id
    elif src_id in q_owner:
        src_act, src_q = q_owner[src_id], src_id
    else:
        err(f, f"line {n}: the query's `from: {src_id}` names no activity or question in this file")
    if src_act:
        src_mod, keeps = act_info[src_act]
        # a file with no module fence is one module
        if any_module and src_mod != mod:
            err(f, f"line {n}: the query's `from: {src_id}` is in another module (a query reads within its own module only)")
        elif src_q is None and not keeps:
            err(f, f"line {n}: the query's `from: {src_id}` keeps no entries (only a repeat activity does)")
    if "fields" in s and src_act:
        for name in [x.strip() for x in s["fields"].split(",") if x.strip()]:
            if q_owner.get(name) != src_act or (src_q and name != src_q):
                err(f, f"line {n}: the query's `fields: {name}` is not a question of {src_act!r}")
    if "newest" in s and not re.fullmatch(r'[1-9][0-9]*', s["newest"]):
        err(f, f"line {n}: the query's `newest: {s['newest']}` must be a positive whole number")


def check_format(f, text, fm):
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
    act_info, q_owner, cur_act, queries, any_module = {}, {}, None, [], False
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
                    # Markdown lets only a list starting at 1 interrupt a paragraph:
                    # a list starting at 0 (or 2…) straight under the line joins its title
                    nxt = lines[i + 1] if i + 1 < len(lines) else ""
                    if re.match(r'^ {0,3}(?!1[.)])\d+[.)][ \t]', nxt):
                        err(f, f"line {n + 1}: a numbered list that does not start at 1 needs a blank line above it, "
                               f"or Markdown reads it as part of the question's title")
                elif kind not in STRUCTURE_KINDS:
                    pass                                   # a reading callout; any kind is allowed
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
    for n, ref in embeds:
        if ref not in block_ids:
            err(f, f"line {n}: ![[#^{ref}]] points at no block in this file")
        elif not block_ids[ref].lower().startswith("booklet widget"):
            err(f, f"line {n}: ^{ref} is not a widget block")
    for n, code, mod, here in queries:
        check_query(f, n, code, mod, here, act_info, q_owner, any_module)
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
    fm, body = front_matter(text)
    if fm is None:
        err(f, "no front matter — a booklet opens with a `---` block on line 1")
        return
    if fm.get("booklet") == "0.2":
        check_format(f, text, fm)
        return
    # No earlier format is read (2026-09-29) — this mirrors the renderer's own
    # parseFile(), which only ever calls parseBooklet(). Anything else is
    # rejected outright rather than checked against an earlier format's rules.
    err(f, f"front matter must say `booklet: 0.2` (found {fm.get('booklet')!r}) — "
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