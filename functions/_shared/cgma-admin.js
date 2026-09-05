const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co';
const SUPABASE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const MEMBERSHIP_API=`${SUPABASE_URL}/functions/v1/membership-api`;

export async function cgmaAdmin(request){
  const authorization=request.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer '))return {allowed:false,status:401,reason:'login_required'};
  const userResponse=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{Authorization:authorization,apikey:SUPABASE_KEY}});
  if(!userResponse.ok)return {allowed:false,status:401,reason:'invalid_session'};
  const user=await userResponse.json();
  const accessResponse=await fetch(`${MEMBERSHIP_API}/pending?tenant=cheonggye`,{headers:{Authorization:authorization,apikey:SUPABASE_KEY}});
  if(!accessResponse.ok)return {allowed:false,status:403,reason:'tenant_admin_required',user};
  const access=await accessResponse.json().catch(()=>({}));
  const authority=access?.reviewer?.authority==='platform'?'platform':'tenant';
  const role=authority==='platform'?'platform_admin':'tenant_admin';
  return {allowed:true,status:200,reason:authority==='platform'?'platform_delegated':'tenant_admin',role,authority,scope:'tenant:cheonggye',mode:'edit',user};
}