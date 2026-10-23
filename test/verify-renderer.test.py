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
that line's name; with nothing to compare with it exits 3 and says so; a changed file does not match; the stopgap does
not match as it is, and with --strip-store-meta it is exactly the release; a tag on a line with anything else, in single
quotes, with content first or in capitals is not removed and the tool says a tag is still in it; a store line that is the
last line with no break, or in a file with CRLF breaks, is removed; a second edit still does not match; two store lines are
refused; the same by URL, where a redirect is followed only to http(s) (and the address read is said), a 204 or a 206 is
refused, and a server that trickles bytes is cut off at the whole read's deadline; bad arguments and unreadable copies exit 2.
Run: python3 test/verify-renderer.test.py      (standard library only)
VERIFY_RENDERER=<path> runs the same checks against another copy of the tool.
"""
import functools, hashlib, http.server, os, shutil, subprocess, sys, tempfile, threading, time

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
chk("with nothing to compare with, it prints the sha256 and exits 3, not 0 (nothing was checked)", rc == 3 and out == f"{sha(CORE)}  {release}\n", out + err)
chk("...and says on stderr that no comparison was requested", "no comparison requested" in err, err)
rc, out, err = run(release, "--strip-store-meta")
chk("...also with --strip-store-meta alone (exit 3)", rc == 3 and "no comparison requested" in err, out + err)
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
chk("...and the tool says the copy has a tag that was left in, not that it has none", "still in it" in out and "has no booklet-store" not in out, out)
# a tag in another spelling is a tag the tool does not remove: it says so, in those words, and the copy does not match
for tag, why in [(b"<meta name='booklet-store' content='/modules/'>\n", "in single quotes"),
                 (b'<meta content="/modules/" name="booklet-store">\n', "with content before name"),
                 (b'<META NAME="booklet-store" CONTENT="/modules/">\n', "in capitals")]:
    rc, out, err = run(put("spell/" + str(abs(hash(tag))) + ".html", CORE.replace(ANCHOR, tag + ANCHOR, 1)), "--sums", SUMS, "--strip-store-meta")
    chk("a store tag " + why + " is not removed; the tool says a tag is there but on no line of the exact form, and NO MATCH",
        rc == 1 and "on no line of exactly the form" in out and "still in it" in out and "NO MATCH" in out, out + err)
rc, out, err = run(put("lastline/index.html", CORE + STORE_LINE.rstrip(b"\n")), "--sums", SUMS, "--strip-store-meta")
chk("a store line that is the file's last, with no line break after it, is removed, and the copy is the release", rc == 0 and "without its booklet-store line" in out and "match:" in out, out + err)
CRLF_CORE = CORE.replace(b"\n", b"\r\n")
crlf = put("crlf/index.html", CRLF_CORE.replace(ANCHOR, STORE_LINE.replace(b"\n", b"\r\n") + ANCHOR, 1))
rc, out, err = run(crlf, "--expect", sha(CRLF_CORE), "--strip-store-meta")
chk("a copy with CRLF line breaks: the store line goes with its CRLF, leaving exactly that copy without it", rc == 0 and "without its booklet-store line" in out and "match:" in out, out + err)
bad2 = put("bad2/index.html", STOPGAP.replace(b"<title>Booklet</title>", b"<title>Booklet.</title>", 1))
rc, out, err = run(bad2, "--sums", SUMS, "--strip-store-meta")
chk("a stopgap with a second edit anywhere does not match once the line is removed", rc == 1 and "NO MATCH" in out, out + err)
two = put("two/index.html", STOPGAP.replace(ANCHOR, STORE_LINE + ANCHOR, 1))
rc, out, err = run(two, "--sums", SUMS, "--strip-store-meta")
chk("a copy with two store lines is refused (exit 2)", rc == 2 and "2 booklet-store lines" in err, out + err)

# ---- by URL, from a local server ----
class Server(http.server.SimpleHTTPRequestHandler):
    """The temp folder, plus a few answers a real server might give: redirects, a 204, a 206, and a slow trickle."""
    def log_message(self, *a):
        pass

    def answer(self, code, headers=(), body=b""):
        self.send_response(code)
        for k, v in headers:
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self):
        port = self.server.server_address[1]
        if self.path == "/redir/same":
            return self.answer(302, [("Location", "/release/booklet.html")])
        if self.path == "/redir/other-host":
            return self.answer(302, [("Location", f"http://localhost:{port}/release/booklet.html")])
        if self.path == "/redir/ftp":
            return self.answer(302, [("Location", "ftp://127.0.0.1:9/booklet.html")])  # loopback: a tool that followed it stays here
        if self.path == "/status/204":
            return self.answer(204)
        if self.path == "/status/206":
            return self.answer(206, [("Content-Range", f"bytes 0-99/{len(CORE)}")], CORE[:100])
        if self.path == "/slow":
            # a byte every 0.2 s for 8 s: no single wait is long, but the whole read is
            self.send_response(200)
            self.send_header("Content-Length", "40")
            self.end_headers()
            try:
                for _ in range(40):
                    self.wfile.write(b"x")
                    self.wfile.flush()
                    time.sleep(0.2)
            except OSError:
                pass
            return
        return super().do_GET()


handler = functools.partial(Server, directory=tmp)
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
    rc, out, err = run(base + "/redir/same", "--sums", SUMS)
    chk("a redirect on the same server is followed, and the address read is said on stderr", rc == 0 and "match:" in out and f"read from {base}/release/booklet.html" in err, out + err)
    rc, out, err = run(base + "/redir/other-host", "--sums", SUMS)
    other = f"http://localhost:{srv.server_address[1]}/release/booklet.html"
    chk("a redirect to another host is followed only to http(s), and that host's address is said", rc == 0 and f"read from {other}" in err, out + err)
    rc, out, err = run(base + "/redir/ftp", "--sums", SUMS)
    chk("a redirect to ftp: is refused (exit 2), and nothing is hashed", rc == 2 and "not an http(s) address" in err and not out, out + err)
    rc, out, err = run(base + "/status/204", "--sums", SUMS)
    chk("a 204 (no content) is refused, not hashed as an empty file (exit 2)", rc == 2 and "only 200" in err and not out, out + err)
    rc, out, err = run(base + "/status/206", "--sums", SUMS)
    chk("a 206 (part of a file) is refused, not hashed (exit 2)", rc == 2 and "only 200" in err and not out, out + err)
    t0 = time.monotonic()
    rc, out, err = run(base + "/slow", "--timeout", "1.5")
    took = time.monotonic() - t0
    chk("a server that sends a byte now and then is cut off at the whole read's deadline (exit 2)", rc == 2 and "not read within 1.5 seconds" in err and took < 6, f"{took:.1f} s: " + out + err)
finally:
    srv.shutdown()

# ---- arguments and unreadable copies ----
for args, why in [((release, "--expect", "abc"), "an --expect that is not 64 hex digits"),
                  ((release, "--expect", sha(CORE), "--sums", SUMS), "both --expect and --sums"),
                  ((os.path.join(tmp, "missing.html"),), "a path that does not exist"),
                  (("ftp://example.invalid/booklet.html",), "an address that is not http(s)"),
                  ((release, "--sums", release), "a sums file with no sha256 lines"),
                  ((release, "--frobnicate"), "an option it does not have"),
                  ((release, "--timeout", "0"), "a --timeout of 0"),
                  ((release, "--timeout", "soon"), "a --timeout that is not a number"),
                  ((), "no copy at all")]:
    rc, out, err = run(*args)
    chk(why + " exits 2", rc == 2, f"exit {rc}: " + (out + err)[-200:])
rc, out, err = run("--help")
chk("--help prints the usage and exits 0", rc == 0 and "Usage:" in out, out + err)

shutil.rmtree(tmp, ignore_errors=True)
print("\n" + (f"{fails} FAILURES" if fails else "verify-renderer checks passed"))
sys.exit(1 if fails else 0)
