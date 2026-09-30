# Open a booklet from a link (`src`, inline, registry)

**Depends on:** #SECURITY (renderer hardening). Do not ship link opening before the CSP and SVG allowlist work lands. A link makes every flaw in the renderer one tap away for a stranger.

## Why

The first audience (clinicians, tutors, teachers) sends things by link, not attachment. Today a stranger who taps "Open Booklet" gets an empty renderer and a Load button. The wrapper already supports `preset_url` + `booklet.key`; a link is that config carried in the address.

## Principles

- **Everything rides in the fragment (`#…`), never the query string.** Browsers don't send the fragment to any server, so no host log records who opened what.
- **A link carries a design, never answers.** Links are built from a preset (records stripped). The generator refuses or strips a records section every time.
- **Linked content is untrusted input.** It goes through exactly the same parser and sanitizer as a loaded file. No path is "trusted because it came from the registry."
- **The renderer is the security boundary.** The linter and registry review improve quality; an attacker won't lint their file.

## Three link forms

All three are routes on the existing hash router.

| Form | Address | Use |
| --- | --- | --- |
| Hosted file | `#/open?src=<url-encoded https URL>` | Any booklet hosted somewhere with CORS |
| Inline | `#/open?b=1.<base64url(deflate-raw(utf-8))>` | Small worksheets; the link *is* the file |
| Registry | `#/add/<module-id>` | Curated modules in the site's registry |

### 1. Hosted file (`src`)

- `https:` only. Reject every other scheme, including `http:`, `data:`, `blob:`, `file:`.
- Fetch with `credentials: "omit"`, `referrerPolicy: "no-referrer"`, `mode: "cors"`, 10 s timeout.
- Read the body as a stream with a **1 MB cap**; abort past it. Decode as UTF-8; reject on decode errors.
- After redirects, the final URL must still be `https:`. Show the **final** host in the prompt.
- Convenience rewrites (documented, tested): `github.com/<u>/<r>/blob/<ref>/<path>` → `raw.githubusercontent.com/…`; Gist page → Gist raw. No other rewriting.
- Failure messages name the likely cause: not found, blocked by the host (CORS), too large, not a booklet.

### 2. Inline (`b`)

- Payload: version prefix `1.` then base64url of raw-deflated UTF-8 (`CompressionStream("deflate-raw")`; Safari 16.4+).
- **Caps:** fragment ≤ 32 KB; **decompressed ≤ 1 MB, enforced while streaming** (stops a compression bomb before it's inflated).
- Unknown version prefix → "This link was made by a newer Booklet."

### 3. Registry (`add`)

- Resolves only against the wrapper's `registries`. On bookletmd.org that is the published `registry.json`.
- Unknown id → message plus a link to browse the registry. No fallback fetch by guessing a path.

## The open prompt (all forms)

Before anything is stored:

- Title, language(s), number of activities, and **where it came from**: "a link to raw.githubusercontent.com", "a link (the booklet is inside the link)", or "the Booklet registry".
- One plain line: *Booklet didn't write or check this. Your answers stay on this device.*
- **Open** / **Cancel**. Cancel stores nothing.
- Remote images in link-opened booklets are **off by default**, with a per-booklet "Show images from the web" control. Remote images are read receipts.

## Identity and reopening

- Library key = booklet `id` + a hash of the source (`src` URL, or the inline payload).
- Opening the same link again **resumes** that booklet. No duplicates.
- If the source now differs (author updated it), offer the existing *Add to what's here* merge: new activities in, answers kept. Never silently replace.
- Store provenance (source kind + URL) in the **library entry**, not the booklet file.

## Locked pages

A page whose wrapper sets `booklet.key` ignores `#/open` and `#/add`. Its route stays on its own booklet. (Otherwise a link could hijack a site's locked page.)

## Author side: "Get a link"

In **Send or save a copy**:

- Build from the design only. If the booklet has entries, say "Your answers won't be included" and strip them.
- If the inline link is ≤ ~2,000 characters, offer it as "short enough for a text message". Up to 32 KB: offer it with a note that some email apps cut long links. Past 32 KB: explain hosting and link to a how-to (GitHub Gist is the easiest).
- A `src` link builder: paste a URL, test-fetch it (CORS + parse), then produce the link.
- Copy button plus the share sheet where available.

## Out of scope (separate issues)

- Getting answers back to the sender.
- Per-booklet link previews. Fragments aren't visible to a static host, so every link previews as the site's default card.
- Short links or any upload service. Not planned: it would need a server and moderation, and would eventually receive filled-in clinical worksheets.

## Acceptance

- [ ] All three routes work in Chromium, Firefox and WebKit (Playwright), including iOS Safari.
- [ ] Every rejection path has a test: bad scheme, non-https redirect, over-size stream, bomb payload, bad UTF-8, non-booklet text, unknown registry id, unknown `b` version.
- [ ] Reopening the same link resumes; a changed source offers a merge.
- [ ] A generated link never contains a records section (test with a booklet full of entries).
- [ ] Locked pages ignore link routes.
- [ ] Link-opened booklets load no remote resource until the reader allows it (checked with request interception).
- [ ] README and SPEC document the routes as part of the reference renderer, not the format.
