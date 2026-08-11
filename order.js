const CORE='https://renzehysxirjilvdxacv.supabase.co/functions/v1/core-api';
const PAYMENT='https://renzehysxirjilvdxacv.supabase.co/functions/v1/payment-api';
const TENANT='cheonggye';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const won=n=>`${Number(n||0).toLocaleString('ko-KR')}원`;
let store=null,menu=[],qty=new Map();

function storeSlug(){
  const parts=location.pathname.split('/').filter(Boolean);
  if(parts[0]==='order'&&parts[1])return decodeURIComponent(parts[1]);
  return new URLSearchParams(location.search).get('store')||'';
}
function setStatus(text,type=''){const el=$('status');el.textContent=text;el.className=`status${type?` ${type}`:''}`;el.classList.remove('hide')}
function hideStatus(){$('status').classList.add('hide')}
function selected(){return menu.map(m=>({...m,quantity:qty.get(m.id)||0})).filter(m=>m.quantity>0)}
function total(){return selected().reduce((s,m)=>s+Number(m.price)*m.quantity,0)}

function render(){
  $('menu').innerHTML=menu.map(m=>{const q=qty.get(m.id)||0;return `<article class="menu-item"><div><b>${esc(m.name)}</b>${m.description?`<small>${esc(m.description)}</small>`:''}<div class="qty"><button class="secondary minus" data-id="${esc(m.id)}" ${q===0?'disabled':''}>−</button><span>${q}</span><button class="plus" data-id="${esc(m.id)}">＋</button></div></div><div class="price">${won(m.price)}</div></article>`}).join('');
  $('menu').querySelectorAll('.plus').forEach(b=>b.onclick=()=>{qty.set(b.dataset.id,Math.min(99,(qty.get(b.dataset.id)||0)+1));render()});
  $('menu').querySelectorAll('.minus').forEach(b=>b.onclick=()=>{qty.set(b.dataset.id,Math.max(0,(qty.get(b.dataset.id)||0)-1));render()});
  const items=selected();
  $('summary').innerHTML=items.length?items.map(m=>`<div class="summary-line"><span>${esc(m.name)} × ${m.quantity}</span><strong>${won(Number(m.price)*m.quantity)}</strong></div>`).join(''):'<p class="muted">메뉴를 선택해 주세요.</p>';
  const t=total();$('total').textContent=won(t);$('bottomTotal').textContent=won(t);$('payButton').disabled=!store?.order_enabled||items.length===0;
}

async function trackQr(){const p=new URLSearchParams(location.search),code=p.get('qr');if(!code)return;fetch(`${CORE}/public/qr-scan`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,source:p.get('source')||'store-order'})}).catch(()=>{});}

async function init(){
  const slug=storeSlug();if(!slug){setStatus('주문할 매장을 찾을 수 없습니다.','error');return}
  try{
    const r=await fetch(`${CORE}/public/stores/${encodeURIComponent(slug)}?tenant=${TENANT}`);if(!r.ok)throw new Error('not_found');
    const d=await r.json();store=d.store;menu=d.menu||[];$('storeName').textContent=store.name;$('topName').textContent=store.name;$('storeInfo').textContent=[store.public_address,store.public_phone].filter(Boolean).join(' · ');
    if(!store.order_enabled){setStatus('이 매장은 아직 온라인 주문·결제를 준비 중입니다. 메뉴 정보는 확인할 수 있지만 결제는 열리지 않았습니다.','warn');}
    else if(!menu.length){setStatus('현재 주문 가능한 메뉴가 없습니다.','warn');}
    else hideStatus();
    $('menuCard').classList.remove('hide');$('customerCard').classList.remove('hide');$('summaryCard').classList.remove('hide');$('checkoutBar').classList.remove('hide');render();trackQr();
  }catch{setStatus('매장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.','error')}
}

$('fulfillment').addEventListener('change',()=>{$('tableWrap').classList.toggle('hide',$('fulfillment').value!=='table')});
$('payButton').onclick=async()=>{
  if(!store?.order_enabled||!selected().length)return;
  const name=$('customerName').value.trim(),phone=$('customerPhone').value.trim();
  if(!name||!phone){setStatus('주문 확인을 위해 이름과 연락처를 입력해 주세요.','warn');window.scrollTo({top:0,behavior:'smooth'});return}
  if($('fulfillment').value==='table'&&!$('tableRef').value.trim()){setStatus('테이블 번호 또는 이름을 입력해 주세요.','warn');return}
  $('payButton').disabled=true;$('payButton').textContent='주문 확인 중…';
  try{
    const orderRes=await fetch(`${CORE}/public/orders`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({store_id:store.id,items:selected().map(m=>({menu_item_id:m.id,quantity:m.quantity})),customer_name:name,customer_phone:phone,fulfillment_type:$('fulfillment').value,table_ref:$('tableRef').value.trim()||null,source:new URLSearchParams(location.search).get('source')||'qr-order'})});
    const orderData=await orderRes.json();if(!orderRes.ok)throw new Error(orderData.error||'order_failed');
    const preparedRes=await fetch(`${PAYMENT}/prepare`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({order_id:orderData.order.id})});
    const prepared=await preparedRes.json();if(!preparedRes.ok)throw new Error(prepared.error||'payment_prepare_failed');
    if(prepared.provider!=='toss'||!prepared.client_key)throw new Error('unsupported_payment_provider');

    const tossPayments=TossPayments(prepared.client_key);
    const payment=tossPayments.payment({customerKey:TossPayments.ANONYMOUS});
    const success=new URL('/payment-success',location.origin);success.searchParams.set('store',store.slug);
    const fail=new URL('/payment-fail',location.origin);fail.searchParams.set('store',store.slug);
    const items=selected();const orderName=items.length===1?items[0].name:`${items[0].name} 외 ${items.length-1}건`;
    await payment.requestPayment({
      method:'CARD',
      amount:{currency:'KRW',value:Number(prepared.amount)},
      orderId:prepared.order_id,
      orderName:orderName.slice(0,100),
      successUrl:success.toString(),
      failUrl:fail.toString(),
      customerName:name.slice(0,100),
      customerMobilePhone:phone.replace(/\D/g,'').slice(0,15),
    });
  }catch(e){
    const msg=e.message==='payment_not_configured'?'이 매장은 아직 온라인 결제를 준비 중입니다.':e.message==='rate_limited'?'주문 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.':'주문·결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    setStatus(msg,'error');$('payButton').disabled=false;$('payButton').textContent='주문 · 결제';window.scrollTo({top:0,behavior:'smooth'});
  }
};

document.addEventListener('DOMContentLoaded',init);
