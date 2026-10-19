// Supabase Edge Function entrypoint. Logic lives in handler.js so Node tests can exercise it.
// Deploy: supabase functions deploy cgma-festival-intake --no-verify-jwt (project renzehysxirjilvdxacv)
import {createHandler,json} from './handler.js';

const handler = createHandler({
  projectUrl: Deno.env.get('SUPABASE_URL') || 'https://renzehysxirjilvdxacv.supabase.co',
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  anonKey: Deno.env.get('SUPABASE_ANON_KEY') || '',
});

Deno.serve(async (request: Request) => {
  try { return await handler(request); }
  catch { return json({ok:false,error:'unavailable'},503,request.headers.get('origin')||''); }
});
