#!/usr/bin/env bash
# Every check against ../booklet.html (the core) and against the one-file build of it. Needs node and python3; nothing to install.
# Exits 1 if ANY check fails, so a person or CI can trust the exit code. A check
# that fails prints its whole output, not just the last line.
# Every test/*.test.js is found and run without being listed here. At the end it
# also runs test/run-browser.sh (the six test/*-browser.js scripts, which need
# Playwright and a Chromium); that prints "SKIPPED" and passes where there is no
# Playwright, and PLAYWRIGHT_SKIP=1 leaves it out (CI's `check` job does that; the
# separate `browser` job runs it). Whenever the browser stage did not run, the last line says so:
# "all checks passed, but the browser stage was SKIPPED (...)", so a green run without a browser cannot be mistaken for a full one.
# The renderer is a core and its parts (0.13.1, item 11): booklet.html holds the formula library and loads the diagram library
# from parts/mermaid.js beside it. test/one-file.js puts every part back inside one file (build/booklet.html, not committed),
# and the guard, the figure tests and the policy check run on that file as well, and so do the pledge, figure, library-wake, theme,
# diagram and from-disk browser tests below: both ways of carrying the renderer have to pass what protects it.
cd "$(dirname "$0")/.." || exit 1
fails=0
skipped=""   # why the browser stage did not run, if it did not

run() { # run <label> <command...>
  local label=$1; shift
  local out rc
  out=$("$@" 2>&1); rc=$?
  printf '%-8s %s\n' "$label" "$(printf '%s\n' "$out" | tail -1)"
  case $label in browser*) case $out in *"SKIPPED (no Playwright)"*) skipped="no Playwright found; set PLAYWRIGHT=/path/to/node_modules/playwright-core";; esac;; esac
  if [ "$rc" -ne 0 ]; then
    printf '%s\n' "$out" | sed 's/^/         /'
    printf '%-8s FAILED (exit %s)\n' "$label" "$rc"
    fails=$((fails + 1))
  fi
}

run lint     python3 lint-booklet.py
run csp      node test/csp-hash.js --check booklet.html   # the renderer's own Content-Security-Policy is current
run art      node test/art-sprite.js --check booklet.html # the picture sprite is what art/ makes
run verify   python3 test/verify-renderer.test.py         # tools/verify-renderer.py: a copy checked against a release
for f in test/*.test.js; do
  [ -e "$f" ] || continue
  run "$(basename "$f" .test.js)" node "$f"
done

# the one-file build: made from the core and parts/, then held to the same checks as the core where they are about the parts
run onefile  node test/one-file.js build/booklet.html
run csp-1    node test/csp-hash.js --check build/booklet.html
run guard-1  node test/guard.test.js build/booklet.html
run figures-1 node test/figures.test.js build/booklet.html

if [ -n "${PLAYWRIGHT_SKIP:-}" ]; then
  skipped="PLAYWRIGHT_SKIP is set"
else
  run browser bash test/run-browser.sh
  run browser-1 bash test/run-browser.sh build/booklet.html pledge figures libwake mermaid filepage themes
fi

if [ "$fails" -ne 0 ]; then
  echo
  echo "$fails check(s) failed"
  exit 1
fi
echo
if [ -n "$skipped" ]; then
  echo "all checks passed, but the browser stage was SKIPPED ($skipped): the browser and browser-1 checks did not run"
else
  echo "all checks passed"
fi
