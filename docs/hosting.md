# Hosting Booklet, and saving a reader's work

This page is for someone who serves the renderer (`booklet.html`) on their own site or machine and wants a reader's work saved somewhere other than the reader's browser. It is the contract such a host follows.

It describes renderer 0.11.2 and later. The format (`SPEC.md`) is not involved: nothing here changes what a booklet file may say.

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
| `Booklet.version` | the renderer's version, as text (`"0.11.2"`) |
| `Booklet.host({ label })` | the host announces itself; returns a handle |
| `Booklet.onChange(fn)` | `fn` hears when the open booklet's file text changes; returns a function that stops the calls |
| `Booklet.open(text, { name })` | the host hands the renderer a booklet to show |
| `Booklet.text()` | the open booklet's file text now, or `""` when none is open |

### `Booklet.host({ label })`

`label` says, in plain text, where saves go (`"fleet: booklets/reports"`). It is shown as text, never as markup, and capped at 80 characters. It returns a handle with four members; only one host is registered at a time, and a second `host()` call replaces the first (the first handle then does nothing).

- `handle.saved()` says the current text is saved (answer every `onChange` with `saved()` or `failed()`; see "For the author of a host script"). The top bar shows "Saved" with the time.
- `handle.failed(message)` says a save failed. The top bar shows "Not saved" and the message (plain text, at most 200 characters), and the "changes not yet downloaded" note comes back. (So does silence: a host that has not answered within 20 seconds is shown as "Not saved: the host did not answer".)
- `handle.fileChanged(text)` says the file changed where it is kept (a generator rewrote it, say). The renderer shows a notice offering to read the newer file. Nothing changes until the reader presses the button; then `text` is opened through the ordinary path (the same parser, refusals and notices as any file) in place of what is on screen. A text the parser refuses leaves the booklet as it was and says why.
- `handle.leave()` withdraws the host. The bar goes back to "Kept in this browser only".

### `Booklet.onChange(fn)`

`fn({ text, name, title })` is called a short moment after the open booklet's file text changes (an answer, a kept entry, a rename, a module added or removed), and once when a booklet is opened. It is not called again for a change that leaves the text as it was.

- `text` is exactly what "Send or save a copy" would download.
- `name` is the store name the booklet was opened from (by a `#/open/<name>` link, or by `Booklet.open` with a name), or an empty string.
- `title` is the booklet's name.

Calls are collapsed: at most one about every half second, and always one after the last change. An error thrown by `fn` is caught, shown in the top bar as a failed save, and never breaks the page. A listener registered after a booklet was opened is not told about it; it can call `Booklet.text()`.

### `Booklet.open(text, { name })`

The renderer opens `text` as a booklet, by the same path as a file picked by hand: the parser, its refusals, its notices. It returns `{ ok, problems }`: `ok` is false (and nothing opens) when the text is refused or the name is bad, and `problems` says why in the reader's language. `name` is optional; given, it is remembered as where the booklet lives, so `onChange` reports it, and it must pass the same name check as a link.

### What the reader sees

- With a host registered, the top bar carries a small line: "Saves go to: *label*", then "Saved 10:42", "Saving…" (between a change and the host's `saved()`) or "Not saved: *message*". While the host reports saves succeeding, the "changes not yet downloaded" note rests; it comes back when a save fails.
- With no host, the same place says "Kept in this browser only". This is true of bookletmd.org and of any plain copy.
- "Send or save a copy" and everything else work the same either way.

### What a host's script looks like

A host's script is the host's own and runs only on the host's page. It calls the interface and does its own sending; the renderer never sees how. In outline (the sending is shown as a placeholder, not code from this repository):

```js
const me = Booklet.host({ label: "my box: booklets/reports" });
Booklet.onChange(({ text, name }) => {
  if (!name) return;                         // not a booklet the host stores
  hostSavesSomehow(name, text)               // the host's own code
    .then(() => me.saved(), err => me.failed(String(err)));
});
// when the host learns the file changed where it is kept:
//   me.fileChanged(newText)
```

## For the author of a host script

- **Answer every `onChange`.** Call `saved()` or `failed()` after each call. If the host has not answered within 20 seconds, the reader is told "Not saved: the host did not answer", and the "changes not yet downloaded" note comes back; a later `saved()` clears it. A host registered with nothing listening through `onChange` saves nothing, so the note does not rest for it at all.
- **After `fileChanged` is accepted, `onChange` fires** with the text as the renderer writes it, which may differ in its records section's layout from what the host just sent. Compare before writing, and do not treat that call as a new change by the reader if the text is the same.

## The store contract

A host that keeps booklets in a store follows these rules, so a link, a save and a generator agree on what the file is.

- **The file a link opens is the file a save writes.** `#/open/<name>` reads `<store>/<name>`; a save for that `name` writes the same file.
- **A save writes the whole text, atomically.** Write to a temporary file in the same place, then rename it over the file, so anything reading the file never sees half of it.
- **What the renderer changes, exactly.** While a reader only answers and keeps entries, it rewrites only the records section at the end of the file, so a comparison of the file before and after shows only what the reader did. Two things a reader can do reach above the records: **renaming the booklet** rewrites the `title:` line in the front matter, and **adding, updating or removing a module** changes the body (the module's fence, the notice box Add a module writes, and any id it renames so it does not clash). A file a reader has changed in those ways is no longer the generator's body. The host decides which wins; for a generated report, the generator's.
- **When a generator rewrites the file while it is open,** the generator's body and the reader's records are both kept, because they never overlap. The host tells the renderer with `fileChanged`, and the reader chooses when to read it.
- **The host's server and script are the host's own.** They are not in this repository, and the store is never inside a published repository.
- **A host should say, on its own page, what it keeps and where.** The renderer's top bar says where saves go; the host's page is the place for the rest (who can read the store, how long it is kept).

## Checking that a host serves the real renderer

A host that modifies the file it serves can do anything, with or without this interface, so the check is on the file. Each release's notes carry the `sha256` of `booklet.html`. To print it for a copy:

```
python3 lint-booklet.py --renderer-checksum booklet.html
```

The line it prints (`<hash>  booklet.html`) is the same as `sha256sum booklet.html`. A host can publish it beside its page so anyone can compare.

## What this does not protect against

- A host that edits the renderer it serves. The checksum above is how that is noticed.
- A flaw in the renderer that lets a hostile page's script run inside the page: such a script could register as a host, but it could equally read the page directly. A site's Content-Security-Policy is what limits where any script could send anything, so a host's header should allow no connection the renderer and its own script do not need.
