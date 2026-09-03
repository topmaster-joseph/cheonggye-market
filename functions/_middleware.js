const LEGACY_PUBLIC_HOST = 'cgma.ekodi.kr';
const PUBLIC_HOST = 'cgma.or.kr';
const PUBLIC_WWW_HOST = 'www.cgma.or.kr';
const PLATFORM_BASE = 'https://ekodi.kr/cgma';

function platformRedirect(url) {
  const suffix = url.pathname === '/' || url.pathname === '/index.html' ? '/' : url.pathname;
  const target = new URL(`${PLATFORM_BASE}${suffix === '/' ? '/' : suffix}`);
  target.search = url.search;
  return Response.redirect(target.toString(), 308);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  if (host === LEGACY_PUBLIC_HOST) return platformRedirect(url);
  if (host === PUBLIC_WWW_HOST) {
    const target = new URL(url.pathname + url.search, `https://${PUBLIC_HOST}`);
    return Response.redirect(target.toString(), 308);
  }

  const invite = url.searchParams.get('ekodi_invite');
  const isRoot = url.pathname === '/' || url.pathname === '/index.html';
  const isCgmaAiHost = host === 'cgma.ai.ekodi.kr';
  if (isRoot && invite && /^[a-f0-9]{64}$/i.test(invite)) {
    const target = new URL('/client/', url.origin); target.searchParams.set('ekodi_invite', invite); return Response.redirect(target.toString(), 302);
  }
  if (isRoot && isCgmaAiHost) { const target = new URL('/market-ai', url.origin); target.search = url.search; return Response.redirect(target.toString(), 302); }
  return context.next();
}
