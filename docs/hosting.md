# Hosting Booklet, and saving a reader's work

This page is for someone who serves the renderer (`booklet.html`) on their own site or machine and wants a reader's work saved somewhere other than the reader's browser. It is the contract such a host follows.

It describes renderer 0.11.4 and later. The format (`SPEC.md`) is not involved: nothing here changes what a booklet file may say.

## When the renderer will hand a booklet to a host

The renderer hands a booklet to a host only when two checks both pass. Neither depends on the host: they are made by the renderer, for the reader.

**Check 1: the page is on the reader's own machine or private network.** The renderer decides this once, when it starts, from the page's own address (`location`), which a page's script cannot change. The address must be one of:

| allowed | examples |
| --- | --- |
| a file on the reader's own disk (`file:`) | `file:///Users/ben/booklet.html` |
| loopback | `localhost`, `*.localhost`, `127.0.0.0/8`, `::1` |
| private IPv4 | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` |
| shared address space (Tailscale's range) | `100.64.0.0/10` |
| private and link-local IPv6 | `fc00::/7` (Tailscale uses `fd7a:115c:a1e0::/48`), `fe80::/10` |
| a name with no dot | `fleet`, `nas` |
| private-use names | `*.local`, `*.internal`, `*.lan`, `*.home.arpa` |
| Tailscale names | `*.ts.net` |

Everything else is public, including `bookletmd.org`, and on a public address the hook refuses. An IPv4 address must be four plain decimal numbers (a name like `10.example.com` is a name, not an address); an IPv4-mapped IPv6 address (`::ffff:10.0.0.1`) is judged by the IPv4 address inside it.

`*.ts.net` is a judgement call made on purpose: it is the name a box gets when served over HTTPS inside the tailnet, so it is allowed. Tailscale's Funnel can publish a `*.ts.net` name to the internet, so such a name is not proof of a private network. Check 2 is what covers that.

**On a public address**, `Booklet.host` returns a handle whose members do nothing, `handle.state()` says `"refused"`, no notice is shown, the top bar says "Kept in this browser only", `onChange` listeners are never called and `Booklet.text()` returns `""`. Nothing is said to the reader, because there is nothing they can do. `window.Booklet` stays defined with the same members, so a page's script does not break.

**Check 2: the reader says yes, on that page.** When a host's script calls `Booklet.host({ label })` on a page that passes check 1, the host is *waiting*, not active. The renderer shows its own notice at the top of the screen:

> This page wants to save the booklets it opens for you to: *label*. Your booklets stay in this browser too.  [Allow] [Not now]

- **Allow** makes the host active and remembers the answer for this site in this browser (one local storage key, `booklet.host.allowed`, holding the label it was given for). If one of the host's booklets is open, `onChange` then hears of it once, at once, so the store gets the current text. On the next visit a host that gives the same label is active at once, with no notice (and `onChange` hears of a booklet already open, once).
- **Not now** leaves the host waiting for this visit and hides the notice. It asks again on the next visit.
- If a later visit's `Booklet.host` gives a different label from the one remembered, the renderer asks again.
- **The press must be the reader's own.** The renderer acts on Allow (and on Stop) only for a trusted click (`event.isTrusted`), so a page's script cannot press it for the reader: `element.click()` and dispatched events are not trusted. This stops a host's script from answering for the reader. It does not stop a site that edits the renderer.
- **While a host is waiting, it is as if there were no host:** no `onChange` calls, `Booklet.text()` returns `""`, `handle.fileChanged` does nothing, `saved()` and `failed()` do nothing, and the bar says "Kept in this browser only". A script that only calls `Booklet.onChange`, never `host()`, is never called either: only an active host is.
- **Taking it back.** On "Your booklets", once the site has been allowed, a quiet line says "This page may save the booklets it opens to: *label*." with a **Stop** button. Stop forgets the answer and makes the host waiting again (the notice does not come back until the next visit).

**`handle.state()`** returns `"active"`, `"waiting"` or `"refused"` (a public address, or a handle that has since been replaced or left). A host's script reads it to know whether to bother.

**This is about the renderer as published.** A site that edits the renderer it serves, or reads its own page some other way, is not stopped by these checks: that is caught by the checksum (see "Checking that a host serves the real renderer"), not here.

## The promise, and where the line is

Booklet's promise to readers is that nothing they write is uploaded. It runs in their browser, and their work stays there or in a file they save themselves. The renderer is one static file that anyone can copy and host, so the promise has to hold for the file, not only for one site.

**The published `booklet.html` holds no code that sends a reader's work anywhere, and never will.** Two checks guard that, over the exact file that is published:

- `test/guard.test.js` (its static check at the end) lists the browser's ways of sending (`XMLHttpRequest`, `sendBeacon`, `WebSocket`, `postMessage`, `BroadcastChannel`, forms and the rest), requires that none appears in the hand-written code, and pins the one place the renderer makes a request: a single read, with no method, no body, no credentials, no redirect, a size cap and a timeout.
- `test/pledge-browser.js` runs the file in a real browser, under the hosted site's strict Content-Security-Policy and again with no policy at all, uses it (typing, keeping entries, a diagram, a formula, opening a booklet by link) and asserts that every request it made was a plain read and that nothing the reader typed appears in any of them.

A host that wants saving does not change that file. It serves the **unmodified** `booklet.html` and adds **one script of its own** to its own page. All sending happens in that script, which is not part of this repository.

## What the renderer offers a host: `window.Booklet`

A host's script talks to the renderer through one object, `window.Booklet`. Every member is a plain function call inside the page: no request, no message to another window, nothing stored for another page. The object is frozen, and nothing in a booklet can reach it (a booklet is data; the renderer runs no code from one).

| Member | What it does |
| --- | --- |
| `Booklet.version` | the renderer's version, as text (`"0.11.6"`) |
| `Booklet.host({ label })` | the host announces itself; returns a handle |
| `Booklet.onChange(fn)` | `fn` hears when the open booklet's file text changes (a booklet the host gave); returns a function that stops the calls |
| `Booklet.open(text, { name })` | the host hands the renderer a booklet to show |
| `Booklet.text()` | the open booklet's file text now, or `""` when none is open or the open one is not the host's |

### Which booklets are the host's

A booklet is **the host's** when it came from the host: it was opened by a `#/open/<name>` link from the store the page declares, or the host handed it over with `Booklet.open(text, { name })` with a name. The renderer remembers that (the booklet's entry in "Your booklets" says `store:<name>`), so it is still the host's when the reader opens it again from the list.

