// 2026 쿠폰 상가 신청관리 — reuses the EKODI Google login and the CGMA admin authority.
// Every privileged call carries the admin's own Supabase session; the Edge Function re-checks
// the manager authority on each request, so this page grants nothing by itself.
import {
  EDGE, PUBLISHABLE_KEY, STATE_LABELS, SOURCE_LABELS, FIELD_LABELS, PII_FIELDS, IMPORT_STATUS, IMPORT_REASON,
  TEMPLATE_HEADERS, MAX_ROWS, esc, formatKst, normalizePhone, parseDelimited, rowsFromMatrix, readSheetFile,
  downloadTable
} from '../coupon-sheet.mjs?v=20261023-coupon-admin-v1';

const SUPABASE_URL = 'https://renzehysxirjilvdxacv.supabase.co';
const $ = id => document.getElementById(id);
const prefix = location.hostname === 'ekodi.kr' && location.pathname.startsWith('/cgma/') ? '/cgma' : '';
const route = path => prefix + path;
const ERRORS = {
  tenant_admin_required: '청계면상인회 관리자 권한이 없습니다.', login_required: '로그인이 필요합니다.',
  backend_unavailable: '접수 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.', origin_invalid: '허용되지 않은 접속 주소입니다.',
  invalid_request: '요청 내용을 확인해 주세요.', too_large: '한 번에 보낼 수 있는 크기를 넘었습니다.',
  consent_attestation_required: '개인정보 수집·이용 동의 확인란을 체크해 주세요.', pii_basis_required: '개인정보 제공 근거를 5자 이상 입력해 주세요.',
  pii_password_required: '개인정보가 포함된 공유는 비밀번호가 필요합니다.', password_too_short: '비밀번호는 8자 이상이어야 합니다.',
  invalid_expiry: '유효 기간을 확인해 주세요. 개인정보 포함 공유는 최대 7일입니다.', no_matching_applicants: '공유할 신청자가 없습니다.',
  policy_violation: '서버 정책에 맞지 않는 요청입니다.', not_found: '해당 신청을 찾을 수 없습니다.', row_limit: '한 번에 최대 500행까지 접수할 수 있습니다.'
};
const LOG_LABELS = {bulk_import: '일괄접수', review: '승인 상태 변경', bulk_review: '일괄 승인·반려', share_create: '공유 링크 생성',
  share_revoke: '공유 링크 폐기', set_intake: '접수 상태 변경', export: '명단 다운로드'};

const supa = window.supabase.createClient(SUPABASE_URL, PUBLISHABLE_KEY);
const state = {
  items: [], open: false, selected: new Set(), reviewFilter: 'pending', shares: null, log: null,
  bulk: {rows: [], dirty: true, preview: null, lastCommit: null, result: null}
};

function setStatus(text, error = false) {
  const el = $('status'); el.textContent = text || ''; el.classList.toggle('error', !!error);
}
async function accessToken() {
  const {data} = await supa.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw Error('login_required');
  return token;
}
async function api(path, body) {
  const token = await accessToken();
  let response;
  try {
    response = await fetch(EDGE + '/' + path, {
      method: body ? 'POST' : 'GET', cache: 'no-store',
      headers: {authorization: 'Bearer ' + token, apikey: PUBLISHABLE_KEY, ...(body ? {'content-type': 'application/json'} : {})},
      ...(body ? {body: JSON.stringify(body)} : {})
    });
  } catch { const e = Error('network'); e.network = true; throw e; }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    const code = data?.error || 'backend_unavailable';
    if (code === 'tenant_admin_required' || response.status === 401) showGate('denied');
    throw Error(code);
  }
  return data;
}
const message = error => error?.network ? '네트워크 연결이 끊겼습니다. 같은 작업을 다시 시도하면 중복 없이 처리됩니다.' : (ERRORS[error?.message] || error?.message || '처리하지 못했습니다.');

/* ---------- access gate (same handoff as /admin) ---------- */
function authUrl() {
  const url = new URL(location.href); url.hash = '';
  return 'https://ekodi.kr/auth/?site=cgma&direct=1&return_to=' + encodeURIComponent(url.toString());
}
function showGate(kind, text) {
  $('app').hidden = true; $('gate').hidden = false;
  const titles = {login: '관리자 로그인이 필요합니다', denied: '관리자 전용 화면입니다', error: '권한을 확인하지 못했습니다'};
  $('gateTitle').textContent = titles[kind] || titles.error;
  $('gateText').textContent = text || (kind === 'denied'
    ? '청계면상인회 관리자 또는 EKODI 최고관리자로 지정된 계정만 신청자 명단을 볼 수 있습니다. 다른 계정으로 로그인하려면 아래 버튼을 누르세요.'
    : 'EKODI 통합 Google 로그인 후 신청자 명단 관리 화면으로 돌아옵니다.');
  $('gateLogin').href = authUrl(); $('gateBack').href = route('/festival/2026/coupon/');
  $('gateActions').hidden = false;
}
async function consumeHandoff() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const tokenHash = hash.get('ekodi_token');
  if (!tokenHash) return true;
  $('gateTitle').textContent = '로그인 연결 중';
  history.replaceState({}, document.title, location.pathname + location.search);
  const {error} = await supa.auth.verifyOtp({token_hash: tokenHash, type: hash.get('ekodi_type') || 'email'});
  return !error;
}
async function boot() {
  if (!await consumeHandoff().catch(() => false)) return showGate('login', '통합인증 연결이 만료되었거나 이미 사용되었습니다. 다시 로그인해 주세요.');
  const {data} = await supa.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return showGate('login');
  let session;
  try {
    const response = await fetch(route('/api/admin-session'), {headers: {Authorization: 'Bearer ' + token}, cache: 'no-store'});
    session = await response.json();
    if (!response.ok || !session.allowed) return showGate('denied');
  } catch { return showGate('error', '권한 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'); }
  $('gate').hidden = true; $('app').hidden = false;
  $('adminEmail').textContent = session.email || '관리자';
  $('adminAuthority').textContent = session.authority === 'platform' ? 'EKODI 최고관리자' : '상인회 관리자';
  $('formLink').href = route('/festival/2026/coupon/');
  $('legacyAdmin').href = route('/admin/#couponManager');
  bind();
  selectTab(location.hash.replace('#', '') || 'list', false);
  await loadApplicants();
  renderGrid();
}

