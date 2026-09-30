# Link opening, email-back, trust model and roadmap

*Planning notes, 30 September 2026. Summarises the discussion and research that followed the three issue drafts in this folder ([open from a link](issue-1-open-from-link.md), [site updates](issue-2-site-updates.md), [renderer hardening](issue-3-renderer-hardening.md)). Platform behaviour marked "verify" has not been tested on real devices yet. Legal points are summaries, not legal advice.*

## Decisions so far

- **Testing now is Ben and hobbyists.** Clinicians come later; average teachers and practitioners need field testing first.
- **Nobody will self-host before it's security-proven.** So the first real use has to work from the renderer hosted at bookletmd.org. That makes *link opening on bookletmd.org* and *renderer hardening* one milestone, not two.
- **Ship link opening as a strict subset first** (see [First milestone](#first-milestone-link-opening-as-a-strict-subset)) rather than waiting for every hardening item.
- **An authenticated version is possible** if manual return turns out to be too much friction. It is a different privacy promise and gets decided deliberately, from field-test evidence (see [If we go authenticated](#if-we-go-authenticated)).
- **The target workflow** is "open this link, fill it in, send it back with my own email app."

## The core rule: authors ship data, never markup, styles or code

Every hole the audit found (SVG `<style>` restyling the whole app, `@font-face`/`@import` exfiltration, remote `<image href>` read receipts, id collisions, colour strings concatenated into `style`) comes from letting author text reach an HTML, CSS or SVG parser. The fix is not a better sanitizer. It is no author-controlled parser input at all. A page can only be "attacked with CSS" if it renders CSS someone else wrote.

Sanitizing arbitrary SVG is not a safe foundation: DOMPurify shipped several mXSS bypasses in 2024–2025, and Chrome's new Sanitizer API had two bypasses published within months of shipping. Sanitizers also target script, not CSS exfiltration or UI spoofing.

This rule fits the product: the stricter the format, the more reliably an LLM with `SKILL.md` produces valid booklets, and the safer they are to open. It also matches the existing prime directive ("No hidden execution in modules", `AGENTS.md`).

### Trust tiers

| Tier | Contents | From an arbitrary link | Rules |
|---|---|---|---|
| 0 | Markdown prose, built-in question kinds, records | Yes, after a "save to your library?" prompt | DOM-built rendering (as now). Links http/https/mailto only, destination visible. No raw HTML. |
| 1 | Data-only widgets for built-in engines | Yes | JSON Schema, `additionalProperties: false`. Colours only as validated tokens (`#rrggbb` or palette slots), set with `style.setProperty()` after validation, never concatenated. Author ids namespaced, never used as DOM ids. Size caps. |
| 2 | Figures and themes | Figures as `<img>` only; themes as tokens only | See below. |
| 3 | Code modules (cognitive tasks, custom engines) | **Never** | Only a reviewed, hash-pinned registry module, run in a sandbox on a separate origin. |

**Rejected outright, whatever the user clicks:** raw HTML, any author CSS (`<style>`, `style=`, `url()`), inline SVG markup, external URLs in resource positions (images, fonts, backgrounds), iframes/objects/embeds/forms, `javascript:`/`data:` links, any script, any request for network access.

### SVG

- **Decorative figures:** accept SVG files but display them as `<img src="blob:…">`. SVG loaded as an image runs no script and loads no external resources, and its `<style>` stays inside the image. Keep a light size/complexity check against `<use>` expansion and heavy filters.
- **Clickable regions (svg-regions):** stop accepting SVG markup. Use a geometry schema, e.g. `{viewBox:[0,0,w,h], regions:[{id, label, d:"M…Z", fillToken}]}`, validate `d` with a strict path-grammar parser, and build `<path>` elements with `createElementNS`. Required `label` also improves accessibility. Ship an SVG→geometry converter in the editor and describe the schema in `SKILL.md`.
- Shadow DOM is not a security boundary (fonts and network loads leak). A sandboxed iframe is overkill for figures.

### Themes

- **Reader-chosen themes always win:** light, dark, high contrast, dyslexia-friendly font, large text.
- **A booklet may declare** a built-in theme id or a token object (`accent`, `surface`, `fontFamily` from a bundled list, `radius`), every value checked against a regex or enum. No web fonts. The renderer checks WCAG contrast (4.5:1 text, 3:1 large text/UI) and falls back if it fails.
- **The crisis/resources panel and the trust chrome** (source host, pin status, return address) sit outside the themable area.

### What a permission prompt may and may not grant

Jupyter's "Trust notebook", Office's "Enable content" and PDF JavaScript all show that a prompt a hurried person can click must never grant code or network access. Microsoft ended up blocking macros in downloaded files with no enable button at all. Warning-habituation research (Akhawe & Felt: users clicked through ~70% of Chrome's SSL warnings) says warnings work only when rare and specific.

**May grant** (narrow, reversible, per booklet): save to the library; fetch this file once from `host.example`; show a suggested return address; install a specific reviewed registry module version (Tier 3 only, later).

**May never grant:** network access for content; access to other booklets or the library; author CSS or HTML; automatic sending; persistent "trust everything from this author." No global trust toggle. Granted capabilities are listed and revocable.

### Network discipline: one fetch, then nothing

- **Hash-based meta CSP now**, first element in `<head>`: `default-src 'none'`, script and style hashes (two inline scripts, one style block), `img-src 'self' data: blob:`, `font-src 'self'`, `connect-src https:`, `form-action 'none'`, `base-uri 'none'`, `object-src 'none'`, `require-trusted-types-for 'script'`. No `'unsafe-inline'` or `'unsafe-eval'`.
- **Tighten after the one fetch** by appending a second meta CSP (`connect-src 'none'; img-src 'self' blob: data:`). Enforced policies intersect, so a second policy can only tighten; editing an existing meta's content is ignored. Verify in Chromium, Firefox and WebKit with a test that tries a fetch afterwards.
- **What meta CSP can't do:** `frame-ancestors`, `sandbox`, reporting. Until hosting sets headers, add a JS frame-buster. Move to a host with headers (Cloudflare Pages or Netlify `_headers`): CSP header plus `frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`, `Cross-Origin-Opener-Policy`. Keep the meta CSP for people who open the HTML file locally.
- **Origins:** renderer on its own origin (e.g. `app.bookletmd.org`), separate from the docs site; future code modules on an unrelated domain.
- **"0 requests since load" indicator:** a good honesty feature and regression catcher (`PerformanceObserver` on resource entries), but self-reported. Pair it with a verification recipe (install, airplane mode, still works; or DevTools → Network) and published SHA-256 hashes of each release.

## Links

| Form | Address | Notes |
|---|---|---|
| Inline | `#/open?b=1.<base64url(deflate-raw)>` | Most private: no host involved, fragments never reach a server. Cap the fragment and the inflated size, stop decompression at the cap. |
| Hosted | `#/open?src=<https URL>&sha256=<hex>` | The host learns IP and time (a read receipt). Say so in the prompt. |
| Registry | `#/add/<id>@<version>` | Curated content. |

- **Hash pinning is the key move.** With `sha256=`, the renderer refuses to open anything that doesn't match, so the recipient sees exactly the file the sender checked, whatever happens to the host later. Show "Verified: identical to the file your sender checked"; unpinned links say "This file can change without notice." Editors and `SKILL.md` should always produce pinned links.
- **CORS:** GitHub raw and Gist raw generally work; Drive, OneDrive, Dropbox and Box share links mostly don't. Build a host-compatibility test page (verify). No proxy: a proxy breaks "no server sees it."
- **Registry vs host-anywhere:** default to host-anywhere with pins plus inline links. Keep a small curated, PR-reviewed registry (now `booklet-registry`). **Don't run an Imgur-style upload host:** phishing, harassment and illegal-content handling, Canada's mandatory-reporting duties for content hosts, notice-and-notice/DMCA, and above all people will upload completed booklets with health information in them. If hosting ever happens, it is ciphertext only, with expiry, for authenticated professionals.

## Email-back: what a static page can actually do

**No web API opens the person's email app with the file attached *and* the recipient filled in.**

- **`mailto:`** can set recipient and subject but never attach files (RFC 6068). Clients that once honoured `attach=` were exploited to exfiltrate local files ("Mailto: Me Your Secrets", 2020), so no modern client will. Bodies top out around 1,500–2,000 encoded characters, and if the handler is webmail the whole URL goes to that provider before Send. Never put answers in a mailto.
- **Web Share Level 2** (`navigator.share({files})`) attaches the file on iOS Safari, Android Chrome and Chromium desktop, but can't choose the app or set a recipient. No file sharing in Firefox desktop; no `navigator.share` at all in Android WebView in-app browsers (Gmail, Instagram, Facebook…).
- **Chromium blocks `.md` in Web Share** (its extension allowlist has `txt`/`csv`/`html`, not `md`). Share as `*.booklet.txt` with `text/plain`; the renderer accepts `.booklet.md`, `.booklet.txt` and `.md`. Verify on current Chrome Android.
- **`.eml` drafts** only work reliably in classic Outlook for Windows. Drop them.

### Fallback ladder for "Send to your clinician"

1. **In-app browser detected** → "Open in Safari/Chrome" first.
2. **Preflight card in the renderer's own UI:** "Send to: dr.x@clinic.ca (suggested by this booklet — edit)", domain highlighted, Copy button, encryption toggle.
3. **Tier A:** `canShare({files})` → `share({files, title, text: "To: …"})`. Swallow `AbortError`.
4. **Tier B:** save (`showSaveFilePicker` or `<a download>`), then a separate `mailto:` button with only address, subject and "attach the file you just saved."
5. **Tier C:** copy the text (warn that it's plain answers).
6. **Tier D:** the clinician's own portal upload.

### Return address and key spoofing

A malicious booklet can suggest an attacker's address (or, with encryption, an attacker's key) and dress up as a clinic form. Rules: the address is shown by renderer chrome, never booklet content; full address, domain highlighted, editable; remember sender→address on first use and warn loudly if it changes; unpinned files get "whoever made this file wrote this address." The real fix is **verified clinician identity** (below).

## Receiving answers now, in order of preference

1. **The client keeps it** and brings it to session. Nothing is transmitted, nothing to consent to beyond "this lives on your device." This is the part no survey tool offers, and it covers most handouts.
2. **The clinician's own portal.** Export records as FHIR `QuestionnaireResponse`; upload to a FHIR portal or whatever practice system is in use.
3. **Email, done honestly:** the ladder above, plus the existing passphrase protection (passphrase given aloud in session, never in the email), or encryption to the clinician's public key (age/X25519 or WebCrypto ECDH + AES-GCM), plus a bilingual consent template.

Client-side notes for any clinician sending booklets: open in Safari/Chrome, not inside Gmail or WhatsApp; add to the home screen or save a copy (iOS Safari can clear site data after seven days without a visit); anyone using the device can see it.

## Compliance notes (Canada first)

- **Ontario.** IPC Ontario's 2016 fact sheet: encrypt where feasible; unencrypted email needs a written policy and prior consent. CPSO: implied consent because the patient initiated the email is not enough. CPBAO Standards (July 2024), 9.5(3): electronic records must be encrypted before transmission. So unencrypted email return is weak ground even with consent.
- **Quebec.** OPQ (2022): email allowed with free and informed consent after discussing risks; file emails as-is and don't leave copies on devices. Law 25: health information is sensitive (express consent); art. 17 requires a privacy impact assessment before personal information leaves Quebec, relevant to a clinician practising from outside Quebec. Misdirected email is a confidentiality incident (register kept five years, serious-harm incidents reported to the CAI).
- **HIPAA / GDPR** for other users: HIPAA allows unencrypted email to a warned individual who prefers it (about sending to patients); GDPR treats health data as special category.
- **Responsibility:** the client controls their outbox; the clinician is responsible from receipt and for choosing and consenting to the channel. A static tool that never touches data is probably not a custodian or service provider. That advantage disappears once Booklet hosts return data.
- **Research (TCPS 2 / REBs):** email return is approvable for small, low-risk studies with consent language, but Booklet needs instrument identity in every record (id, version, design hash), schema-validated records, a local collector that merges many returned files into validated CSV/JSON, pseudonymous participant codes, and an append-only edit trail. Be honest that a client-side file can't prove answers weren't edited; only a server-side receipt can. Realistic fit for now: pilots, worksheet-style instruments, N-of-1.

## First milestone: link opening as a strict subset

Because nobody will self-host, this is the gate for the first external test (e.g. a tech-savvy clinician-researcher sending a booklet to a client from bookletmd.org).

- **Allowed from a link:** Markdown prose, built-in question kinds, widget data with no SVG and no colour strings.
- **Rejected with a clear message:** SVG markup, anything that becomes author styling, raw HTML, external image URLs. "This booklet uses features that can't be opened from a link yet."
- **Inline `#/open?b=` links only at first.** No fetch, no host to trust, nothing to pin.
- **Hash-based meta CSP** shipped at the same time.
- **Trust prompt, library dedupe and "links carry design, never answers"** as in issue 1.

Then widen, one step at a time: hosted `src=` links with hash pins; SVG→geometry and figures-as-images; token themes; post-fetch CSP tightening; move to a host with headers. Nothing risky is ever half-supported.

## If we go authenticated

Automatic return or sync means a server holds client data, which makes Booklet a service provider (Law 25 obligations, a PIA for data leaving Quebec, Canadian hosting). If it happens:

- **Encrypt to the clinician's key before upload,** so the server only holds ciphertext. The promise changes from "nothing leaves your device" to "only leaves encrypted to your clinician", and should be stated that way.
- **Accounts for clinicians only;** clients get magic links.
- **Keep return and sync separate.** Client→clinician return is the valuable part; syncing a client's own devices is a much bigger data footprint.
- **It doesn't replace hardening.** Signed-in users still open content others wrote.
- **Decide from evidence:** if clients consistently drop off at the email step, build it. If they mostly keep the booklet and bring it to session, the static version holds.

## Code-bearing modules (cognitive testing)

- **Timing:** browser packages show roughly 3–8 ms inter-trial variability (Bridges et al. 2020); fine for within-subject RT differences, not absolute RTs or sub-10 ms stimulus control. `performance.now()` at 100 µs without cross-origin isolation is not the bottleneck, so COOP/COEP isn't required.
- **Sandbox:** separate registrable domain; `<iframe sandbox="allow-scripts">` without `allow-same-origin`; hash-loaded bundle with its own `connect-src 'none'` CSP; a `postMessage`/`MessageChannel` capability API limited to `ready`, `resize`, `saveResult` (schema-checked, written only under that module's records) and `finish`; rate and size watchdog. Workers can't draw stimuli; ShadowRealm isn't shipped; SES and QuickJS-in-WASM are weaker or slower choices here.
- **Review:** exact bytes, hash-pinned, no network capability, minimal declared capabilities, re-review every version, revocation list.
- **Regulatory:** a delivery tool for a clinician's worksheet is very probably not a medical device. A module that scores and *interprets* a cognitive test moves toward Software as a Medical Device (Health Canada 2019 guidance; FDA/EU similar). Show declared formulas ("total = 14"), leave interpretation to the clinician, and get regulatory advice before any scored cognitive module.
- **Licensing:** many instruments (e.g. MoCA) need licences and trained or qualified users. Registry entries need a licence field and a qualification flag, and must refuse proprietary instruments without proof of rights.
- **Phases:** 0 no third-party code (now) → 1 first-party timing engines configured by data → 2 separate-origin sandbox carrying only our own modules → 3 a few reviewed third-party modules. **Never** code in a link.

## Roadmap

1. **Now to ~3 months: safe renderer and links.** Strict-subset link opening, CSP, then pins, geometry, token themes, send ladder, adversarial tests in real browsers; public format spec and security model. Run a blind `SKILL.md` authoring test.
2. **~3–6 months: one clinical loop, done properly.** Ben's practice plus 5–10 design-partner clinicians. Passphrase and recipient-key encryption, a clinician view that opens returned files and shows trends, FHIR export, consent templates. Pull the **basic OSS editor** into this phase; clinicians who don't prompt LLMs need it, and "customize as you go" is what to learn from them.
3. **~6–12 months: Booklet Studio (paid).** Visual authoring, verified clinician profiles publishing address and key fingerprint, curated library, possibly the encrypted relay.
4. **Research track, in parallel:** collector, instrument versioning, XLSForm/REDCap import.
5. **Code modules:** phases above.
6. **Consumer product last,** only once Studio proves the format.

## Vision: strengths, gaps, cleanups

**Strong, lean into it:**
- The strict format and LLM authoring reinforce each other.
- No server means no custodian status: a legal advantage and a selling point.
- Activities, not forms: body maps, card sorts, exposure hierarchies, mood diaries fill a real gap between static PDFs and survey engines.

**Could be cleaner:**
- Don't compete on intake forms; practice-management systems already put answers straight into the chart. Compete on homework the client keeps.
- Three products are three businesses (open-source community, professional sales, consumer growth). Make Studio the business; keep consumer as a later bet.
- "Customize as you go" and "use your own AI" must stay inside the data tiers. The editor and any AI edit data, never code or CSS; the consumer idea naturally drifts toward user-written code and the format must refuse it.

**Missing or underweighted:**
- **Clinician identity** is the unsolved core: verified clinician cards, with the client checking a short key fingerprint once in session, fix both address and key spoofing. Likely the best paid feature.
- **The return channel is what people will pay for.** An encrypted-only relay fixes email's failure modes but changes the promise; decide that on purpose.
- **Scoring vs interpretation** (see regulatory note).
- **Instrument licensing and qualification flags** from day one.
- **Interop:** FHIR `Questionnaire`/`QuestionnaireResponse` import/export; XLSForm and REDCap data-dictionary import. Booklet-specific widgets degrade to plain questions.
- **The wedge is small.** Clinicians who'll use an LLM with `SKILL.md` are ideal design partners, not a market. The market is clinicians who never want to prompt anything, which is why the editor matters earlier than the vision implies.

## Verify on real devices

- Whether iOS Mail keeps share `text` alongside an attached file.
- Whether current Chrome Android rejects `.md` in Web Share.
- `navigator.share` inside iOS in-app browsers.
- Whether a dynamically added meta CSP blocks later fetches in Safari.
- Clipboard write and `share()` in the same click handler.
- CORS behaviour of Drive, OneDrive, Dropbox, Box.

## Key sources

- RFC 6068 (`mailto`); Müller et al., "Mailto: Me Your Secrets" (IEEE CNS 2020)
- W3C Web Share API; MDN `Navigator.share()`; Chromium `webshare/FILE_TYPES.md`; Can I WebView (share)
- MDN "SVG as an image"; W3C CSP3; Mike West on multiple policies (public-webappsec, Dec 2012)
- DOMPurify advisories CVE-2024-45801, CVE-2024-47875, CVE-2025-26791; Searchlight Cyber, "Two Bypasses for Chrome's Sanitizer API" (2026)
- Akhawe & Felt, "Alice in Warningland" (USENIX Security 2013); Microsoft, macros from the internet blocked by default
- IPC Ontario, "Communicating Personal Health Information by Email" (2016); CPSO advice on protecting PHI; CPBAO Standards of Professional Conduct (2024); OPQ, « Échanges par courriel et texto » (2022); Quebec P-39.1 arts. 3.5–3.8, 10, 12, 13, 17; CAI on confidentiality incidents; HHS on individuals' right of access
- Bridges et al., "The timing mega-study" (PeerJ 2020); Anwyl-Irvine et al. (Behavior Research Methods 2020); Chrome, cross-origin isolated timers
- Health Canada, Software as a Medical Device guidance (2019)
