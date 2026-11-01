import { DOCUMENTS } from '../api/ip-archive.js';

export const MAX_ACTIVE_SHARES_PER_DAY=30;
const SHAREABLE = DOCUMENTS.filter(item=>item.id!=='cgma-ip-archive-folder');
const BY_ID = new Map(SHAREABLE.map(item=>[item.id,item]));
const ALLOWED_DAYS = new Set([1,7,30]);

export function validateShareRequest(input={}){
  const email=String(input.recipient_email??'').trim().toLowerCase();
  if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {ok:false,error:'recipient_email_invalid'};
  const rawIds=Array.isArray(input.document_ids)?input.document_ids:[];
  const ids=[...new Set(rawIds.filter(id=>typeof id==='string'))];
  if(rawIds.length!==ids.length||ids.length<1||ids.length>4||ids.some(id=>!BY_ID.has(id)))return {ok:false,error:'documents_invalid'};
  const days=Number(input.expires_in_days);
  if(!ALLOWED_DAYS.has(days))return {ok:false,error:'expiration_invalid'};
  const purpose=String(input.purpose??'').trim();
  if(purpose.length<2||purpose.length>240)return {ok:false,error:'purpose_invalid'};
  if(input.confirm_limited_access!==true)return {ok:false,error:'acknowledgement_required'};
  if(ids.includes('cgma-ip-originals')&&input.confirm_original_rights!==true)return {ok:false,error:'original_rights_confirmation_required'};
  return {ok:true,value:{recipient_email:email,document_ids:ids,expires_in_days:days,purpose}};
}
export function selectedDocuments(ids){
  if(!Array.isArray(ids))return [];
  return ids.map(id=>BY_ID.get(id)).filter(Boolean).map(({id,title,category,note,url})=>({id,title,category,note,url}));
}
export function newShareToken(){
  const data=crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...data)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
export async function sha256(text){
  const hex=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hex),b=>b.toString(16).padStart(2,'0')).join('');
}
export function isValidToken(token){
  return typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token);
}
export function expiresSql(days,now=Date.now()){
  return new Date(now+days*86400000).toISOString().slice(0,19).replace('T',' ');
}
export function sanitizeShareRow(row){
  return {id:row.id,recipient_email:row.recipient_email,document_ids:JSON.parse(row.document_ids),purpose:row.purpose,created_at:row.created_at,expires_at:row.expires_at,revoked_at:row.revoked_at||null,delivery_status:'google_drive_permission_required'};
}
