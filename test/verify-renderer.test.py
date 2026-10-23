#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Ben Armstrong
"""
tools/verify-renderer.py: a copy of the renderer checked against a release (renderer 0.15, booklet-hub item
v015-host-modules-and-checksum). Every copy here is made from this repository's own booklet.html in a temporary folder:
the release file itself, a copy with one byte changed, and a host's stopgap copy (the core with one booklet-store line
added, as the portal's 0.13.1 copy was made). The http cases are served by a local http.server thread on 127.0.0.1;
nothing reaches a network.
Checks: a release file matches a SHA256SUMS line and a hash given with --expect, and a file on a later line matches by
that line's name; a changed file does not; the stopgap does
not match as it is, and with --strip-store-meta it is exactly the release; a tag on a line with anything else, or a
second edit, still does not match; two store lines are refused; the same by URL; bad arguments and unreadable copies exit 2.
Run: python3 test/verify-renderer.test.py      (standard library only)
VERIFY_RENDERER=<path> runs the same checks against another copy of the tool.
"""
import functools, hashlib, http.server, os, shutil, subprocess, sys, tempfile, threading

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOL = os.environ.get("VERIFY_RENDERER") or os.path.join(R, "tools", "verify-renderer.py")
CORE = open(os.path.join(R, "booklet.html"), "rb").read()
PART = open(os.path.join(R, "parts", "mermaid.js"), "rb").read()
sha = lambda b: hashlib.sha256(b).hexdigest()
fails = 0


def chk(name, ok, detail=""):
    global fails
    if not ok:
        fails += 1
    print(("  ok    " if ok else "  FAIL  ") + name + ("" if ok or not detail else "   → " + detail))


def run(*args):
    # the local server is reached directly, whatever proxy this machine's environment names
    env = {k: v for k, v in os.environ.items() if k.lower() not in ("http_proxy", "https_proxy", "all_proxy")}
    r = subprocess.run([sys.executable, TOOL, *args], capture_output=True, text=True, timeout=120, env=env)
    return r.returncode, r.stdout, r.stderr


ANCHOR = b'<meta name="theme-color"'
assert CORE.count(ANCHOR) == 1, "booklet.html no longer has one <meta name=\"theme-color\": update this test"
STORE_LINE = b'<meta name="booklet-store" content="/modules/">\n'
STOPGAP = CORE.replace(ANCHOR, STORE_LINE + ANCHOR, 1)          # a host's copy before 0.15: the release plus one line
CHANGED = CORE.replace(b"<title>Booklet</title>", b"<title>Booklet.</title>", 1)
assert CHANGED != CORE, "booklet.html no longer has <title>Booklet</title>: update this test"

tmp = tempfile.mkdtemp(prefix="verify-renderer-")
def put(rel, data):
    p = os.path.join(tmp, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "wb") as f:
        f.write(data)
    return p

release = put("release/booklet.html", CORE)
changed = put("changed/booklet.html", CHANGED)
stopgap = put("app/index.html", STOPGAP)
# a release's sha256 block, as its notes carry it (saved as a file), with the fence and heading around it
SUMS = put("SHA256SUMS", ("**sha256**\n```\n" + f"{sha(CORE)}  booklet.html\n{sha(PART)}  parts/mermaid.js\n"
                          + f"{'0' * 64}  booklet-one-file.html\n```\n").encode())

# ---- a release file matches ----
rc, out, err = run(release, "--sums", SUMS)
chk("the release file matches its line in SHA256SUMS (exit 0)", rc == 0 and "match: the copy is booklet.html in" in out, out + err)
chk("...and the first line printed is its sha256 and the copy, as sha256sum prints it", out.splitlines()[0] == f"{sha(CORE)}  {release}" if out else False, out)
rc, out, err = run(release, "--expect", sha(CORE).upper())
chk("the release file matches the hash given with --expect, in either case", rc == 0 and out.rstrip().endswith("match: the copy is the hash given"), out + err)
rc, out, err = run(release)
chk("with nothing to compare with, it prints the sha256 and exits 0", rc == 0 and out == f"{sha(CORE)}  {release}\n", out + err)
rc, out, err = run(put("part/mermaid.js", PART), "--sums", SUMS)
chk("a file on a later line of SHA256SUMS matches by that line's name (every line is compared, not the first)",
    rc == 0 and "match: the copy is parts/mermaid.js in" in out, out + err)

