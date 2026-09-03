# CGMA canonical routing

- EKODI platform route: `https://ekodi.kr/cgma`.
- Primary public/custom domain: `https://cgma.or.kr`; it serves the same upstream while keeping `cgma.or.kr` in the visitor address bar.
- `www.cgma.or.kr` redirects to `https://cgma.or.kr`.
- `cgma.ekodi.kr` is a legacy alias only and redirects to the EKODI platform route during migration.
- This repository remains an independently deployable upstream; EKODI root proxies `/cgma/*` to it.
- Subservices and admin pages use `site-path.js` for path-aware links and callbacks.