Every other booklet is **the reader's alone**: one picked from the reader's own disk, pasted or dropped, started new, opened by a `#/module/<id>` link, or handed over by `Booklet.open` without a name. For such a booklet the host hears nothing: `onChange` is not called, `Booklet.text()` returns `""`, `handle.fileChanged` does nothing, there is no wait for an answer, and the top bar says "Kept in this browser only" whether or not a host is registered. The "changes not yet downloaded" note and the Download button behave as on a page with no host. A host therefore never receives, and never has to filter out, a booklet it did not give.

### `Booklet.host({ label })`

`label` says, in plain text, where saves go (`"fleet: booklets/reports"`). It is shown as text, never as markup, and capped at 80 characters. It returns a handle with five members (`saved`, `failed`, `fileChanged`, `leave`, `state`); only one host is registered at a time, and a second `host()` call replaces the first (the first handle then does nothing).

- `handle.saved()` says the current text is saved (answer every `onChange` with `saved()` or `failed()`; see "For the author of a host script"). The top bar shows "Saved" with the time.
- `handle.failed(message)` says a save failed. The top bar shows "Not saved" and the message (plain text, at most 200 characters), and the "changes not yet downloaded" note comes back. (So does silence: a host that has not answered within 20 seconds is shown as "Not saved: the host did not answer".)
- `handle.fileChanged(text)` says the file changed where it is kept (a generator rewrote it, say). It applies to the host's booklet that is open; for any other it does nothing. The renderer shows a notice offering to read the newer file. Nothing changes until the reader presses the button; then `text` is opened through the ordinary path (the same parser, refusals and notices as any file) in place of what is on screen. A text the parser refuses leaves the booklet as it was and says why.
- `handle.leave()` withdraws the host. The bar goes back to "Kept in this browser only".
- `handle.state()` says where the host stands: `"active"`, `"waiting"` for the reader's yes, or `"refused"` (see "When the renderer will hand a booklet to a host").

### `Booklet.onChange(fn)`

`fn({ text, name, title })` is called a short moment after the open booklet's file text changes (an answer, a kept entry, a rename, a module added or removed), and once when a booklet is opened. It is not called again for a change that leaves the text as it was.

- `text` is exactly what "Send or save a copy" would download.
- `name` is the store name the booklet was opened from (by a `#/open/<name>` link, or by `Booklet.open` with a name). It is never empty: a booklet that is not the host's is not reported at all.
- `title` is the booklet's name.

Calls are collapsed: at most one about every half second, and always one after the last change. An error thrown by `fn` is caught, shown in the top bar as a failed save, and never breaks the page. A listener registered after a booklet was opened is not told about it; it can call `Booklet.text()`.

### `Booklet.open(text, { name })`

The renderer opens `text` as a booklet, by the same path as a file picked by hand: the parser, its refusals, its notices. It returns `{ ok, problems }`: `ok` is false (and nothing opens) when the text is refused or the name is bad, and `problems` says why in the reader's language. `name` is optional, but only a booklet opened with one is the host's (see "Which booklets are the host's"); given, it is remembered as where the booklet lives, so `onChange` reports it, and it must pass the same name check as a link. In a browser one store name is one booklet: opening a name the browser already keeps opens that booklet, and if the text handed over differs from what the booklet last read from that name (and from what it would write now), the reader is offered the newer file, as with `fileChanged`.

