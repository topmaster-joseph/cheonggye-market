# CGMA canonical routing

- **Representative (canonical) address: `https://cgma.or.kr`** — owner decision 2026-10-20. Every HTML page declares `<link rel="canonical" href="https://cgma.or.kr<path>">` (Pages `_middleware.js`), and the EKODI root gateway emits the same cgma.or.kr URL for pages served at `ekodi.kr/cgma`. `robots.txt` / `sitemap.xml` advertise cgma.or.kr only.

- EKODI platform route: `https://ekodi.kr/cgma` (same content, canonical points to cgma.or.kr).
- Primary public/custom domain: `https://cgma.or.kr`; it serves the same upstream while keeping `cgma.or.kr` in the visitor address bar.
- `www.cgma.or.kr` redirects to `https://cgma.or.kr`.
- `cgma.ekodi.kr` is a legacy alias only and redirects to the primary public domain `https://cgma.or.kr`.
- This repository remains an independently deployable upstream; EKODI root proxies `/cgma/*` to it.
- Subservices and admin pages use `site-path.js` for path-aware links and callbacks.
