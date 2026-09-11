# Turning the rest of it on

Two steps, both one-time. Neither needs a token.

## 1. GitHub Pages — serves the registry

**Settings → Pages → Build and deployment → Source: _Deploy from a branch_ →
Branch: `main`, folder: `/ (root)` → Save.**

A minute later the registry is live at:

```
https://benthepsychologist.github.io/booklet/registry.json
```

and the modules it names resolve beside it, because a registry entry's `file`
is relative to the registry's own URL. The renderer is served too, at
`/booklet/booklet.html`, so there is somewhere to try it.

Pages is used rather than `raw.githubusercontent.com` because both send the
CORS header a browser needs, but raw has no published rate limit and returns no
rate-limit headers, so you cannot tell you are near one. Pages has a documented
100GB/month allowance and a CDN edge.

## 2. The pull-request checks — done

Live in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). Every pull
request runs the engine tests, the validator, and the freshness checks on the
example booklet and the registry — so a contributor finds out their module does
not carry its widget before a human has to say so.

## 3. `.nojekyll` — why it is there

GitHub Pages runs Jekyll on a branch deploy, and Jekyll renders any file with
YAML front matter into HTML. Module files have front matter, so they would have
been served as `.html` and every `.md` the registry points at would 404 — the
menu would look right and every add would fail. The empty `.nojekyll` file at
the repo root turns Jekyll off and serves files as they are.