### What the reader sees

- With an active host, the top bar carries a small line: "Saves go to: *label*", then "Saved 10:42", "Saving…" (between a change and the host's `saved()`) or "Not saved: *message*". While the host reports saves succeeding, the "changes not yet downloaded" note rests; it comes back when a save fails.
- A host that is waiting for the reader's Allow, or refused, shows the same line as no host: "Kept in this browser only".
- With no host, the same place says "Kept in this browser only". This is true of bookletmd.org and of any plain copy.
- "Send or save a copy" and everything else work the same either way.

### What a host's script looks like

A host's script is the host's own and runs only on the host's page. It calls the interface and does its own sending; the renderer never sees how. In outline (the sending is shown as a placeholder, not code from this repository):

```js
const me = Booklet.host({ label: "my box: booklets/reports" });
// me.state() is "refused" on a public address: nothing will be handed over, so a host may stop here.
// "waiting" is normal: the reader has not pressed Allow yet. Register as usual; nothing is called until they do.
Booklet.onChange(({ text, name }) => {
  // no `if (!name) return` is needed: the renderer only reports booklets the host gave, and each has a name
  hostSavesSomehow(name, text)               // the host's own code
    .then(() => me.saved(), err => me.failed(String(err)));
});
// when the host learns the file changed where it is kept:
//   me.fileChanged(newText)
```

## For the author of a host script

- **Answer every `onChange`.** Call `saved()` or `failed()` after each call. If the host has not answered within 20 seconds, the reader is told "Not saved: the host did not answer", and the "changes not yet downloaded" note comes back; a later `saved()` clears it. A host registered with nothing listening through `onChange` saves nothing, so the note does not rest for it at all.
- **You are only told of your own booklets.** A reader may open a file from their own disk on your page; you never hear of it, so you cannot save it by mistake and need not check for it.
- **After `fileChanged` is accepted, `onChange` fires** with the text as the renderer writes it, which may differ in its records section's layout from what the host just sent. Compare before writing, and do not treat that call as a new change by the reader if the text is the same.

## The store contract

A host that keeps booklets in a store follows these rules, so a link, a save and a generator agree on what the file is.

- **The file a link opens is the file a save writes.** `#/open/<name>` reads `<store>/<name>`; a save for that `name` writes the same file.
- **A save writes the whole text, atomically.** Write to a temporary file in the same place, then rename it over the file, so anything reading the file never sees half of it.
- **What the renderer changes, exactly.** While a reader only answers and keeps entries, it rewrites only the records section at the end of the file, so a comparison of the file before and after shows only what the reader did. Two things a reader can do reach above the records: **renaming the booklet** rewrites the `title:` line in the front matter, and **adding, updating or removing a module** changes the body (the module's fence, the notice box Add a module writes, and any id it renames so it does not clash). A file a reader has changed in those ways is no longer the generator's body. The host decides which wins; for a generated report, the generator's.
- **A store name is one booklet in a browser.** Opening the same `#/open/<name>` again opens the booklet the browser already keeps for that name, never a second copy. The renderer remembers a short fingerprint of the file it last read from that name. If the file you serve now is the same, or is exactly what the kept booklet would write (your saves put the reader's work in it), nothing more happens. If it differs, the reader is offered the newer file with the same notice as `fileChanged`, and nothing changes until they press. Pressing it never loses the reader's work: with a host registered, the store file is the truth and is read whole (you save every change, from any device); with no host, the new file's body is taken and the reader's own answers, entries and drafts stay. While that offer waits, `onChange` is not called for the booklet, so a save cannot overwrite a file that is newer than the one on screen.
- **When a generator rewrites the file while it is open,** the generator's body and the reader's records are both kept, because they never overlap. The host tells the renderer with `fileChanged`, and the reader chooses when to read it.
- **The host's server and script are the host's own.** They are not in this repository, and the store is never inside a published repository.
- **A host should say, on its own page, what it keeps and where.** The renderer's top bar says where saves go; the host's page is the place for the rest (who can read the store, how long it is kept).

## Checking that a host serves the real renderer

A host that modifies the file it serves can do anything, with or without this interface, so the check is on the file. Each release's notes carry the `sha256` of `booklet.html`. To print it for a copy:

```
sha256sum booklet.html          # on a Mac: shasum -a 256 booklet.html
```

A host can publish the line it prints (`<hash>  booklet.html`) beside its page so anyone can compare.

## What this does not protect against

- A host that edits the renderer it serves. The checksum above is how that is noticed.
- A flaw in the renderer that lets a hostile page's script run inside the page: such a script could register as a host, but it could equally read the page directly. A site's Content-Security-Policy is what limits where any script could send anything, so a host's header should allow no connection the renderer and its own script do not need.
