(()=>{
  const p=location.pathname.toLowerCase();
  let prefix='';
  if(location.hostname==='ekodi.kr'){
    if(p==='/cgma'||p.startsWith('/cgma/'))prefix='/cgma';
    else if(p==='/org/cgma'||p.startsWith('/org/cgma/'))prefix='/org/cgma';
  }
  const route=value=>{
    const raw=String(value||'/');
    if(/^(?:https?:|mailto:|tel:|#)/i.test(raw))return raw;
    const normalized=raw.startsWith('/')?raw:`/${raw}`;
    return `${prefix}${normalized}`||'/';
  };
  window.CGMA_ROUTE=Object.freeze({prefix,route,absolute:value=>new URL(route(value),location.origin).toString()});
})();