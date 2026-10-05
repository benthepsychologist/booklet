// The hosted /app/ Content-Security-Policy as every browser script applies it: ONE constant, so a change to the
// published site's header is made here and nowhere else. Not a test (the runners take *.test.js and *-browser.js).
// connect-src names the registry's origin only: the renderer never reads its own origin (renderer 0.10.4 checked), so the
// site's header does not allow it. If the site's header changes, change this line and run bash test/run-browser.sh.
module.exports="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
