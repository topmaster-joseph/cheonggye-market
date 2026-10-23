import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHandler, sha256Hex, passwordHash} from './supabase/functions/cgma-festival-intake/index.ts';
import {parseDelimited, rowsFromMatrix, normalizePhone, toCsv, safeCell, headerMap, MAX_ROWS, fieldText} from './festival/2026/coupon/coupon-sheet.mjs';

const ORIGIN = 'https://cgma.or.kr';
const EDGE = 'https://edge.test/functions/v1/cgma-festival-intake/';
const RECEIPT = '00000000-0000-4000-8000-000000000001';

// Fake Supabase: auth, membership-api authority and PostgREST, recording every database call.
function fakeSupabase({admin = true, share = null, shareRows = [], importResult = null} = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url);
    if (u.pathname === '/auth/v1/user') {
      return init.headers.Authorization === 'Bearer admin-jwt' || init.headers.Authorization === 'Bearer member-jwt'
        ? Response.json({id: '11111111-1111-4111-8111-111111111111', email: 'manager@example.com'}) : new Response('{}', {status: 401});
    }
    if (u.pathname.startsWith('/functions/v1/membership-api')) {
      return admin && init.headers.Authorization === 'Bearer admin-jwt' ? Response.json({reviewer: {authority: 'tenant'}}) : new Response('{}', {status: 403});
    }
    const call = {path: u.pathname.replace('/rest/v1/', ''), search: u.search, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null};
    calls.push(call);
    if (call.path === 'cgma_festival_2026_settings') return Response.json([{booth_open: true, coupon_open: true}]);
    if (call.path === 'cgma_festival_2026_share') return Response.json(share ? [share] : []);
    if (call.path === 'rpc/cgma_festival_2026_share_rows') return Response.json(shareRows);
    if (call.path === 'rpc/cgma_festival_2026_share_record') return Response.json({ok: true, locked_until: call.body.p_outcome === 'password_invalid' && share?.lockNext ? '2099-01-01T00:00:00Z' : null});
    if (call.path === 'rpc/cgma_festival_2026_coupon_import') return Response.json(importResult || {ok: true, committed: call.body.p_commit, rows: [], summary: {}});
    if (call.path === 'rpc/cgma_festival_2026_share_create') return Response.json({ok: true, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', count: call.body.p_receipts.length});
    if (call.path === 'rpc/cgma_festival_2026_coupon_review') return Response.json({ok: true, found: call.body.p_receipts.length, changed: 1});
    if (call.path === 'cgma_festival_2026_coupon_merchant') return Response.json([]);
    return Response.json([]);
  };
  const handler = createHandler({projectUrl: 'https://db.test', serviceKey: 'service', anonKey: 'anon', fetchImpl, now: () => Date.parse('2026-10-23T00:00:00Z')});
  return {handler, calls};
}
const post = (route, body, {auth, origin = ORIGIN, raw} = {}) => new Request(EDGE + route, {method: 'POST',
  headers: {'content-type': 'application/json', origin, ...(auth ? {authorization: 'Bearer ' + auth} : {})}, body: raw ?? JSON.stringify(body)});
const get = (route, {auth, origin = ORIGIN} = {}) => new Request(EDGE + route, {headers: {origin, ...(auth ? {authorization: 'Bearer ' + auth} : {})}});

