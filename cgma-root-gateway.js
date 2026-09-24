const PREFIX = '/cgma';
const CANONICAL_ORIGIN = 'https://ekodi.kr';
const UPSTREAM_ORIGIN = 'https://cheonggye-market.pages.dev';
const TENANT_READABILITY_VERSION = 'v1';
const TENANT_READABILITY_STYLE = `${CANONICAL_ORIGIN}/shell/user-ui-shell.css?tenant-readability=${TENANT_READABILITY_VERSION}`;
const MOBILE_FIXED_HEADER_SCRIPT = `${CANONICAL_ORIGIN}/shell/mobile-fixed-header.js?tenant-readability=${TENANT_READABILITY_VERSION}`;

function isCgmaPath(pathname) {
  return pathname === PREFIX || pathname.startsWith(`${PREFIX}/`);
}

function isMarketingPath(pathname) {
  return pathname === `${PREFIX}/marketing` || pathname.startsWith(`${PREFIX}/marketing/`);
}

function isLivePath(pathname) {
  return pathname === `${PREFIX}/live` || pathname === `${PREFIX}/live/` || pathname === `${PREFIX}/live/index.html`;
}

function isOwnerAdminPath(pathname) {
  const path = String(pathname || '');
  if (path === `${PREFIX}/admin` || path === `${PREFIX}/admin/`) return false;
  return path.startsWith(`${PREFIX}/admin/`);
}

async function delegatedLiveResponse(request, env) {
  if (!env?.EKODI_SHARED?.fetch) return new Response('CGMA live unavailable', { status: 503 });
  try { return await env.EKODI_SHARED.fetch(request); }
  catch { return new Response('CGMA live unavailable', { status: 502 }); }
}

async function delegatedOwnerAdminResponse(request, env) {
  if (!env?.EKODI_SHARED?.fetch) return new Response('CGMA owner admin unavailable', { status: 503 });
  try {
    const response = await env.EKODI_SHARED.fetch(request);
    const route = response?.headers?.get('x-ekodi-route') || '';
    if (route === 'workspace-admin' || route === 'admin-workspace-asset') return response;
  } catch {}
  return new Response('CGMA owner admin unavailable', { status: 502 });
}

async function delegatedMarketingResponse(request, env) {
  if (!env?.EKODI_SHARED?.fetch) return null;
  try {
    const response = await env.EKODI_SHARED.fetch(request);
    if (response?.headers?.get('x-ekodi-route') === 'marketing-canonical-projection') return response;
  } catch {}
  return null;
}

function upstreamUrl(requestUrl) {
  const source = new URL(requestUrl);
  const pathname = source.pathname === PREFIX ? '/' : source.pathname.slice(PREFIX.length) || '/';
  const target = new URL(UPSTREAM_ORIGIN);
  target.pathname = pathname;
  target.search = source.search;
  return target;
}

function upstreamRequest(request) {
  const target = upstreamUrl(request.url);
  const headers = new Headers(request.headers);
  headers.set('X-Forwarded-Host', new URL(request.url).host);
  headers.set('X-Forwarded-Prefix', PREFIX);
  headers.delete('Host');
  return new Request(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });
}
function canonicalLocation(value) {
  if (!value) return '';
  let target;
  try { target = new URL(value, UPSTREAM_ORIGIN); } catch { return value; }
  if (target.origin !== UPSTREAM_ORIGIN) return value;
  const suffix = target.pathname === '/' ? '' : target.pathname;
  const canonical = new URL(`${PREFIX}${suffix}`, CANONICAL_ORIGIN);
  canonical.search = target.search;
  canonical.hash = target.hash;
  return canonical.toString();
}