/* ---------- tabs ---------- */
const TABS = ['list', 'bulk', 'review', 'share', 'settings'];
function selectTab(name, focus = true) {
  if (!TABS.includes(name)) name = 'list';
  for (const tab of TABS) {
    const button = $('tab-' + tab), panel = $('panel-' + tab), active = tab === name;
    button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; panel.hidden = !active;
  }
  if (focus) $('tab-' + name).focus();
  $('tab-' + name).scrollIntoView({block: 'nearest', inline: 'nearest'});
  history.replaceState({}, document.title, location.pathname + location.search + '#' + name);
  if (name === 'review') renderReview();
  if (name === 'share') { updateShareCounts(); if (!state.shares) loadShares(); }
  if (name === 'settings') { renderIntake(); if (!state.log) loadLog(); }
}

/* ---------- applicants ---------- */
async function loadApplicants() {
  setStatus('신청자 명단을 불러오는 중입니다.');
  try {
    const data = await api('admin/coupon');
    state.items = data.items || []; state.open = data.open === true;
    const known = new Set(state.items.map(x => x.receipt));
    for (const r of [...state.selected]) if (!known.has(r)) state.selected.delete(r);
    renderAll(); setStatus(`조회 완료 · ${formatKst(new Date().toISOString())}`);
  } catch (error) { setStatus('조회 실패: ' + message(error), true); }
}
function filtered() {
  const q = $('q').value.trim().toLowerCase(), st = $('stateFilter').value, src = $('sourceFilter').value;
  const qPhone = normalizePhone(q);
  return state.items.filter(x => (st === 'all' || x.review_state === st) && (src === 'all' || (x.intake_source || 'web') === src)
    && (!q || [x.shop_name, x.location_text, x.items].some(v => String(v || '').toLowerCase().includes(q)) || (qPhone && String(x.phone).includes(qPhone))));
}
function stateBadge(value) {
  const cls = value === 'approved' ? 'ok' : value === 'rejected' ? 'bad' : 'pending';
  return `<span class="badge ${cls}">${esc(STATE_LABELS[value] || value)}</span>`;
}
function rowHtml(x, mode) {
  const checked = state.selected.has(x.receipt);
  const source = x.intake_source === 'admin_bulk' ? `<span class="badge">${SOURCE_LABELS.admin_bulk}</span>` : '';
  const act = mode === 'review' ? `<div class="act"><select aria-label="${esc(x.shop_name)} 승인 상태" data-state-for="${esc(x.receipt)}">
      ${Object.entries(STATE_LABELS).map(([k, l]) => `<option value="${k}" ${x.review_state === k ? 'selected' : ''}>${l}</option>`).join('')}
    </select><button type="button" data-save="${esc(x.receipt)}">저장</button></div>` : `<div class="act meta">${esc(formatKst(x.created_at))}</div>`;
  return `<article class="row${checked ? ' is-selected' : ''}" data-receipt="${esc(x.receipt)}">
    <label class="sel"><input type="checkbox" data-select="${esc(x.receipt)}" ${checked ? 'checked' : ''} aria-label="${esc(x.shop_name)} 선택"></label>
    <div class="name"><b>${esc(x.shop_name)}</b>${stateBadge(x.review_state)}${source}</div>
    <div class="field"><span class="k">연락처</span><a href="tel:${esc(x.phone)}">${esc(x.phone)}</a></div>
    <div class="field"><span class="k">상가 주소</span>${esc(x.location_text)}</div>
    <div class="field"><span class="k">취급 품목</span>${esc(x.items)}</div>
    ${act}
  </article>`;
}
const HEAD = '<div class="rows-head" aria-hidden="true"><span></span><span>상호명 · 상태</span><span>연락처</span><span>상가 주소</span><span>취급 품목</span><span>신청일 / 처리</span></div>';
function renderAll() {
  const total = state.items.length, count = s => state.items.filter(x => x.review_state === s).length;
  const bulk = state.items.filter(x => x.intake_source === 'admin_bulk').length;
  $('summary').innerHTML = [['전체 신청', total], ['검토 대기', count('pending')], ['참여 승인', count('approved')], ['미승인', count('rejected')], ['일괄접수', bulk], ['접수 상태', state.open ? '접수 중' : '마감']]
    .map(([k, v]) => `<div class="chip"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('');
  renderList(); renderReview(); updateShareCounts(); renderIntake();
}
function renderList() {
  const list = filtered();
  $('list').innerHTML = list.length ? HEAD + list.map(x => rowHtml(x, 'list')).join('') : '<p class="empty">조건에 맞는 신청자가 없습니다.</p>';
  $('selectAll').checked = list.length > 0 && list.every(x => state.selected.has(x.receipt));
  $('selectedCount').textContent = `선택 ${state.selected.size}건 · 표시 ${list.length}건`;
}
function reviewItems() {
  return state.reviewFilter === 'selected' ? state.items.filter(x => state.selected.has(x.receipt)) : state.items.filter(x => x.review_state === state.reviewFilter);
}
function renderReview() {
  const list = reviewItems();
  $('reviewList').innerHTML = list.length ? HEAD + list.map(x => rowHtml(x, 'review')).join('') : '<p class="empty">해당하는 신청자가 없습니다.</p>';
  const picked = list.filter(x => state.selected.has(x.receipt)).length;
  $('reviewSelectAll').checked = list.length > 0 && picked === list.length;
  $('reviewSelected').textContent = `선택 ${picked}건 / ${list.length}건`;
  document.querySelectorAll('[data-review-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.reviewFilter === state.reviewFilter)));
}
function toggleSelect(receipt, on) {
  if (on) state.selected.add(receipt); else state.selected.delete(receipt);
  document.querySelectorAll(`.row[data-receipt="${CSS.escape(receipt)}"]`).forEach(row => {
    row.classList.toggle('is-selected', on); const box = row.querySelector('[data-select]'); if (box) box.checked = on;
  });
  renderListCounters();
}
function renderListCounters() {
  const list = filtered(), review = reviewItems();
  $('selectAll').checked = list.length > 0 && list.every(x => state.selected.has(x.receipt));
  $('selectedCount').textContent = `선택 ${state.selected.size}건 · 표시 ${list.length}건`;
  const picked = review.filter(x => state.selected.has(x.receipt)).length;
  $('reviewSelectAll').checked = review.length > 0 && picked === review.length;
  $('reviewSelected').textContent = `선택 ${picked}건 / ${review.length}건`;
  updateShareCounts();
}

async function exportApplicants(format) {
  const chosen = state.selected.size ? state.items.filter(x => state.selected.has(x.receipt)) : filtered();
  if (!chosen.length) return setStatus('내려받을 신청자가 없습니다.', true);
  const headers = ['접수번호', '상호명', '연락처', '상가 주소', '취급 품목', '승인 상태', '접수 경로', '신청일시(KST)'];
  const rows = chosen.map(x => [x.receipt, x.shop_name, x.phone, x.location_text, x.items, STATE_LABELS[x.review_state] || x.review_state,
    SOURCE_LABELS[x.intake_source || 'web'], formatKst(x.created_at)]);
  try {
    await downloadTable(`쿠폰상가_신청자명단_${formatKst(new Date().toISOString()).slice(0, 10)}`, format, headers, rows);
    api('admin/action', {kind: 'coupon', action: 'log_export', format, count: rows.length, scope: 'applicants'}).catch(() => {});
    setStatus(`${rows.length}건을 ${format === 'csv' ? 'CSV' : 'Excel'}로 내려받았습니다.${state.selected.size ? ' (선택 항목)' : ' (현재 검색·필터 결과)'}`);
  } catch { setStatus('Excel 라이브러리를 불러오지 못했습니다. CSV로 내려받아 주세요.', true); }
}

/* ---------- review ---------- */
const approvalConfirm = '쿠폰 사용 및 정산 운영 안내를 해당 상가와 별도로 협의했는지 확인하셨습니까?';
async function saveOne(receipt) {
  const value = document.querySelector(`[data-state-for="${CSS.escape(receipt)}"]`)?.value;
  if (!value) return;
  if (value === 'approved' && !confirm(approvalConfirm)) return;
  setStatus('저장 중입니다.');
  try { await api('admin/action', {kind: 'coupon', action: 'review', receipt, state: value}); await loadApplicants(); setStatus('승인 상태를 저장했습니다.'); }
  catch (error) { setStatus('저장 실패: ' + message(error), true); }
}
async function bulkReview(target) {
  const receipts = reviewItems().filter(x => state.selected.has(x.receipt)).map(x => x.receipt);
  if (!receipts.length) return setStatus('승인 상태를 바꿀 신청자를 먼저 선택해 주세요.', true);
  const label = STATE_LABELS[target];
  if (!confirm(`선택한 ${receipts.length}건을 '${label}'(으)로 변경합니다.${target === 'approved' ? '\n\n' + approvalConfirm : ''}`)) return;
  setStatus('일괄 처리 중입니다.');
  let changed = 0;
  try {
    for (let i = 0; i < receipts.length; i += 500) {
      const r = await api('admin/action', {kind: 'coupon', action: 'review_bulk', receipts: receipts.slice(i, i + 500), state: target});
      changed += r.changed || 0;
    }
    await loadApplicants();
    setStatus(`${receipts.length}건 중 ${changed}건을 '${label}'(으)로 변경했습니다. (이미 같은 상태 ${receipts.length - changed}건)`);
  } catch (error) { await loadApplicants(); setStatus('일괄 처리 실패: ' + message(error), true); }
}

/* ---------- bulk intake ---------- */
const BLANK = () => ({shop: '', phone: '', location: '', items: '', src: null});
function renderGrid() {
  const rows = state.bulk.rows.length ? state.bulk.rows : (state.bulk.rows = [BLANK(), BLANK(), BLANK()]);
  $('grid').innerHTML = rows.map((r, n) => `<div class="entry" data-entry="${n}">
    <div class="entry-head"><span>#${n + 1}${r.src ? ` · 파일 ${r.src}행` : ''}</span><button type="button" class="linkish danger-text" data-remove="${n}" aria-label="${n + 1}번째 행 삭제">삭제</button></div>
    <label>상호명<input data-f="shop" data-n="${n}" value="${esc(r.shop)}" maxlength="80" autocomplete="off"></label>
    <label>연락처<input data-f="phone" data-n="${n}" value="${esc(r.phone)}" maxlength="30" inputmode="tel" autocomplete="off"></label>
    <label>상가 주소<input data-f="location" data-n="${n}" value="${esc(r.location)}" maxlength="200" autocomplete="off"></label>
    <label>취급 품목<input data-f="items" data-n="${n}" value="${esc(r.items)}" maxlength="500" autocomplete="off"></label>
  </div>`).join('');
}
function loadRows(result, sourceLabel) {
  const errors = {header: `제목 행에 다음 항목이 필요합니다: ${TEMPLATE_HEADERS.join(', ')}`, empty: '불러올 신청자 행이 없습니다.',
    too_many: `한 번에 최대 ${MAX_ROWS}행까지 접수할 수 있습니다. 파일을 나눠 주세요.`, file_size: '파일이 2MB를 넘습니다.',
    file_type: 'xlsx 또는 csv 파일만 사용할 수 있습니다.'};
  if (result.error) return setStatus('불러오기 실패: ' + (errors[result.error] || result.error), true);
  state.bulk.rows = result.rows.map(r => ({shop: r.shop, phone: r.phone, location: r.location, items: r.items, src: r.i}));
  markDirty(); renderGrid();
  setStatus(`${sourceLabel}에서 ${result.rows.length}행을 불러왔습니다. 확인 후 '검증·미리보기'를 눌러 주세요.`);
}
function markDirty() {
  state.bulk.dirty = true; state.bulk.preview = null; $('previewCard').hidden = true;
}
function payloadRows() {
  return state.bulk.rows.map((r, n) => ({i: n + 1, shop: r.shop.trim(), phone: normalizePhone(r.phone), location: r.location.trim(), items: r.items.trim()}))
    .filter(r => r.shop || r.phone || r.location || r.items);
}
async function preview() {
  const rows = payloadRows();
  if (!rows.length) return setStatus('검증할 신청자를 입력하거나 파일을 불러와 주세요.', true);
  if (rows.length > MAX_ROWS) return setStatus(`한 번에 최대 ${MAX_ROWS}행까지 접수할 수 있습니다.`, true);
  const key = crypto.randomUUID();
  setStatus('서버에서 필수 항목과 기존 신청자 중복을 확인하는 중입니다.');
  try {
    const r = await api('admin/action', {kind: 'coupon', action: 'import', key, commit: false, rows});
    const byI = new Map(rows.map(x => [x.i, x]));
    state.bulk.preview = {key, rows: r.rows.map(x => ({...x, input: byI.get(x.i), include: x.status === 'ready', confirm: false})), summary: r.summary};
    state.bulk.dirty = false; state.bulk.result = null; $('resultCard').hidden = true;
    renderPreview(); $('previewCard').hidden = false; setStatus('미리보기를 확인한 뒤 접수할 행을 선택해 주세요. 아직 아무것도 저장되지 않았습니다.');
    $('previewCard').scrollIntoView({block: 'start'});
  } catch (error) { setStatus('검증 실패: ' + message(error), true); }
}
function inputSummary(input) {
  return `<div class="field"><span class="k">연락처</span>${esc(input?.phone)}</div><div class="field"><span class="k">상가 주소</span>${esc(input?.location)}</div><div class="field"><span class="k">취급 품목</span>${esc(input?.items)}</div>`;
}
function matchHtml(match) {
  if (!match?.receipt) return match?.reason ? `<div class="match">${esc(IMPORT_REASON[match.reason] || match.reason)}</div>` : '';
  return `<div class="match">기존 신청: <b>${esc(match.shop_name)}</b> · ${esc(match.phone)} · ${esc(STATE_LABELS[match.review_state] || match.review_state)}</div>`;
}
function renderPreview() {
  const p = state.bulk.preview; if (!p) return;
  const s = p.summary || {};
  $('previewSummary').innerHTML = [['전체 행', s.total], ['신규 접수 가능', s.ready], ['중복 의심', s.needs_confirm], ['중복 (건너뜀)', s.duplicate], ['입력 오류', s.invalid]]
    .map(([k, v]) => `<div class="chip"><b>${esc(v ?? 0)}</b><span>${esc(k)}</span></div>`).join('');
  $('previewRows').innerHTML = p.rows.map(x => {
    const selectable = x.status === 'ready' || x.status === 'needs_confirm';
    const reason = x.reason ? ` · ${esc(IMPORT_REASON[x.reason] || x.reason)}` : '';
    const confirmBox = x.status === 'needs_confirm' ? `<label class="check"><input type="checkbox" data-confirm="${x.i}" ${x.confirm ? 'checked' : ''}> 다른 신청자임을 확인했습니다 (접수 허용)</label>` : '';
    return `<article class="row status-${esc(x.status)}">
      <label class="sel"><input type="checkbox" data-include="${x.i}" ${x.include ? 'checked' : ''} ${selectable ? '' : 'disabled'} aria-label="${x.i}번 행 접수 선택"></label>
      <div class="name"><b>${esc(x.input?.shop || '(상호 없음)')}</b><span class="badge ${x.status === 'ready' ? 'ok' : x.status === 'invalid' ? 'bad' : 'warn'}">${esc(IMPORT_STATUS[x.status] || x.status)}</span></div>
      ${inputSummary(x.input)}
      <div class="act meta">#${x.i}${reason}</div>
      ${matchHtml(x.match)}${confirmBox}
    </article>`;
  }).join('');
  updateCommitButtons();
}
function commitRows(all) {
  const p = state.bulk.preview;
  return p.rows.filter(x => (x.status === 'ready' || (x.status === 'needs_confirm' && x.confirm)) && (all || x.include))
    .map(x => ({...x.input, confirm: x.status === 'needs_confirm' && x.confirm}));
}
function updateCommitButtons() {
  const p = state.bulk.preview; if (!p) return;
  $('commitSelected').textContent = `선택 접수 (${commitRows(false).length}건)`;
  $('commitAll').textContent = `접수 가능 전체 접수 (${commitRows(true).length}건)`;
}
async function commit(all) {
  const p = state.bulk.preview;
  if (!p || state.bulk.dirty) return setStatus('입력 내용이 바뀌었습니다. 다시 검증·미리보기를 해 주세요.', true);
  if (!$('consent').checked) { $('consent').focus(); return setStatus(ERRORS.consent_attestation_required, true); }
  const rows = commitRows(all);
  if (!rows.length) return setStatus('접수할 행이 없습니다. 중복 의심 행은 확인란을 체크해야 접수됩니다.', true);
  if (!confirm(`${rows.length}건을 신규 신청으로 접수합니다. 기존 신청자 정보는 변경되지 않습니다.`)) return;
  state.bulk.lastCommit = {kind: 'coupon', action: 'import', key: p.key, commit: true, consentAttested: true, rows};
  await sendCommit();
}
async function sendCommit() {
  const payload = state.bulk.lastCommit; if (!payload) return;
  setStatus('접수 중입니다. 창을 닫지 마세요.');
  $('commitSelected').disabled = $('commitAll').disabled = $('retryCommit').disabled = true;
  try {
    const r = await api('admin/action', payload);
    const byI = new Map(payload.rows.map(x => [x.i, x]));
    state.bulk.result = r.rows.map(x => ({...x, input: byI.get(x.i)}));
    $('retryCommit').hidden = true; state.bulk.lastCommit = null; state.bulk.preview = null; $('previewCard').hidden = true;
    const s = r.summary || {};
    $('resultSummary').innerHTML = [['요청', s.total], ['접수 완료', s.created], ['건너뜀', s.skipped], ['실패', s.failed]]
      .map(([k, v]) => `<div class="chip"><b>${esc(v ?? 0)}</b><span>${esc(k)}</span></div>`).join('') + (r.replay ? '<p class="muted small">이미 처리된 접수였습니다. 중복 생성 없이 처음 결과를 보여 줍니다.</p>' : '');
    $('resultRows').innerHTML = state.bulk.result.map(x => `<article class="row status-${esc(x.status)}"><span class="sel"></span>
      <div class="name"><b>${esc(x.input?.shop)}</b><span class="badge ${x.status === 'created' ? 'ok' : x.status === 'failed' ? 'bad' : 'warn'}">${esc(IMPORT_STATUS[x.status] || x.status)}</span></div>
      ${inputSummary(x.input)}<div class="act meta">${x.receipt ? '접수번호 ' + esc(x.receipt) : esc(IMPORT_REASON[x.reason] || x.reason || '')}</div></article>`).join('');
    $('resultCard').hidden = false; $('resultCard').scrollIntoView({block: 'start'});
    state.bulk.rows = []; state.bulk.dirty = true; renderGrid();
    await loadApplicants(); state.log = null;
    setStatus(`일괄접수 완료: ${s.created ?? 0}건 접수, ${s.skipped ?? 0}건 건너뜀, ${s.failed ?? 0}건 실패.`);
  } catch (error) {
    setStatus('접수 실패: ' + message(error), true);
    if (error.network || error.message === 'backend_unavailable') { $('retryCommit').hidden = false; $('resultCard').hidden = false; }
  } finally { $('commitSelected').disabled = $('commitAll').disabled = $('retryCommit').disabled = false; }
}
async function exportResult(format) {
  if (!state.bulk.result?.length) return;
  const headers = ['행 번호', '상호명', '연락처', '상가 주소', '취급 품목', '처리 결과', '사유', '접수번호'];
  const rows = state.bulk.result.map(x => [x.i, x.input?.shop, x.input?.phone, x.input?.location, x.input?.items,
    IMPORT_STATUS[x.status] || x.status, IMPORT_REASON[x.reason] || x.reason || '', x.receipt || '']);
  try {
    await downloadTable(`쿠폰상가_일괄접수_결과_${formatKst(new Date().toISOString()).slice(0, 10)}`, format, headers, rows);
    api('admin/action', {kind: 'coupon', action: 'log_export', format, count: rows.length, scope: 'import_result'}).catch(() => {});
  } catch { setStatus('Excel 라이브러리를 불러오지 못했습니다. CSV로 내려받아 주세요.', true); }
}
async function downloadTemplate(format) {
  try { await downloadTable('쿠폰상가_일괄접수_양식', format, TEMPLATE_HEADERS, []); }
  catch { setStatus('Excel 라이브러리를 불러오지 못했습니다. CSV 양식을 사용해 주세요.', true); }
}

/* ---------- share ---------- */
function shareTargets() {
  const target = document.querySelector('input[name=target]:checked')?.value;
  if (target === 'selected') return state.items.filter(x => state.selected.has(x.receipt));
  if (target === 'filtered') return filtered();
  return state.items.filter(x => x.review_state === 'approved');
}
function updateShareCounts() {
  $('countApproved').textContent = state.items.filter(x => x.review_state === 'approved').length;
  $('countSelected').textContent = state.selected.size;
  $('countFiltered').textContent = filtered().length;
}
function chosenFields() { return [...document.querySelectorAll('input[name=field]:checked')].map(x => x.value); }
function updatePii() {
  const pii = chosenFields().some(f => PII_FIELDS.includes(f));
  $('piiBox').hidden = !pii;
  $('pwRequired').textContent = pii ? '(필수, 8자 이상)' : '(선택, 8자 이상)';
  for (const option of $('shareDays').options) option.disabled = pii && Number(option.value) > 7;
  if (pii && Number($('shareDays').value) > 7) $('shareDays').value = '7';
}
async function createShare(event) {
  event.preventDefault();
  const fields = chosenFields(), items = shareTargets(), pii = fields.some(f => PII_FIELDS.includes(f));
  const label = $('shareLabel').value.trim(), password = $('sharePassword').value, basis = $('piiBasis').value.trim();
  if (!items.length) return setStatus('공유할 신청자가 없습니다. 대상 선택을 확인해 주세요.', true);
  if (items.length > 500) return setStatus('한 링크로 최대 500건까지 공유할 수 있습니다.', true);
  if (!fields.length) return setStatus('공유할 항목을 1개 이상 선택해 주세요.', true);
  if (!label) { $('shareLabel').focus(); return setStatus('링크 이름을 입력해 주세요.', true); }
  if (password && password.length < 8) return setStatus(ERRORS.password_too_short, true);
  if (pii && basis.length < 5) { $('piiBasis').focus(); return setStatus(ERRORS.pii_basis_required, true); }
  if (pii && !password) { $('sharePassword').focus(); return setStatus(ERRORS.pii_password_required, true); }
  const names = fields.map(f => FIELD_LABELS[f]).join(', ');
  if (!confirm(`${items.length}건의 [${names}] 항목을 읽기 전용 링크로 공유합니다.${pii ? '\n\n개인정보가 포함됩니다. 제공 근거와 수신자를 다시 확인해 주세요.' : ''}`)) return;
  setStatus('공유 링크를 만드는 중입니다.');
  try {
    const r = await api('admin/action', {kind: 'coupon', action: 'share_create', label, fields, receipts: items.map(x => x.receipt),
      expiresInDays: Number($('shareDays').value), password: password || undefined, piiBasis: pii ? basis : undefined, allowDownload: $('shareDownload').checked});
    $('shareUrl').value = location.origin + route('/festival/2026/coupon/share/') + '#t=' + r.token;
    $('shareResult').hidden = false; $('sharePassword').value = '';
    setStatus(`공유 링크를 만들었습니다 (${r.share?.count ?? items.length}건, ${formatKst(r.share?.expires_at)} 만료).`);
    await loadShares();
  } catch (error) { setStatus('공유 링크 생성 실패: ' + message(error), true); }
}
function shareState(s) {
  if (s.revokedAt) return ['폐기됨', 'bad'];
  if (Date.parse(s.expiresAt) <= Date.now()) return ['만료', 'pending'];
  if (s.lockedUntil && Date.parse(s.lockedUntil) > Date.now()) return ['비밀번호 오류로 잠김', 'warn'];
  return ['사용 중', 'ok'];
}
async function loadShares() {
  try { const r = await api('admin/coupon/shares'); state.shares = r.items || []; renderShares(); }
  catch (error) { $('shareList').innerHTML = `<p class="empty">공유 이력을 불러오지 못했습니다: ${esc(message(error))}</p>`; }
}
function renderShares() {
  const list = state.shares || [];
  $('shareList').innerHTML = list.length ? list.map(s => {
    const [label, cls] = shareState(s), active = cls === 'ok' || cls === 'warn';
    return `<article class="row"><span class="sel"></span>
      <div class="name"><b>${esc(s.label)}</b><span class="badge ${cls}">${label}</span>${s.includesPii ? '<span class="badge warn">개인정보 포함</span>' : ''}</div>
      <div class="field"><span class="k">항목</span>${esc((s.fields || []).map(f => FIELD_LABELS[f] || f).join(', '))} · ${esc(s.count)}건</div>
      <div class="field"><span class="k">기간</span>${esc(formatKst(s.createdAt))} ~ ${esc(formatKst(s.expiresAt))}</div>
      <div class="field"><span class="k">조회</span>${esc(s.viewCount)}회${s.lastViewedAt ? ' · 최근 ' + esc(formatKst(s.lastViewedAt)) : ''} · ${s.hasPassword ? '비밀번호' : '링크만'}${s.allowDownload ? ' · 다운로드 허용' : ''}</div>
      <div class="act">${active ? `<button type="button" class="danger" data-revoke="${esc(s.id)}">즉시 폐기</button>` : ''}<span class="meta">${esc(s.createdBy || '')}${s.piiBasis ? ' · 근거: ' + esc(s.piiBasis) : ''}</span></div>
    </article>`;
  }).join('') : '<p class="empty">아직 만든 공유 링크가 없습니다.</p>';
}
async function revokeShare(id) {
  if (!confirm('이 공유 링크를 즉시 폐기합니다. 받은 사람은 더 이상 열 수 없습니다.')) return;
  try { await api('admin/action', {kind: 'coupon', action: 'share_revoke', id}); setStatus('공유 링크를 폐기했습니다.'); await loadShares(); }
  catch (error) { setStatus('폐기 실패: ' + message(error), true); }
}

/* ---------- settings ---------- */
function renderIntake() {
  $('intakeState').textContent = state.open ? '현재 온라인 신청을 받고 있습니다.' : '온라인 신청이 마감되어 있습니다. (관리자 일괄접수는 가능합니다)';
  $('intakeToggle').textContent = state.open ? '온라인 신청 마감하기' : '온라인 신청 다시 열기';
}
async function toggleIntake() {
  const next = !state.open;
  if (!confirm(next ? '쿠폰 상가 온라인 신청을 다시 시작하시겠습니까?' : '쿠폰 상가 온라인 신청을 마감하시겠습니까?')) return;
  try { await api('admin/action', {kind: 'coupon', action: 'set_intake', open: next}); await loadApplicants(); state.log = null; setStatus(next ? '신청 접수를 다시 열었습니다.' : '신청 접수를 마감했습니다.'); }
  catch (error) { setStatus('변경 실패: ' + message(error), true); }
}
function logDetail(entry) {
  const d = entry.detail || {};
  if (entry.action === 'bulk_import') return `요청 ${d.total ?? '-'} · 접수 ${d.created ?? 0} · 건너뜀 ${d.skipped ?? 0} · 실패 ${d.failed ?? 0}`;
  if (entry.action === 'review' || entry.action === 'bulk_review') return `→ ${STATE_LABELS[d.state] || d.state} · 요청 ${d.requested ?? '-'} · 변경 ${d.changed ?? 0}`;
  if (entry.action === 'share_create') return `${(d.fields || []).map(f => FIELD_LABELS[f] || f).join(', ')}${d.includes_pii ? ' (개인정보)' : ''} · ${formatKst(d.expires_at)} 만료`;
  if (entry.action === 'set_intake') return d.open ? '접수 열기' : '접수 마감';
  if (entry.action === 'export') return `${d.format?.toUpperCase?.() || ''} · ${d.scope === 'import_result' ? '일괄접수 결과' : '신청자 명단'}`;
  return '';
}
async function loadLog() {
  try {
    const r = await api('admin/coupon/log'); state.log = r;
    $('logList').innerHTML = r.log?.length ? r.log.map(e => `<article class="row"><span class="sel"></span>
      <div class="name"><b>${esc(LOG_LABELS[e.action] || e.action)}</b><span class="badge">${esc(e.target_count)}건</span></div>
      <div class="field">${esc(logDetail(e))}</div><div class="act meta">${esc(formatKst(e.at))} · ${esc(e.actor_email || '')}</div></article>`).join('')
      : '<p class="empty">기록된 관리자 작업이 없습니다.</p>';
    $('batchList').innerHTML = r.batches?.length ? r.batches.map(b => `<article class="row"><span class="sel"></span>
      <div class="name"><b>${esc(formatKst(b.created_at))}</b><span class="badge ok">접수 ${esc(b.created_count)}</span></div>
      <div class="field">요청 ${esc(b.row_count)} · 건너뜀 ${esc(b.skipped_count)} · 실패 ${esc(b.failed_count)}</div>
      <div class="act meta">${esc(b.actor_email || '')}</div></article>`).join('') : '<p class="empty">일괄접수 이력이 없습니다.</p>';
  } catch (error) { $('logList').innerHTML = `<p class="empty">로그를 불러오지 못했습니다: ${esc(message(error))}</p>`; }
}

/* ---------- events ---------- */
function bind() {
  const tablist = document.querySelector('[role=tablist]');
  addEventListener('hashchange', () => { const tab = location.hash.replace('#', ''); if (TABS.includes(tab)) selectTab(tab, false); });
  tablist.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) selectTab(t.dataset.tab, false); });
  tablist.addEventListener('keydown', e => {
    const i = TABS.indexOf(document.activeElement?.dataset?.tab); if (i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); selectTab(TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]); }
  });
  for (const id of ['q', 'stateFilter', 'sourceFilter']) $(id).addEventListener('input', () => { renderList(); updateShareCounts(); });
  $('refresh').addEventListener('click', loadApplicants);
  $('selectAll').addEventListener('change', e => { for (const x of filtered()) e.target.checked ? state.selected.add(x.receipt) : state.selected.delete(x.receipt); renderList(); renderReview(); updateShareCounts(); });
  $('reviewSelectAll').addEventListener('change', e => { for (const x of reviewItems()) e.target.checked ? state.selected.add(x.receipt) : state.selected.delete(x.receipt); renderList(); renderReview(); updateShareCounts(); });
  document.addEventListener('change', e => { const box = e.target.closest('[data-select]'); if (box) toggleSelect(box.dataset.select, box.checked); });
  document.querySelectorAll('[data-export]').forEach(b => b.addEventListener('click', () => exportApplicants(b.dataset.export)));
  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.goto === 'review') state.reviewFilter = 'selected';
    if (b.dataset.goto === 'share') { const r = document.querySelector('input[name=target][value=selected]'); if (r) r.checked = true; }
    selectTab(b.dataset.goto, false);
  }));
  $('reviewList').addEventListener('click', e => { const s = e.target.closest('[data-save]'); if (s) saveOne(s.dataset.save); });
  document.querySelectorAll('[data-review-filter]').forEach(b => b.addEventListener('click', () => { state.reviewFilter = b.dataset.reviewFilter; renderReview(); }));
  document.querySelectorAll('[data-bulk-state]').forEach(b => b.addEventListener('click', () => bulkReview(b.dataset.bulkState)));

  $('templateXlsx').addEventListener('click', () => downloadTemplate('xlsx'));
  $('templateCsv').addEventListener('click', () => downloadTemplate('csv'));
  $('file').addEventListener('change', async e => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setStatus('파일을 읽는 중입니다.');
    try { loadRows(await readSheetFile(file), `'${file.name}'`); }
    catch { setStatus('파일을 읽지 못했습니다. 양식 파일에 맞춰 다시 저장해 주세요.', true); }
  });
  $('pasteApply').addEventListener('click', () => loadRows(rowsFromMatrix(parseDelimited($('paste').value)), '붙여넣은 표'));
  $('addRow').addEventListener('click', () => { state.bulk.rows.push(BLANK()); markDirty(); renderGrid(); $('grid').lastElementChild?.querySelector('input')?.focus(); });
  $('clearRows').addEventListener('click', () => { if (confirm('입력한 일괄접수 명단을 모두 지울까요? (서버 데이터는 바뀌지 않습니다)')) { state.bulk.rows = []; markDirty(); renderGrid(); } });
  $('grid').addEventListener('input', e => { const f = e.target.dataset.f; if (!f) return; state.bulk.rows[Number(e.target.dataset.n)][f] = e.target.value; markDirty(); });
  $('grid').addEventListener('click', e => { const r = e.target.closest('[data-remove]'); if (!r) return; state.bulk.rows.splice(Number(r.dataset.remove), 1); markDirty(); renderGrid(); });
  $('preview').addEventListener('click', preview);
  $('previewRows').addEventListener('change', e => {
    const p = state.bulk.preview; if (!p) return;
    const inc = e.target.dataset.include, con = e.target.dataset.confirm;
    const row = p.rows.find(x => String(x.i) === (inc ?? con)); if (!row) return;
    if (inc) row.include = e.target.checked;
    if (con) { row.confirm = e.target.checked; row.include = e.target.checked; renderPreview(); return; }
    updateCommitButtons();
  });
  $('commitSelected').addEventListener('click', () => commit(false));
  $('commitAll').addEventListener('click', () => commit(true));
  $('retryCommit').addEventListener('click', sendCommit);
  document.querySelectorAll('[data-result-export]').forEach(b => b.addEventListener('click', () => exportResult(b.dataset.resultExport)));

  $('shareForm').addEventListener('submit', createShare);
  $('shareForm').addEventListener('change', e => { if (e.target.name === 'field') updatePii(); if (e.target.name === 'target') updateShareCounts(); });
  $('shareCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('shareUrl').value); setStatus('공유 링크를 복사했습니다.'); }
    catch { $('shareUrl').select(); setStatus('링크를 선택했습니다. 길게 눌러 복사해 주세요.'); }
  });
  $('sharesRefresh').addEventListener('click', loadShares);
  $('shareList').addEventListener('click', e => { const r = e.target.closest('[data-revoke]'); if (r) revokeShare(r.dataset.revoke); });
  $('intakeToggle').addEventListener('click', toggleIntake);
  $('logRefresh').addEventListener('click', loadLog);
  $('logout').addEventListener('click', async () => { await supa.auth.signOut().catch(() => {}); showGate('login', '로그아웃했습니다.'); });
}

boot().catch(error => { console.error('coupon admin', error); showGate('error', '관리 화면을 시작하지 못했습니다. 새로고침해 주세요.'); });
