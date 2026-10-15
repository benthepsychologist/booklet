#!/usr/bin/env bash
# The browser checks: every test/*-browser.js, each run against ../booklet.html in a
# real Chromium through Playwright. Playwright is found from $PLAYWRIGHT, else
# node_modules/playwright, else ../.tools/node_modules/playwright-core (a .tools folder
# beside this repo's folder, as the booklet worktrees have), else the activity-kit copy on the dev box. With none of
# them this prints "browser  SKIPPED (no Playwright)" and says where to set it, and exits 0, so a machine
# without a browser still gets a green run.sh (whose last line then says the browser stage was skipped).
# Exits 1 if any script fails.
#   bash test/run-browser.sh                      every check, on booklet.html (the core)
#   bash test/run-browser.sh build/booklet.html pledge figures ...
#                                                 only the named checks, on that file (run.sh does this
#                                                 for the one-file build, test/one-file.js; names are the
#                                                 script names without -browser.js)
cd "$(dirname "$0")/.." || exit 1
html=${1:-booklet.html}; shift
only=" $* "
tag=""; [ "$html" != booklet.html ] && tag=" [$html]"

pw=${PLAYWRIGHT:-}
if [ -z "$pw" ]; then
  for c in node_modules/playwright ../.tools/node_modules/playwright-core /workspace/benthepsychologist-corpus/teaching/activity-kit/node_modules/playwright; do
    if [ -d "$c" ]; then pw=$(cd "$c" && pwd); break; fi
  done
fi
if [ -z "$pw" ]; then
  echo "browser  SKIPPED (no Playwright): set PLAYWRIGHT to the path of the playwright or playwright-core package, e.g. PLAYWRIGHT=/path/to/node_modules/playwright-core bash test/run.sh"
  exit 0
fi
export PLAYWRIGHT=$pw

out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
fails=0
for f in test/*-browser.js; do
  [ -e "$f" ] || continue
  name=$(basename "$f" .js)
  if [ "$only" != "  " ] && [ "${only#* ${name%-browser} }" = "$only" ]; then continue; fi
  log=$(node "$f" "$html" "$out" 2>&1); rc=$?
  printf '%-8s %s\n' "${name%-browser}" "$(printf '%s\n' "$log" | tail -1)$tag"
  if [ "$rc" -ne 0 ]; then
    printf '%s\n' "$log" | sed 's/^/         /'
    printf '%-8s FAILED (exit %s)%s\n' "${name%-browser}" "$rc" "$tag"
    fails=$((fails + 1))
  fi
done
if [ "$fails" -ne 0 ]; then echo "$fails browser check(s) failed"; exit 1; fi
echo "all browser checks passed"
