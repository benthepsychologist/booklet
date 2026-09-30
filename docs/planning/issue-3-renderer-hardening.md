# Harden the renderer before any link can open a file

Blocks: link opening (#1). Audited at `1dcf1f2`. Line numbers refer to `booklet.html` at that commit.

## Stakes

Every booklet a person keeps lives in `localStorage` on one origin (`booklet.library.v1`, `booklet.b.<id>`). **One script-execution bug means a malicious file can read every booklet in that browser**: on a shared family tablet or a clinic laptop, that's everyone's worksheets. Link opening removes the last bit of friction (downloading a file). The goal: no single bug is enough.

## What's already good

- Markdown is drawn to DOM nodes, never `innerHTML`; link and image URLs pass an http/https/mailto allowlist (`urlOk`, ~L5766) with control-character stripping.
- `sanitizeSvg` (~L2003) parses in an inert document, returns nodes (not a string, so no mXSS reparse), drops `<script>`, `<foreignObject>`, animation elements, `on*` attributes, and `javascript:`/`vbscript:` values. Tested against payloads: script, `onerror`, and entity-obfuscated `javascript:` all removed.
- No `eval`, `new Function`, `document.write`, `srcdoc`, `outerHTML`, `insertAdjacentHTML`.
- `__proto__`/`constructor` are guarded in several places.

## Findings

Verified by running the real `sanitizeSvg` in jsdom; confirm in real browsers.

**F1. SVG `<style>` is kept, and inline-SVG CSS is global.** A widget can restyle the whole app: hide the pinned crisis panel, overlay fake instructions ("session expired, re-enter your passphrase"), `@import` remote CSS, and use `@font-face` `unicode-range` tricks to learn which characters appear on screen, including the reader's own answers where they're displayed as text. *Severity: high* (privacy + UI spoofing; no JS needed).

**F2. Remote loads from widget SVG.** `<image href="https://…">` and `style="fill:url(https://…)"` survive sanitizing. Result: a read receipt with IP and time whenever the widget is drawn. This breaks "nothing leaves your browser". *High for link-opened files.*

**F3. CSS injection through cell colours.** `cellColor`/`cellStyle` (~L3212) put `c.color.tint` / `c.color.deep` from widget data straight into `style` strings. `"tint": "#fff;background-image:url(https://…)"` fires a request; it can also restyle the cell. *Medium.* Fix: accept only `#rgb`/`#rrggbb`/`var(--known-token)`, else fall back.

**F4. The SVG sanitizer is a denylist.** Everything in the SVG namespace not on `SVG_DROP` is kept. Denylists fail open when browsers add features. *Structural.* Fix: allowlist elements (`svg g path rect circle ellipse line polyline polygon text tspan title desc defs linearGradient radialGradient stop clipPath mask use`) and attributes (geometry, presentation attributes, `data-r`, `id`, `class`, `transform`, `viewBox`, `fill`/`stroke` as colours or local `url(#id)` only). `use`/`href` accept only `#local`.

**F5. Widget `id`s collide with the page.** A figure with `id="main"` (or any renderer id) can shadow the renderer's own elements for `getElementById`/`querySelector`. Fix: prefix every widget id per widget instance and rewrite local `url(#…)` / `href="#…"` references to match.

**F6. External links in figures.** `<a href="https://phish…">` inside SVG survives. Route SVG links through the same link handling as prose (visible destination, `noopener noreferrer`), or drop `<a>` from figures entirely.

**F7. Remote images in prose.** Allowed by design, but for link-opened booklets they're tracking pixels. Covered by #1 (off by default).

**F8. `el(…,{html})` → `innerHTML` (L2872).** Current callers pass built-in `ICONS` values, but the lookup key comes from booklet data (`ICONS[m.icon||key]`, L3577/L4469/L4489) without an own-property check. Not exploitable today; one future caller away from being so. Fix: `Object.hasOwn(ICONS,k)`, and remove the `html` key from `el()` in favour of a separate `iconEl()` that only accepts `ICONS` keys.

**F9. No Content-Security-Policy.** Nothing backstops a sanitizer bug. See Layer 2.

**F10. `mergeDeep` (L1949) copies `__proto__` keys.** No global pollution (verified by reading), but it can set a local prototype. Skip `__proto__`/`constructor`/`prototype` keys, or build with `Object.create(null)`.

## Layers (all required)

### Layer 1: input handling
- [ ] F1–F6, F8, F10 fixed as above. Drop `<style>` from figures; if per-figure styling is needed, allow a small list of presentation attributes instead.
- [ ] Size and depth limits on everything parsed: file size, JSON nesting, list nesting, footnote count, figure node count. Pathological input must fail fast, not freeze the tab.
- [ ] Review every regex that sees file content for catastrophic backtracking; add timing tests with adversarial input.
- [ ] The linter mirrors the renderer's allowlists and **warns** on anything the renderer will strip, so authors aren't surprised. The linter is never relied on for safety.

### Layer 2: CSP (makes a Layer 1 bug non-exploitable)
Via `<meta http-equiv="Content-Security-Policy">`; GitHub Pages can't set headers.
- [ ] `default-src 'none'`
- [ ] `script-src 'sha256-…' 'sha256-…'` (hashes of the two inline scripts, generated in CI). No `'unsafe-inline'`, no `'unsafe-eval'`.
- [ ] `style-src-elem 'sha256-…'` (the renderer's own `<style>` only). This alone neutralises F1 even if the sanitizer regresses.
- [ ] `style-src-attr 'unsafe-inline'` (the renderer uses style attributes; F3's allowlist covers values).
- [ ] `img-src 'self' data: blob:` by default. When a reader allows remote images for a booklet, reload that view with a policy that adds `https:`, or accept that as the one documented exception.
- [ ] `font-src 'self'`, `connect-src 'self' https:` (registries + `src` fetches), `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`.
- [ ] `require-trusted-types-for 'script'` plus a single named policy. In Chromium this turns any stray `innerHTML` of untrusted text into an error instead of a hole. Prerequisite: replace the ~45 `x.innerHTML=""` clears with `x.replaceChildren()`, since Trusted Types rejects plain-string assignments.
- [ ] CI test: the page loads with zero CSP violations; a deliberately injected `<style>`/`<script>`/remote image is blocked.
- [ ] Framing: `frame-ancestors` can't be set by meta. Either host where headers are possible (Cloudflare Pages / Netlify `_headers`) or add a frame-buster for the app page. Clickjacking over a prompt like "Open" matters once links exist.

### Layer 3: verification
- [ ] Adversarial corpus in `test/`: DOMPurify's and OWASP's XSS/mXSS cases adapted to Markdown, SVG and JSON fields; every finding above as a regression test.
- [ ] Run the corpus in **real browsers** (Playwright: Chromium, Firefox, WebKit). jsdom's parser differs from browsers in exactly the places attacks live.
- [ ] Fuzz the Markdown parser, record parser and sanitizer (property-based, a few minutes per CI run, longer nightly). Invariant: no script execution, no network request, no `on*` attribute, no `<style>`/`<script>` element in the output DOM.
- [ ] A test that fails if a new `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `DOMParser`, `eval` or `Function(` appears outside an allowlisted line.

### Layer 4: supply chain and process
- [ ] `SECURITY.md` with a private reporting route (GitHub private vulnerability reporting).
- [ ] Branch protection on `main`: required review + passing checks; 2FA on the account; signed commits or tag-based deploys.
- [ ] Registry modules are content, never code, but a registry PR is still reviewed as untrusted input (same corpus run on every module in CI).
- [ ] Changelog entries tagged `security` for anything touching sanitizing, CSP or routes.

### Later: origin isolation
The strongest structural fix is drawing booklets in a sandboxed iframe on a separate origin with no storage access, with the parent keeping the library via `postMessage`. Large refactor; worth doing if the renderer grows new engines. CSP + Trusted Types + allowlists is the right bar for now.

## Honest target

"Three or four nines" isn't a measurable property of a sanitizer. The measurable version: **every known payload class has a regression test, a sanitizer bug alone can't run script or reach the network (CSP), and nothing the renderer outputs is parsed as HTML twice.**
