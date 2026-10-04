#!/usr/bin/env bash
# The browser checks: every test/*-browser.js, each run against ../booklet.html in a
# real Chromium through Playwright. Playwright is found from $PLAYWRIGHT, else
# node_modules/playwright, else the activity-kit copy on the dev box. With none of
# them this prints "browser  SKIPPED (no Playwright)" and exits 0, so a machine
# without a browser still gets a green run.sh. Exits 1 if any script fails.
cd "$(dirname "$0")/.." || exit 1

pw=${PLAYWRIGHT:-}
if [ -z "$pw" ]; then
  for c in node_modules/playwright /workspace/benthepsychologist-corpus/teaching/activity-kit/node_modules/playwright; do
    if [ -d "$c" ]; then pw=$(cd "$c" && pwd); break; fi
  done
fi
if [ -z "$pw" ]; then
  echo "browser  SKIPPED (no Playwright)"
  exit 0
fi
export PLAYWRIGHT=$pw

out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
fails=0
for f in test/*-browser.js; do
  [ -e "$f" ] || continue
  name=$(basename "$f" .js)
  log=$(node "$f" booklet.html "$out" 2>&1); rc=$?
  printf '%-8s %s\n' "${name%-browser}" "$(printf '%s\n' "$log" | tail -1)"
  if [ "$rc" -ne 0 ]; then
    printf '%s\n' "$log" | sed 's/^/         /'
    printf '%-8s FAILED (exit %s)\n' "${name%-browser}" "$rc"
    fails=$((fails + 1))
  fi
done
if [ "$fails" -ne 0 ]; then echo "$fails browser check(s) failed"; exit 1; fi
echo "all browser checks passed"