function rewriteHtml(html) {
  let next = String(html || '');
  next = next.replace(/(\s(?:href|src|action)=)(["'])(\/[^"']*)\2/gi, (full, prefix, quote, value) => {
    if (value.startsWith('//') || value === '/cgma' || value.startsWith('/cgma/')) return full;
    const rewritten = value === '/' ? '/cgma/' : `/cgma${value}`;
    return `${prefix}${quote}${rewritten}${quote}`;
  });
  next = next.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
  const canonical = '<link rel="canonical" href="https://ekodi.kr/cgma">';
  const readabilityAssets = `<link rel="stylesheet" href="${TENANT_READABILITY_STYLE}" data-ekodi-tenant-readability-style="${TENANT_READABILITY_VERSION}"><script src="${MOBILE_FIXED_HEADER_SCRIPT}" defer data-ekodi-tenant-mobile-header="${TENANT_READABILITY_VERSION}"></script>`;
  if (/<html\b/i.test(next) && !/data-ekodi-tenant-readability=/i.test(next)) {
    next = next.replace(/<html\b([^>]*)>/i, `<html$1 data-ekodi-tenant-readability="${TENANT_READABILITY_VERSION}">`);
  }
  if (/<\/head>/i.test(next)) {
    const assets = next.includes('data-ekodi-tenant-readability-style=') ? '' : readabilityAssets;
    next = next.replace(/<\/head>/i, `${canonical}${assets}</head>`);
  }
  if (!/data-ekodi-fixed-header=/i.test(next)) {
    next = next.replace(/<header\b([^>]*)>/i, `<header$1 data-ekodi-fixed-header="${TENANT_READABILITY_VERSION}">`);
  }
  return next;
}

function extendCspDirective(csp, name, origin) {
  const parts = String(csp || '').split(';').map(value => value.trim()).filter(Boolean);
  const index = parts.findIndex(part => part === name || part.startsWith(`${name} `));
  if (index < 0) parts.push(`${name} 'self' ${origin}`);
  else if (!parts[index].split(/\s+/).includes(origin)) parts[index] = `${parts[index]} ${origin}`;
  return parts.join('; ');
}

function gatewayHeaders(response) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('X-EKODI-Route', 'cgma-root-gateway');
  headers.set('X-EKODI-CGMA-Upstream', 'cheonggye-market-pages');
  headers.set('X-EKODI-Tenant-Readability', TENANT_READABILITY_VERSION);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  const csp = headers.get('content-security-policy');
  if (csp) {
    let next = extendCspDirective(csp, 'style-src', CANONICAL_ORIGIN);
    next = extendCspDirective(next, 'script-src', CANONICAL_ORIGIN);
    headers.set('content-security-policy', next);
  }
  return headers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!isCgmaPath(url.pathname)) return new Response('Not Found', { status: 404 });
    if (isLivePath(url.pathname)) return delegatedLiveResponse(request, env);
    if (isOwnerAdminPath(url.pathname)) return delegatedOwnerAdminResponse(request, env);
    if (isMarketingPath(url.pathname)) {
      const delegated = await delegatedMarketingResponse(request, env);
      if (delegated) return delegated;
    }
    if (url.pathname === `${PREFIX}/member-admin` || url.pathname === `${PREFIX}/member-admin/`) {
      const canonical = new URL(`${PREFIX}/admin/member`, CANONICAL_ORIGIN);
      canonical.search = url.search;
      return new Response(null, { status: 308, headers: { Location: canonical.toString(), 'X-EKODI-Route': 'cgma-root-gateway', 'X-EKODI-CGMA-Upstream': 'cheonggye-market-pages' } });
    }

    if (url.pathname === PREFIX) {
      const canonical = new URL(`${PREFIX}/`, CANONICAL_ORIGIN);
      canonical.search = url.search;
      return new Response(null, { status: 308, headers: { Location: canonical.toString(), 'X-EKODI-Route': 'cgma-root-gateway', 'X-EKODI-CGMA-Upstream': 'cheonggye-market-pages' } });
    }

    const response = await fetch(upstreamRequest(request));
    const headers = gatewayHeaders(response);
    const location = response.headers.get('location');
    if (location) headers.set('Location', canonicalLocation(location));

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (request.method !== 'HEAD' && contentType.includes('text/html')) {
      const html = rewriteHtml(await response.text());
      return new Response(html, { status: response.status, statusText: response.statusText, headers });
    }

    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};

export { PREFIX, UPSTREAM_ORIGIN, upstreamUrl, canonicalLocation, rewriteHtml, isLivePath, delegatedLiveResponse, isMarketingPath, delegatedMarketingResponse, isOwnerAdminPath, delegatedOwnerAdminResponse };
