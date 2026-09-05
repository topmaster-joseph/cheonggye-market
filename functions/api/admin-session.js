import { cgmaAdmin } from '../_shared/cgma-admin.js';

export async function onRequestGet({request}){
  const result=await cgmaAdmin(request);
  return Response.json({
    allowed:result.allowed,
    grade:result.role||'member',
    authority:result.authority||'none',
    scope:result.scope||null,
    mode:result.allowed?'edit':'none',
    reason:result.reason,
    email:result.allowed?result.user?.email:undefined
  },{status:result.allowed?200:result.status,headers:{'Cache-Control':'no-store'}});
}