/* ---- spreadsheet helpers ---- */
test('CSV parser handles BOM, quotes, embedded commas/newlines and Excel TSV paste', () => {
  assert.deepEqual(parseDelimited('﻿상호명,연락처\r\n"청계, 식당","010-1""2"\r\n"두줄\n주소",x\r\n'), [['상호명', '연락처'], ['청계, 식당', '010-1"2'], ['두줄\n주소', 'x']]);
  assert.deepEqual(parseDelimited('상호명\t연락처\n가게\t010'), [['상호명', '연락처'], ['가게', '010']]);
});
test('header aliases map Korean and English titles; missing headers are reported', () => {
  assert.deepEqual(headerMap(['상호 명', '전화번호', '상가 주소 또는 위치 *', '주요 취급 품목']), {shop: 0, phone: 1, location: 2, items: 3});
  const missing = rowsFromMatrix([['상호명', '연락처'], ['a', '010']]);
  assert.equal(missing.error, 'header'); assert.deepEqual(missing.missing, ['location', 'items']);
});
test('rows keep sheet row numbers, skip blank rows and restore Excel-dropped leading zero', () => {
  const r = rowsFromMatrix([['상호명', '연락처', '주소', '품목'], ['가게', '1012345678', '청계로 1', '과일'], ['', '', '', ''], ['나', '010-1234-5679', 'x', 'y']]);
  assert.deepEqual(r.rows.map(x => [x.i, x.phone]), [[2, '01012345678'], [4, '01012345679']]);
  assert.equal(normalizePhone('010 1234 5678'), '01012345678');
  assert.equal(normalizePhone('1012345678.0'), '01012345678');
  const many = [['상호명', '연락처', '주소', '품목'], ...Array.from({length: MAX_ROWS + 1}, (_, i) => ['s' + i, '0100000' + String(i).padStart(4, '0'), 'a', 'b'])];
  assert.equal(rowsFromMatrix(many).error, 'too_many');
});
test('CSV export neutralises spreadsheet formulas', () => {
  for (const evil of ['=HYPERLINK("x")', '+1', '-2', '@SUM(A1)', '\t=1']) assert.ok(safeCell(evil).startsWith("'"));
  const csv = toCsv(['상호명'], [['=cmd|" /C calc"!A0'], ['정상 상점']]);
  assert.ok(csv.startsWith('﻿'));
  assert.match(csv, /"'=cmd\|"" \/C calc""!A0"/);
  assert.equal(fieldText('review_state', 'approved'), '참여 승인');
  assert.equal(fieldText('created_at', '2026-10-23T00:00:00Z'), '2026-10-23 09:00');
});

