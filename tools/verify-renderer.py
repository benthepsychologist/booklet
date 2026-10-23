#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Ben Armstrong
"""
Check a copy of the Booklet renderer against a release.

A host serves the released `booklet.html` (or `booklet-one-file.html`) and
anyone can check that what it serves is the release, byte for byte: a
release's notes carry the sha256 of its files (v0.13.1's: booklet.html,
parts/mermaid.js and booklet-one-file.html), as lines of the form `sha256sum`
prints. This prints the sha256 of a copy, given as a path or as an
http(s) address, and says whether it equals a release's: one of the lines of a
SHA256SUMS file (the release notes' block saved as a file, or a host's own
SHA256SUMS), or a hash given with --expect.

Since renderer 0.15 a host needs no edit: served over http or https with no
`booklet-store` line, the renderer reads `#/open/<name>` links from `modules/`
beside itself. A copy made before that, such as the portal's 0.13.1 stopgap,
carries one added line, `<meta name="booklet-store" content="...">`. With
--strip-store-meta that one line (and its line break) is removed before the
copy is compared, so such a copy can be checked against the release it was
made from. Only a line that is exactly one such tag is removed; a copy with
anything else changed, or with that tag on a line beside something else,
still does not match. A copy with two such lines is refused.

Usage:  python3 tools/verify-renderer.py COPY [--sums SHA256SUMS | --expect HASH] [--strip-store-meta]
                                         [--timeout SECONDS]
        python3 tools/verify-renderer.py --help      prints this text
COPY is a path or an http(s) address. An address is read with one plain GET:
at most 64 MB, all of it within --timeout seconds (30 unless given), and only
an answer of 200 is a file (a 204 or a 206 is refused, as is any other). A
redirect is followed only to another http(s) address, and the address the
copy was read from is then said on stderr. SHA256SUMS may be a path or an
address too, read the same way.
Prints `<sha256>  COPY` (and, with --strip-store-meta, the sha256 with the
line removed, or a line saying no line of exactly that form was there), then
`match: ...` or `NO MATCH: ...` when there is something to compare with.
Exit codes:
  0  the copy matches
  1  the copy does not match
  2  the copy or the sums cannot be read, or the arguments are wrong
  3  the sha256 was printed but nothing was compared (no --sums or --expect);
     stderr says so, so a script that forgot its argument does not read a pass
"""
import hashlib, http.client, re, sys, threading, urllib.error, urllib.request

MAX_BYTES = 64 * 1024 * 1024
TIMEOUT = 30

# One line that is exactly one store tag, as a host adds it (README.md, "Opening a booklet by link"): the line's own break
# goes with it. The address may hold no quote and no angle bracket, so nothing else can hide inside the tag.
STORE_LINE = re.compile(rb'^[ \t]*<meta name="booklet-store" content="[^"<>\r\n]*"[ \t]*/?>[ \t]*(?:\r?\n|\Z)', re.M)
# any booklet-store tag at all, in any spelling (quotes, order, case): only to say that one is there but was not removed
ANY_STORE_TAG = re.compile(rb'<meta\b[^>]*booklet-store', re.I)
# a line of a SHA256SUMS file: 64 hex digits, two spaces (or a space and `*`, binary mode), the file's name
SUMS_LINE = re.compile(r"^([0-9a-fA-F]{64}) [ *](.+)$")


class Refused(Exception):
    """A copy or a sums file that cannot be read, or arguments that cannot be used; the message says which, in words."""


class _HttpOnlyRedirects(urllib.request.HTTPRedirectHandler):
    """Follows a redirect only to another http(s) address. (urllib itself would follow one to ftp:.)"""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not re.match(r"^https?://", newurl, re.I):
            raise Refused(f"{req.full_url}: redirected to {newurl}, which is not an http(s) address")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(source, timeout):
    """One plain GET of an http(s) address, the whole of it within `timeout` seconds: (the bytes, the address they came
    from). The deadline is for the whole read, not for each wait on the socket, so a server that sends a byte now and
    then cannot hold it open."""
    opener = urllib.request.build_opener(_HttpOnlyRedirects)

    def get():
        with opener.open(urllib.request.Request(source, method="GET"), timeout=timeout) as r:
            if r.status != 200:
                raise Refused(f"{source}: answered {r.status} {r.reason}; only 200 is a whole file")
            return r.read(MAX_BYTES + 1), r.geturl()

    box = {}

    def run():
        try:
            box["ok"] = get()
        except BaseException as e:  # carried back to the caller's thread below
            box["err"] = e

    worker = threading.Thread(target=run, daemon=True)
    worker.start()
    worker.join(timeout)
    if worker.is_alive():
        raise Refused(f"{source}: not read within {timeout:g} seconds")
    e = box.get("err")
    if isinstance(e, Refused):
        raise e
    if isinstance(e, (urllib.error.URLError, OSError, ValueError, http.client.HTTPException)):
        raise Refused(f"{source}: could not be read ({getattr(e, 'reason', e)})")
    if e is not None:
        raise e
    body, final = box["ok"]
    if len(body) > MAX_BYTES:
        raise Refused(f"{source}: more than {MAX_BYTES // (1024 * 1024)} MB, not a renderer")
    return body, final


