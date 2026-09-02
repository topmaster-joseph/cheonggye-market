# CGMA canonical routing

- Canonical public site: `https://ekodi.kr/cgma`
- Public custom domain: `cgma.or.kr` redirects to the canonical path at the DNS/edge layer.
- `cgma.ekodi.kr` is retired from user-facing links.
- This repository remains an independently deployable upstream; EKODI root proxies `/cgma/*` to it.
- Subservices and admin pages use `site-path.js` for path-aware links and callbacks.
