# Site and repo: make bookletmd.org ready for its first audience

First audience: clinicians, tutors and teachers who will **send** a worksheet and never open the spec. The page today sells a file format to developers.

## Landing page

- [ ] **Rewrite the hero for senders.** Lead with the job: *Send a worksheet as a link. They fill it in on their phone. They keep it.* Move "open format", Markdown, the renderer and Apache-2.0 below the fold or to a `/format` page.
- [ ] **Show it.** A screenshot or short loop above the fold: a worksheet on a phone, a question answered, "Send or save a copy". Nobody can currently see a booklet without downloading one.
- [ ] **"Try an example" button** that opens a real booklet in one tap (the tides reading or the check-in). Uses the registry route from #1, or a locked preset page until #1 ships.
- [ ] **Three short use cases**, one per audience: a between-session exercise (clinician), a weekly practice log (tutor), a reading check with a folded hint (teacher). Each with a "Try it" link.
- [ ] **How to make one without Markdown.** Until in-browser editing exists, the authoring path is: give an AI assistant `SKILL.md` and describe the worksheet. Say so plainly, with a copyable prompt. Mention the checker for people who write by hand.
- [ ] **Gallery.** A browsable page drawn from `registry.json` (title, audience, languages, "Try it", "Get a link"). The registry exists; the site doesn't show it.
- [ ] **Privacy section that lists exactly what leaves the device**: nothing, except fetching registries, fetching a linked file from its host, and remote images the reader allows. Link it from the app's open prompt.
- [ ] **"For clinicians" note**: Booklet isn't a health record; answers stay on the reader's device; sending a copy back by email is the sender's and reader's choice. Keep the existing footer disclaimer.
- [ ] **Fix nav anchors.** `#format` and `#modules` don't match any section title on the page; confirm they land somewhere or point them at `/format` and the gallery.
- [ ] **Link preview card.** Add `og:image` (1200×630) and `twitter:card`. When someone texts a Booklet link, this card is all the recipient sees first. Fragment links (#1) all share it, so make it generic and trustworthy.
- [ ] **EN / ES / FR.** The app speaks three languages (and `es-AR`); the landing page speaks one.
- [ ] Favicon and home-screen icons consistent between landing page and app; publish `manifest.webmanifest` for `/app/` so "Add to Home Screen" installs properly (also protects data from Safari's seven-day storage eviction).

## App first run

- [ ] **Empty "Your booklets" isn't empty-looking.** Offer: try an example, open a file, open a link, browse activities.
- [ ] **Keep-a-copy nudge.** After the first answers in a booklet, and again after a few days, suggest saving a copy or installing to the home screen. On iOS Safari, stored data can be wiped after seven days without a visit.
- [ ] Mobile pass on a real phone (iOS Safari, Android Chrome): opening, answering every question kind, sending a copy.
- [ ] Accessibility pass (axe + keyboard + screen reader on one booklet); publish the result.

## Repo

- [ ] GitHub **About**: description, website (`https://bookletmd.org`), topics (add `worksheets`, `education`, `offline-first`).
- [ ] Tag a **release** (`v0.2.0`) with notes; link it from the site footer.
- [ ] **STATUS.md contradictions**: it says the renderer reads two format generations (README: v0.2 only) and that no published site runs it (bookletmd.org does). Update both.
- [ ] **Known-broken feature**: "add a map" was deleted and needs rebuilding on `addModuleFromText()` (STATUS.md). Rebuild or remove its entry points before announcing.
- [ ] README: add a four-line "What is this / try it / make one / read the spec" block before the architecture material. Keep the rest; it's good for implementers.
- [ ] `SECURITY.md` and private vulnerability reporting (see #3).
- [ ] Issue templates: "My booklet doesn't open", "New activity for the registry", "Security report → use private reporting".
- [ ] `CONTRIBUTING.md`: a short path for non-developers contributing an activity (write it with the skill, run the checker, open a PR or email it).

## Announce checklist (after the above)

- [ ] #1 and #3 shipped.
- [ ] Five ready-to-send worksheets across the three audiences, in at least EN + ES.
- [ ] Three people outside the project send and fill in a booklet by link, on phones, without help. Fix what trips them.
