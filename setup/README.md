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

## 2. The pull-request checks

```sh
git mv setup/pr-checks.yml .github/workflows/ci.yml
git commit -m "Enable PR checks" && git push
```

From then on every pull request runs the engine tests, the validator, and the
freshness checks on the example booklet and the registry — so a contributor
finds out their module does not carry its widget before a human has to say so.

Delete this directory once both are done.
