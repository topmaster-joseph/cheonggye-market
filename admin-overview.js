(()=>{
  const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
  const MEMBERSHIP=`${SUPABASE_URL}/functions/v1/membership-api`,ACCESS=`${SUPABASE_URL}/functions/v1/access-api`;
  const $=id=>document.getElementById(id);
  async function get(session,url){
    const response=await fetch(url,{headers:{apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'pending_load_failed');return data;
  }
  async function start(session){
    const target=$('memberPendingCount');if(!target||!session?.access_token)return;
    const results=await Promise.allSettled([
      get(session,`${ACCESS}/pending?site=cgma&tenant=cheonggye`),
      get(session,`${MEMBERSHIP}/pending?tenant=cheonggye`)
    ]);
    const access=results[0].status==='fulfilled'?(results[0].value.requests||[]).length:null;
    const claims=results[1].status==='fulfilled'?(results[1].value.claims||[]).length:null;
    target.textContent=access===null&&claims===null?'확인':String((access||0)+(claims||0));
  }
  window.CGMA_ADMIN_OVERVIEW={start};
})();