# ---- a changed file does not ----
rc, out, err = run(changed, "--sums", SUMS)
chk("a file with one byte changed matches nothing (exit 1)", rc == 1 and "NO MATCH" in out and out.splitlines()[0].startswith(sha(CHANGED)), out + err)
rc, out, err = run(changed, "--expect", sha(CORE))
chk("...nor the release's hash given with --expect", rc == 1 and "NO MATCH" in out, out + err)

# ---- the stopgap: the release plus one store line ----
rc, out, err = run(stopgap, "--sums", SUMS)
chk("the stopgap as it is does not match the release (the line changes the checksum)", rc == 1 and "NO MATCH" in out, out + err)
rc, out, err = run(stopgap, "--sums", SUMS, "--strip-store-meta")
lines = out.splitlines()
chk("with --strip-store-meta the stopgap is exactly the release (exit 0)", rc == 0 and "match: the copy without its booklet-store line is booklet.html" in out, out + err)
chk("...printing the stopgap's own sha256 first and the release's second", len(lines) >= 2 and lines[0] == f"{sha(STOPGAP)}  {stopgap}" and lines[1].startswith(sha(CORE) + "  "), out)
rc, out, err = run(release, "--sums", SUMS, "--strip-store-meta")
chk("the release itself with --strip-store-meta: nothing removed, and it still matches", rc == 0 and "nothing removed" in out and "match:" in out, out + err)
bad1 = put("bad1/index.html", CORE.replace(ANCHOR, STORE_LINE.rstrip(b"\n") + b"<script>alert(1)</script>\n" + ANCHOR, 1))
rc, out, err = run(bad1, "--sums", SUMS, "--strip-store-meta")
chk("a store tag sharing its line with anything else is not removed, and the copy does not match", rc == 1 and "nothing removed" in out and "NO MATCH" in out, out + err)
bad2 = put("bad2/index.html", STOPGAP.replace(b"<title>Booklet</title>", b"<title>Booklet.</title>", 1))
rc, out, err = run(bad2, "--sums", SUMS, "--strip-store-meta")
chk("a stopgap with a second edit anywhere does not match once the line is removed", rc == 1 and "NO MATCH" in out, out + err)
two = put("two/index.html", STOPGAP.replace(ANCHOR, STORE_LINE + ANCHOR, 1))
rc, out, err = run(two, "--sums", SUMS, "--strip-store-meta")
chk("a copy with two store lines is refused (exit 2)", rc == 2 and "2 booklet-store lines" in err, out + err)

# ---- by URL, from a local server ----
handler = functools.partial(type("Quiet", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=tmp)
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_address[1]}"
try:
    rc, out, err = run(base + "/release/booklet.html", "--sums", SUMS)
    chk("a served release file matches by URL", rc == 0 and "match: the copy is booklet.html" in out and out.startswith(sha(CORE)), out + err)
    rc, out, err = run(base + "/app/", "--sums", base + "/SHA256SUMS", "--strip-store-meta")
    chk("a served stopgap at /app/, with the sums read by URL too, matches with --strip-store-meta", rc == 0 and "match:" in out and out.startswith(sha(STOPGAP)), out + err)
    rc, out, err = run(base + "/changed/booklet.html", "--expect", sha(CORE))
    chk("a served changed file does not match", rc == 1 and "NO MATCH" in out, out + err)
    rc, out, err = run(base + "/nothing-here.html")
    chk("an address that answers 404 cannot be read (exit 2)", rc == 2 and "could not be read" in err, out + err)
finally:
    srv.shutdown()

# ---- arguments and unreadable copies ----
for args, why in [((release, "--expect", "abc"), "an --expect that is not 64 hex digits"),
                  ((release, "--expect", sha(CORE), "--sums", SUMS), "both --expect and --sums"),
                  ((os.path.join(tmp, "missing.html"),), "a path that does not exist"),
                  (("ftp://example.invalid/booklet.html",), "an address that is not http(s)"),
                  ((release, "--sums", release), "a sums file with no sha256 lines"),
                  ((release, "--frobnicate"), "an option it does not have"),
                  ((), "no copy at all")]:
    rc, out, err = run(*args)
    chk(why + " exits 2", rc == 2, f"exit {rc}: " + (out + err)[-200:])
rc, out, err = run("--help")
chk("--help prints the usage and exits 0", rc == 0 and "Usage:" in out, out + err)

shutil.rmtree(tmp, ignore_errors=True)
print("\n" + (f"{fails} FAILURES" if fails else "verify-renderer checks passed"))
sys.exit(1 if fails else 0)
