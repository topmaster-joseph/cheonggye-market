const PREFIX = '/cgma';
const CANONICAL_ORIGIN = 'https://ekodi.kr';
const UPSTREAM_ORIGIN = 'https://cheonggye-market.pages.dev';

function isCgmaPath(pathname) {
  return pathname === PREFIX || pathname.startsWith(`${PREFIX}/`);
}

function isMarketingPath(pathname) {
  return pathname === `${PREFIX}/marketing` || pathname.startsWith(`${PREFIX}/marketing/`);
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
  if (/<\/head>/i.test(next)) next = next.replace(/<\/head>/i, `${canonical}</head>`);
  return next;
}

function gatewayHeaders(response) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('X-EKODI-Route', 'cgma-root-gateway');
  headers.set('X-EKODI-CGMA-Upstream', 'cheonggye-market-pages');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return headers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!isCgmaPath(url.pathname)) return new Response('Not Found', { status: 404 });
    if (isMarketingPath(url.pathname)) {
      const delegated = await delegatedMarketingResponse(request, env);
      if (delegated) return delegated;
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

export { PREFIX, UPSTREAM_ORIGIN, upstreamUrl, canonicalLocation, rewriteHtml, isMarketingPath, delegatedMarketingResponse };
