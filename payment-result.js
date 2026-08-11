const PAYMENT='https://renzehysxirjilvdxacv.supabase.co/functions/v1/payment-api';
const params=new URLSearchParams(location.search);
const store=params.get('store');
const back=document.getElementById('backStore');
if(store)back.href=`/order/${encodeURIComponent(store)}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

async function success(){
  const paymentKey=params.get('paymentKey'),orderId=params.get('orderId'),amount=Number(params.get('amount'));
  const detail=document.getElementById('detail');
  if(!paymentKey||!orderId||!Number.isInteger(amount)){document.getElementById('title').textContent='결제 정보를 확인할 수 없습니다.';document.getElementById('message').textContent='주문 화면으로 돌아가 다시 확인해 주세요.';return}
  try{
    const r=await fetch(`${PAYMENT}/confirm`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({paymentKey,orderId,amount})});
    const d=await r.json();
    if(!r.ok||!d.ok)throw new Error(d.error||d.status||'confirm_failed');
    document.querySelector('.icon').textContent='✓';document.getElementById('title').textContent='결제가 완료되었습니다.';document.getElementById('message').textContent='매장에서 주문을 확인할 수 있습니다.';
    detail.textContent=`주문번호 ${orderId}`;detail.classList.remove('hide');
    history.replaceState(null,'',`${location.pathname}?store=${encodeURIComponent(store||'')}`);
  }catch(e){document.querySelector('.icon').textContent='!';document.getElementById('title').textContent='결제 승인을 확인하지 못했습니다.';document.getElementById('message').textContent='중복 결제를 시도하지 말고 매장 또는 운영자에게 주문번호로 확인해 주세요.';detail.textContent=`주문번호 ${orderId}`;detail.className='status error';}
}

function fail(){
  const code=params.get('code')||'PAYMENT_NOT_COMPLETED';const message=params.get('message')||'결제가 취소되었거나 완료되지 않았습니다.';
  document.getElementById('detail').innerHTML=`<b>${esc(code)}</b><br>${esc(message)}`;
  if(code==='PAY_PROCESS_CANCELED')document.getElementById('message').textContent='결제를 취소했습니다. 원하면 다시 주문할 수 있습니다.';
}

document.addEventListener('DOMContentLoaded',()=>{if(location.pathname.includes('payment-success'))success();else fail();});