/* ---- Edge Function: admin boundary ---- */
test('admin routes fail closed: no session, non-manager account, and share tokens used as bearer', async () => {
  const {handler, calls} = fakeSupabase();
  for (const auth of [undefined, 'member-jwt', 'A'.repeat(43)]) {
    for (const req of [get('admin/coupon', {auth}), get('admin/coupon/shares', {auth}), post('admin/action', {kind: 'coupon', action: 'review_bulk', receipts: [RECEIPT], state: 'approved'}, {auth})]) {
      const res = await handler(req);
      assert.equal(res.status, 403);
      assert.equal((await res.json()).error, 'tenant_admin_required');
    }
  }
  assert.equal(calls.length, 0, 'no database access without manager authority');
});
test('admin list exposes source and identity of the verified manager only', async () => {
  const {handler, calls} = fakeSupabase();
  const res = await handler(get('admin/coupon', {auth: 'admin-jwt'}));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.admin.email, 'manager@example.com');
  assert.match(calls.find(c => c.path === 'cgma_festival_2026_coupon_merchant').search, /intake_source/);
});
test('bulk import: dry-run never needs consent, commit requires attestation and keeps the idempotency key', async () => {
  const {handler, calls} = fakeSupabase();
  const rows = [{i: 2, shop: ' 가게 ', phone: '010-1234-5678', location: '청계로', items: '과일'}];
  assert.equal((await handler(post('admin/action', {kind: 'coupon', action: 'import', key: RECEIPT, rows, commit: false}, {auth: 'admin-jwt'}))).status, 200);
  const blocked = await handler(post('admin/action', {kind: 'coupon', action: 'import', key: RECEIPT, rows, commit: true}, {auth: 'admin-jwt'}));
  assert.equal(blocked.status, 400); assert.equal((await blocked.json()).error, 'consent_attestation_required');
  assert.equal((await handler(post('admin/action', {kind: 'coupon', action: 'import', key: RECEIPT, rows, commit: true, consentAttested: true}, {auth: 'admin-jwt'}))).status, 200);
  const rpc = calls.filter(c => c.path === 'rpc/cgma_festival_2026_coupon_import');
  assert.equal(rpc.length, 2);
  assert.deepEqual(rpc.map(c => c.body.p_commit), [false, true]);
  assert.equal(rpc[1].body.p_key, RECEIPT);
  assert.equal(rpc[1].body.p_actor_email, 'manager@example.com');
  assert.equal(rpc[1].body.p_rows[0].shop, '가게');
  assert.equal((await handler(post('admin/action', {kind: 'coupon', action: 'import', key: 'not-a-uuid', rows, commit: false}, {auth: 'admin-jwt'}))).status, 400);
  assert.equal((await handler(post('admin/action', {kind: 'coupon', action: 'import', key: RECEIPT, rows: Array(501).fill(rows[0]), commit: false}, {auth: 'admin-jwt'}))).status, 400);
});
test('bulk review validates receipts and state', async () => {
  const {handler, calls} = fakeSupabase();
  assert.equal((await handler(post('admin/action', {kind: 'coupon', action: 'review_bulk', receipts: ['x'], state: 'approved'}, {auth: 'admin-jwt'}))).status, 400);
  assert.equal((await handler(post('admin/action', {kind: 'coupon', action: 'review_bulk', receipts: [RECEIPT], state: 'deleted'}, {auth: 'admin-jwt'}))).status, 400);
  const ok = await handler(post('admin/action', {kind: 'coupon', action: 'review_bulk', receipts: [RECEIPT, RECEIPT], state: 'approved'}, {auth: 'admin-jwt'}));
  assert.equal(ok.status, 200);
  assert.deepEqual(calls.at(-1).body.p_receipts, [RECEIPT], 'deduplicated');
});
test('admin action body is size limited and foreign origins are refused', async () => {
  const {handler} = fakeSupabase();
  assert.equal((await handler(post('admin/action', null, {auth: 'admin-jwt', raw: '{"a":"' + 'x'.repeat(600001) + '"}'}))).status, 413);
  assert.equal((await handler(post('admin/action', {kind: 'coupon', action: 'review', receipt: RECEIPT, state: 'approved'}, {auth: 'admin-jwt', origin: 'https://evil.example'}))).status, 403);
});

/* ---- Edge Function: share creation policy ---- */
test('share creation enforces field allowlist and personal-data conditions server-side', async () => {
  const {handler} = fakeSupabase();
  const base = {kind: 'coupon', action: 'share_create', label: '운영사무국', receipts: [RECEIPT], expiresInDays: 7, fields: ['shop_name']};
  const status = async extra => { const r = await handler(post('admin/action', {...base, ...extra}, {auth: 'admin-jwt'})); return [r.status, (await r.json()).error]; };
  assert.deepEqual(await status({fields: ['shop_name', 'privacy_consented_at']}), [400, 'invalid_request']);
  assert.deepEqual(await status({fields: ['phone']}), [400, 'pii_basis_required']);
  assert.deepEqual(await status({fields: ['location_text'], piiBasis: '운영기관 협약에 따른 정산 연락'}), [400, 'pii_password_required']);
  assert.deepEqual(await status({fields: ['phone'], piiBasis: '운영기관 협약에 따른 정산 연락', password: 'longpassword', expiresInDays: 14}), [400, 'invalid_expiry']);
  assert.deepEqual(await status({expiresInDays: 31}), [400, 'invalid_expiry']);
  assert.deepEqual(await status({password: 'short'}), [400, 'password_too_short']);
});
test('share creation stores only hashes and returns the raw token once', async () => {
  const {handler, calls} = fakeSupabase();
  const res = await handler(post('admin/action', {kind: 'coupon', action: 'share_create', label: '운영사무국', receipts: [RECEIPT], expiresInDays: 3,
    fields: ['shop_name', 'phone'], piiBasis: '운영기관 협약에 따른 정산 연락', password: 'correct horse', allowDownload: true}, {auth: 'admin-jwt'}));
  assert.equal(res.status, 201);
  const {token} = await res.json();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  const rpc = calls.find(c => c.path === 'rpc/cgma_festival_2026_share_create').body;
  assert.equal(rpc.p_token_hash, await sha256Hex(token));
  assert.ok(!JSON.stringify(rpc).includes(token), 'raw token never stored');
  assert.ok(!JSON.stringify(rpc).includes('correct horse'), 'raw password never stored');
  assert.equal(rpc.p_hash, await passwordHash('correct horse', rpc.p_salt));
});

