// The hosted /app/ Content-Security-Policy as every browser script applies it: ONE constant, so a change to the
// published site's header is made here and nowhere else. Not a test (the runners take *.test.js and *-browser.js).
// connect-src names the registry's origin only, and leaves the site's own origin out. The published page declares no store,
// and from renderer 0.15 a page with no store tag reads a followed `#/open/<name>` from `modules/` beside it, on its own
// origin; under this header that read is refused (test/pledge-browser.js serves its default-folder page under a copy of this
// header with the origin added). If the site's header changes, change this line and run bash test/run-browser.sh.
module.exports="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
