// The Content-Security-Policy header the hub's box server sends with /app/, as every browser script applies it: ONE constant. Not a
// test (the runners take *.test.js and *-browser.js). It is a copy of APP_CSP in booklet-hub's tools/booklet-serve/serve.py (read
// 2026-10-14); that file is the original, and a change there is made here too. It differs from the bookletmd.org header (test/csp.js)
// in that it allows connect-src 'self' and no 'self' for images or fonts. Both leave script-src at 'self' 'unsafe-inline', which
// is what lets a page load its own part (parts/NAME.js) from its own address; the renderer's own meta policy applies as well.
module.exports="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'self' https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
