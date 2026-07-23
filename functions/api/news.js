const feeds = {
  market: '"청계면" (상가 OR 상권 OR 축제 OR 행사 OR 이벤트)',
  region: 'site:muan.go.kr (행사 OR 축제 OR 공연 OR 모집)',
  university: 'site:mokpo.ac.kr (행사 OR 축제 OR 공연 OR 모집)'
};

const decode = (s = '') => s
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const text = (xml, tag) => {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return decode(match?.[1] || '').replace(/<[^>]+>/g, '').trim();
};

export async function onRequestGet({ request }) {
  const type = new URL(request.url).searchParams.get('type') || 'market';
  if (!feeds[type]) return Response.json({ error: 'invalid news type' }, { status: 400 });
  const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(feeds[type])}&hl=ko&gl=KR&ceid=KR:ko`;
  try {
    const response = await fetch(rss, { cf: { cacheTtl: 1800, cacheEverything: true } });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 9).map((m) => {
      const rawTitle = text(m[1], 'title');
      const split = rawTitle.lastIndexOf(' - ');
      return {
        title: split > 0 ? rawTitle.slice(0, split) : rawTitle,
        source: split > 0 ? rawTitle.slice(split + 3) : text(m[1], 'source') || '공개 소식',
        url: text(m[1], 'link'),
        publishedAt: text(m[1], 'pubDate')
      };
    }).filter((item) => item.title && item.url);
    return Response.json({ type, updatedAt: new Date().toISOString(), items }, {
      headers: { 'Cache-Control': 'public, max-age=900, s-maxage=1800' }
    });
  } catch {
    return Response.json({ type, items: [], error: '소식을 불러오지 못했습니다.' }, { status: 502 });
  }
}