/* ---- Edge Function: public share viewer ---- */
const TOKEN = 'T'.repeat(43);
async function shareFixture(extra = {}) {
  const salt = '00112233445566778899aabbccddeeff';
  return {id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: '공유', fields: ['shop_name', 'items'], expires_at: '2026-10-30T00:00:00Z',
    revoked_at: null, locked_until: null, password_salt: null, password_hash: null, allow_download: false, includes_pii: false,
    ...(extra.password ? {password_salt: salt, password_hash: await passwordHash(extra.password, salt)} : {}), ...extra, password: undefined};
}
test('share view returns only the shared fields, even if more data reaches the function', async () => {
  const {handler, calls} = fakeSupabase({share: await shareFixture(), shareRows: [{shop_name: '가게', items: '과일', phone: '01012345678', receipt: RECEIPT}]});
  const res = await handler(post('share/view', {token: TOKEN}));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
  const body = await res.json();
  assert.deepEqual(body.items, [{shop_name: '가게', items: '과일'}]);
  assert.match(calls.find(c => c.path === 'cgma_festival_2026_share').search, new RegExp('token_hash=eq.' + await sha256Hex(TOKEN)));
  assert.ok(calls.some(c => c.path === 'rpc/cgma_festival_2026_share_record' && c.body.p_outcome === 'ok'));
  assert.ok(!calls.some(c => c.path === 'cgma_festival_2026_coupon_merchant'), 'viewer never queries the applicant table directly');
});
test('share view: malformed, unknown, revoked, expired and locked links stay closed', async () => {
  assert.equal((await fakeSupabase().handler(post('share/view', {token: 'short'}))).status, 404);
  assert.equal((await fakeSupabase().handler(post('share/view', {token: TOKEN}))).status, 404);
  const cases = [[{revoked_at: '2026-10-22T00:00:00Z'}, 410, 'share_revoked'], [{expires_at: '2026-10-22T00:00:00Z'}, 410, 'share_expired'], [{locked_until: '2026-10-23T00:10:00Z'}, 429, 'share_locked']];
  for (const [extra, code, error] of cases) {
    const {handler, calls} = fakeSupabase({share: await shareFixture(extra), shareRows: [{shop_name: 'leak'}]});
    const res = await handler(post('share/view', {token: TOKEN}));
    assert.equal(res.status, code); assert.equal((await res.json()).error, error);
    assert.ok(!calls.some(c => c.path === 'rpc/cgma_festival_2026_share_rows'));
  }
  assert.equal((await fakeSupabase({share: await shareFixture()}).handler(post('share/view', {token: TOKEN}, {origin: 'https://evil.example'}))).status, 403);
});
test('share view password: required, wrong (counted), lockout and correct', async () => {
  const share = await shareFixture({password: 'correct horse'});
  const {handler, calls} = fakeSupabase({share, shareRows: [{shop_name: '가게', items: '과일'}]});
  const none = await handler(post('share/view', {token: TOKEN}));
  assert.equal(none.status, 401); assert.equal((await none.json()).error, 'password_required');
  const wrong = await handler(post('share/view', {token: TOKEN, password: 'nope'}));
  assert.equal(wrong.status, 401); assert.equal((await wrong.json()).error, 'password_invalid');
  assert.ok(calls.some(c => c.body?.p_outcome === 'password_invalid'));
  assert.equal((await handler(post('share/view', {token: TOKEN, password: 'correct horse'}))).status, 200);
  const locking = fakeSupabase({share: {...share, lockNext: true}});
  assert.equal((await locking.handler(post('share/view', {token: TOKEN, password: 'nope'}))).status, 429);
});