def read(source, timeout=TIMEOUT):
    """The bytes of a path or of an http(s) address, and where they were read from (an address after its redirects, or
    the path)."""
    if re.match(r"^[A-Za-z][A-Za-z0-9+.-]*://", source):
        if not re.match(r"^https?://", source, re.I):
            raise Refused(f"{source}: only a path or an http(s) address can be read")
        body, final = fetch(source, timeout)
        if final != source:
            print(f"note: {source} redirected; read from {final}", file=sys.stderr)
        return body
    try:
        with open(source, "rb") as f:
            return f.read()
    except OSError as e:
        raise Refused(f"{source}: could not be read ({e.strerror or e})")


def strip_store_meta(body):
    """The bytes with the one store line removed, and how many such lines there were (0 or 1; 2 or more is refused)."""
    found = STORE_LINE.findall(body)
    if len(found) > 1:
        raise Refused(f"the copy has {len(found)} booklet-store lines; a host's copy adds one")
    return STORE_LINE.sub(b"", body, count=1), len(found)


def sums(text, where):
    """The lines of a SHA256SUMS file, as [(hash, name)]; lines that are not sums (a heading, a fence) are passed over."""
    out = []
    for line in text.splitlines():
        m = SUMS_LINE.match(line.strip())
        if m:
            out.append((m.group(1).lower(), m.group(2).strip()))
    if not out:
        raise Refused(f"{where}: holds no sha256 lines")
    return out


def main(argv=None):
    args = list(sys.argv[1:] if argv is None else argv)
    if not args or "--help" in args or "-h" in args:
        print(__doc__.strip())
        return 0 if args else 2
    strip = "--strip-store-meta" in args
    args = [a for a in args if a != "--strip-store-meta"]
    opts, rest = {}, []
    while args:
        a = args.pop(0)
        if a in ("--sums", "--expect", "--timeout"):
            if not args:
                print(f"error: {a} needs a value", file=sys.stderr)
                return 2
            opts[a] = args.pop(0)
        elif a.startswith("-"):
            print(f"error: {a} is not an option (see --help)", file=sys.stderr)
            return 2
        else:
            rest.append(a)
    if len(rest) != 1 or ("--sums" in opts and "--expect" in opts):
        print("error: give one copy, and at most one of --sums and --expect (see --help)", file=sys.stderr)
        return 2
    copy = rest[0]
    try:
        timeout = TIMEOUT
        if "--timeout" in opts:
            try:
                timeout = float(opts["--timeout"])
            except ValueError:
                timeout = 0
            if not 0 < timeout <= 3600:
                raise Refused(f"--timeout {opts['--timeout']}: a number of seconds, more than 0 and at most 3600")
        expected = None
        if "--expect" in opts:
            h = opts["--expect"].strip().lower()
            if not re.fullmatch(r"[0-9a-f]{64}", h):
                raise Refused(f"--expect {opts['--expect']}: a sha256 is 64 hex digits")
            expected = [(h, "the hash given")]
        elif "--sums" in opts:
            raw = read(opts["--sums"], timeout)
            try:
                expected = sums(raw.decode("utf-8"), opts["--sums"])
            except UnicodeDecodeError:
                raise Refused(f"{opts['--sums']}: is not text")
        body = read(copy, timeout)
        print(f"{hashlib.sha256(body).hexdigest()}  {copy}")
        n = 0
        if strip:
            body, n = strip_store_meta(body)
            if n:
                said = "without its booklet-store line"
            elif ANY_STORE_TAG.search(body):
                said = ("nothing removed: it has a booklet-store tag, but on no line of exactly the form "
                        '<meta name="booklet-store" content="...">, so the tag is still in it')
            else:
                said = 'nothing removed: no line of exactly the form <meta name="booklet-store" content="..."> is in it'
            print(f"{hashlib.sha256(body).hexdigest()}  {copy}, {said}")
    except Refused as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    if expected is None:
        print("no comparison requested: give --sums or --expect to check this copy (exit 3)", file=sys.stderr)
        return 3
    got = hashlib.sha256(body).hexdigest()
    what = "the copy without its booklet-store line" if n else "the copy"
    names = [name for h, name in expected if h == got]
    if names:
        print(f"match: {what} is {', '.join(names)}" + (f" in {opts['--sums']}" if "--sums" in opts else ""))
        return 0
    against = f"any file in {opts['--sums']}" if "--sums" in opts else "the hash given"
    print(f"NO MATCH: {what} is not {against}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
