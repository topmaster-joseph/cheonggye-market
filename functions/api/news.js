const feeds={
 support:'(site:mss.go.kr OR site:semas.or.kr OR site:sbiz24.kr OR site:jeonnam.go.kr OR site:muan.go.kr) (소상공인 지원사업 OR 공고 OR 모집)',
 education:'(site:semas.or.kr OR site:sbiz24.kr OR site:mokpo.ac.kr OR site:muan.go.kr) (소상공인 교육 OR 컨설팅 OR 특강 OR 모집)',
 event:'(site:muan.go.kr OR site:mokpo.ac.kr OR site:semas.or.kr OR site:youtube.com/@cgma4989) (행사 OR 이벤트 OR 판로 OR 축제 OR 라이브)'
};
const decode=(s='')=>s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const text=(xml,tag)=>decode(xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]||'').replace(/<[^>]+>/g,'').trim();
function parse(xml){return[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m=>{const raw=text(m[1],'title'),cut=raw.lastIndexOf(' - ');return{title:cut>0?raw.slice(0,cut):raw,source:cut>0?raw.slice(cut+3):text(m[1],'source')||'공식기관',url:text(m[1],'link'),publishedAt:text(m[1],'pubDate')}}).filter(x=>x.title&&x.url)}
export async function onRequestGet({request}){
 const type=new URL(request.url).searchParams.get('type')||'support';if(!feeds[type])return Response.json({error:'invalid news type'},{status:400});
 try{const rss=`https://news.google.com/rss/search?q=${encodeURIComponent(feeds[type])}&hl=ko&gl=KR&ceid=KR:ko`;const response=await fetch(rss,{cf:{cacheTtl:900,cacheEverything:true}});if(!response.ok)throw new Error(String(response.status));const items=parse(await response.text()).slice(0,12);return Response.json({type,updatedAt:new Date().toISOString(),items},{headers:{'Cache-Control':'public, max-age=300, s-maxage=900'}})}
 catch{const fallback={
support:[{title:'소상공인 지원사업 통합공고 확인',source:'소상공인24',url:'https://www.sbiz24.kr/',publishedAt:''},{title:'중소벤처기업부 소상공인 정책·공고 확인',source:'중소벤처기업부',url:'https://www.mss.go.kr/',publishedAt:''}],
education:[{title:'소상공인 교육·컨설팅 최신 모집 확인',source:'소상공인24',url:'https://www.sbiz24.kr/',publishedAt:''},{title:'소상공인시장진흥공단 교육 안내 확인',source:'소상공인시장진흥공단',url:'https://www.semas.or.kr/',publishedAt:''},{title:'국립목포대학교 최신 공지 확인',source:'국립목포대학교',url:'https://www.mokpo.ac.kr/www/308/subview.do',publishedAt:''}],
event:[{title:'무안군 행사·모집 공고 확인',source:'무안군',url:'https://www.muan.go.kr/',publishedAt:''},{title:'청계면상인회 공식 영상·라이브 확인',source:'청계면상인회 유튜브',url:'https://www.youtube.com/@cgma4989',publishedAt:''}]
}[type];return Response.json({type,updatedAt:new Date().toISOString(),fallback:true,items:fallback},{headers:{'Cache-Control':'public, max-age=120, s-maxage=300'}})}
}