/* ---- Edge Function: unchanged public intake ---- */
test('public application route keeps its validation, origin and size rules', async () => {
  const {handler, calls} = fakeSupabase();
  assert.equal((await handler(post('apply/coupon', {shop: 'a'}))).status, 400);
  assert.equal((await handler(post('apply/coupon', {shop: 'a'}, {origin: 'https://evil.example'}))).status, 403);
  assert.equal((await handler(post('apply/coupon', null, {raw: '{"x":"' + 'y'.repeat(9000) + '"}'}))).status, 413);
  assert.equal(calls.filter(c => c.method === 'POST').length, 0, 'invalid submissions never write');
  const opts = await handler(new Request(EDGE + 'status', {method: 'OPTIONS', headers: {origin: 'https://evil.example'}}));
  assert.equal(opts.status, 403);
  const status = await handler(get('status'));
  assert.equal((await status.json()).couponValue, 5000);
});

/* ---- pages ---- */
test('application form links the same-page admin entry to the coupon admin screen', () => {
  const form = readFileSync('festival/2026/coupon/index.html', 'utf8');
  assert.match(form, /관리자 로그인 · 신청자 명단 관리/);
  assert.match(form, /href="\/festival\/2026\/coupon\/admin\/"/);
  assert.match(form, /couponAdminEntry'\)\.href=prefix\+'\/festival\/2026\/coupon\/admin\/'/);
  assert.doesNotMatch(form, /\/cgma\/admin\/festival/, 'ekodi.kr/cgma/admin/* belongs to the EKODI workspace admin');
});
test('admin screen reuses EKODI auth, server authority check and pinned, integrity-checked libraries', () => {
  const html = readFileSync('festival/2026/coupon/admin/index.html', 'utf8');
  const app = readFileSync('festival/2026/coupon/admin/app.mjs', 'utf8');
  const sheet = readFileSync('festival/2026/coupon/coupon-sheet.mjs', 'utf8');
  assert.match(html, /noindex,nofollow/);
  assert.match(html, /supabase-js@2\.117\.2\/dist\/umd\/supabase\.js" integrity="sha384-/);
  assert.match(sheet, /xlsx-0\.20\.3[\s\S]*integrity: 'sha384-/);
  assert.match(app, /ekodi\.kr\/auth\/\?site=cgma&direct=1&return_to=/);
  assert.match(app, /\/api\/admin-session/);
  assert.match(app, /verifyOtp/);
  for (const tab of ['신청자 명단', '일괄접수', '승인 관리', '외부공유', '운영 설정']) assert.match(html, new RegExp(`role="tab"[^>]*>${tab}<`));
  assert.doesNotMatch(html, /<header/, 'avoid the gateway fixed-header injection on the admin top bar');
});
test('share viewer is isolated from admin APIs and hidden from search engines', () => {
  const html = readFileSync('festival/2026/coupon/share/index.html', 'utf8');
  const js = readFileSync('festival/2026/coupon/share/share.mjs', 'utf8');
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(js, /\/share\/view/);
  assert.doesNotMatch(js, /admin\/|authorization|supabase\.auth/i);
  assert.match(js, /location\.hash/);
});
test('migration is additive and never deletes or rewrites applicant rows', () => {
  const sql = readFileSync('migrations/supabase/20261023_cgma_festival_coupon_admin_bulk_share.sql', 'utf8').toLowerCase();
  assert.doesNotMatch(sql, /\bdelete\s+from\s+public\.cgma_festival_2026_coupon_merchant/);
  assert.doesNotMatch(sql, /\b(drop|truncate)\s+table/);
  assert.match(sql, /on conflict do nothing/);
  assert.doesNotMatch(sql, /update public\.cgma_festival_2026_coupon_merchant set (?!review_state=p_state, updated_at=now\(\))/);
  assert.match(sql, /revoke all on public\.cgma_festival_2026_admin_log/);
});
