#!/usr/bin/env bash
# Every check against ../booklet.html. Needs node and python3; nothing to install.
# Exits 1 if ANY check fails, so a person or CI can trust the exit code. A check
# that fails prints its whole output, not just the last line.
# Every test/*.test.js is found and run without being listed here.
cd "$(dirname "$0")/.." || exit 1
fails=0

run() { # run <label> <command...>
  local label=$1; shift
  local out rc
  out=$("$@" 2>&1); rc=$?
  printf '%-8s %s\n' "$label" "$(printf '%s\n' "$out" | tail -1)"
  if [ "$rc" -ne 0 ]; then
    printf '%s\n' "$out" | sed 's/^/         /'
    printf '%-8s FAILED (exit %s)\n' "$label" "$rc"
    fails=$((fails + 1))
  fi
}

run registry node build-registry.js --check
run lint     python3 lint-booklet.py
for f in test/*.test.js; do
  [ -e "$f" ] || continue
  run "$(basename "$f" .test.js)" node "$f"
done

if [ "$fails" -ne 0 ]; then
  echo
  echo "$fails check(s) failed"
  exit 1
fi
echo
echo "all checks passed"
