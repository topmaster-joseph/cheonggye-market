// Read-only share viewer. Talks only to the public share/view endpoint with the opaque token
// from the URL fragment (never sent to servers or referrers); it has no admin session or API.
import {EDGE, PUBLISHABLE_KEY, FIELD_LABELS, esc, fieldText, formatKst, downloadTable} from '../coupon-sheet.mjs?v=20261023-coupon-admin-v1';

const $ = id => document.getElementById(id);
const token = new URLSearchParams(location.hash.replace(/^#/, '')).get('t') || '';
const ERRORS = {
  share_not_found: '공유 링크가 올바르지 않습니다. 받은 주소 전체를 다시 확인해 주세요.',
  share_revoked: '관리자가 폐기한 공유 링크입니다.', share_expired: '유효 기간이 지난 공유 링크입니다.',
  share_locked: '비밀번호를 여러 번 잘못 입력해 15분 동안 잠겼습니다.', password_invalid: '비밀번호가 맞지 않습니다.',
  backend_unavailable: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
};
let data = null;

function status(text, error = false) { const el = $('status'); el.textContent = text; el.classList.toggle('error', error); el.hidden = !text; }
async function open(password) {
  status('공유 명단을 불러오는 중입니다.');
  let response, body;
  try {
    response = await fetch(EDGE + '/share/view', {method: 'POST', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: {'content-type': 'application/json', apikey: PUBLISHABLE_KEY}, body: JSON.stringify({token, ...(password ? {password} : {})})});
    body = await response.json().catch(() => null);
  } catch { return status(ERRORS.backend_unavailable, true); }
  if (!response.ok || !body?.ok) {
    const code = body?.error || 'backend_unavailable';
    if (body?.label) $('title').textContent = body.label;
    if (code === 'password_required' || code === 'password_invalid') {
      $('pwForm').hidden = false; $('view').hidden = true;
      status(code === 'password_invalid' ? ERRORS.password_invalid : '비밀번호를 입력하면 명단을 볼 수 있습니다.', code === 'password_invalid');
      $('pw').value = ''; $('pw').focus(); return;
    }
    $('pwForm').hidden = true; $('view').hidden = true;
    return status(ERRORS[code] || ERRORS.backend_unavailable, true);
  }
  data = body; $('pwForm').hidden = true; $('view').hidden = false; status('');
  $('title').textContent = body.label;
  $('meta').textContent = `총 ${body.items.length}곳 · ${formatKst(body.expiresAt)}까지 열람 가능 · 읽기 전용`;
  $('downloads').hidden = !body.allowDownload;
  render();
}
function render() {
  const q = $('q').value.trim().toLowerCase();
  const fields = data.fields;
  const list = data.items.filter(row => !q || fields.some(f => fieldText(f, row[f]).toLowerCase().includes(q)));
  $('rows').style.setProperty('--cols', fields.length);
  $('rows').innerHTML = (list.length ? `<div class="vhead" aria-hidden="true">${fields.map(f => `<span>${esc(FIELD_LABELS[f])}</span>`).join('')}</div>` : '')
    + (list.length ? list.map(row => `<article class="vrow">${fields.map((f, n) => {
      const text = esc(fieldText(f, row[f]));
      const value = f === 'phone' ? `<a href="tel:${text}">${text}</a>` : text;
      return `<div class="field${n === 0 ? ' first' : ''}"><span class="k">${esc(FIELD_LABELS[f])}</span>${value}</div>`;
    }).join('')}</article>`).join('') : '<p class="empty">표시할 상가가 없습니다.</p>');
}
$('pwForm').addEventListener('submit', e => { e.preventDefault(); if ($('pw').value) open($('pw').value); });
$('q').addEventListener('input', () => data && render());
document.querySelectorAll('[data-download]').forEach(button => button.addEventListener('click', async () => {
  if (!data?.allowDownload) return;
  try {
    await downloadTable(data.label.replace(/[\\/:*?"<>|]/g, '_'), button.dataset.download, data.fields.map(f => FIELD_LABELS[f]),
      data.items.map(row => data.fields.map(f => fieldText(f, row[f]))));
  } catch { status('Excel 라이브러리를 불러오지 못했습니다. CSV로 내려받아 주세요.', true); }
}));
if (!/^[A-Za-z0-9_-]{43}$/.test(token)) status(ERRORS.share_not_found, true); else open();
