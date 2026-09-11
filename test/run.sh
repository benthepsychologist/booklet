#!/usr/bin/env bash
# Every check against ../booklet.html. Needs node; nothing to install.
cd "$(dirname "$0")" || exit 1
printf '%-8s ' engine; node engine.js | tail -1
cd ..
printf '%-8s ' example; node build-example.js --check | tail -1
printf '%-8s ' lint;    python3 lint-booklet.py | tail -1
