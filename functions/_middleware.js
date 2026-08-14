export async function onRequest(context) {
  const url = new URL(context.request.url);
  const invite = url.searchParams.get('ekodi_invite');
  const isRoot = url.pathname === '/' || url.pathname === '/index.html';
  const isCgmaAiHost = url.hostname.toLowerCase() === 'cgma.ai.ekodi.kr';

  if (isRoot && invite && /^[a-f0-9]{64}$/i.test(invite)) {
    const target = new URL('/client/', url.origin);
    target.searchParams.set('ekodi_invite', invite);
    return Response.redirect(target.toString(), 302);
  }

  if (isRoot && isCgmaAiHost) {
    const target = new URL('/ai', url.origin);
    target.search = url.search;
    return Response.redirect(target.toString(), 302);
  }

  return context.next();
}
