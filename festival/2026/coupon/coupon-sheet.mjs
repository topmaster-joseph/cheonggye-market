// Shared, dependency-free helpers for the 2026 coupon merchant admin and share pages.
// Server-side validation in the Edge Function / database is authoritative; these only
// prepare input and render output safely.

export const EDGE = 'https://renzehysxirjilvdxacv.supabase.co/functions/v1/cgma-festival-intake';
export const PUBLISHABLE_KEY = 'sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
export const MAX_ROWS = 500;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

// SheetJS is loaded lazily (only when an admin opens or downloads an .xlsx) with SRI.
export const SHEETJS = Object.freeze({
  src: 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  integrity: 'sha384-EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT'
});

export const STATE_LABELS = Object.freeze({pending: '검토 대기', approved: '참여 승인', rejected: '미승인'});
export const SOURCE_LABELS = Object.freeze({web: '온라인 신청', admin_bulk: '관리자 일괄접수'});
export const FIELD_LABELS = Object.freeze({
  shop_name: '상호명', items: '취급 품목', review_state: '승인 상태', created_at: '신청일',
  location_text: '상가 주소', phone: '연락처'
});
export const PII_FIELDS = Object.freeze(['phone', 'location_text']);
export const IMPORT_STATUS = Object.freeze({
  ready: '접수 가능', needs_confirm: '중복 의심 · 확인 필요', duplicate_existing: '기존 신청과 동일 (건너뜀)',
  duplicate_in_file: '파일 안에서 중복 (건너뜀)', invalid: '입력 오류',
  created: '접수 완료', skipped: '건너뜀', failed: '실패'
});
export const IMPORT_REASON = Object.freeze({
  shop: '상호명 누락 또는 80자 초과', phone: '연락처 형식 오류 (0으로 시작하는 9~11자리)',
  location: '상가 주소 누락 또는 200자 초과', items: '취급 품목 누락 또는 500자 초과',
  same_shop_phone: '상호명·연락처 모두 동일', same_phone: '연락처가 같은 기존 신청 있음',
  same_shop: '상호명이 같은 기존 신청 있음', same_phone_in_file: '파일 안에 같은 연락처 있음',
  same_shop_in_file: '파일 안에 같은 상호명 있음'
});

export const TEMPLATE_HEADERS = ['상호명', '연락처', '상가 주소', '취급 품목'];
const HEADER_ALIASES = {
  shop: ['상호', '상호명', '가게명', '업체명', '점포명', 'shop', 'shopname', 'shop_name'],
  phone: ['연락처', '전화', '전화번호', '휴대폰', '휴대전화', '핸드폰', 'phone', 'tel'],
  location: ['상가주소', '주소', '위치', '가게위치', '상가주소또는위치', '상가위치', 'location', 'address', 'location_text'],
  items: ['취급품목', '주요취급품목', '품목', '판매품목', 'items']
};
const normalizeHeader = value => String(value ?? '').replace(/[\s*()\[\]·.:_-]/g, '').toLowerCase();

export function headerMap(row) {
  const map = {};
  (row || []).forEach((cell, index) => {
    const key = normalizeHeader(cell);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (map[field] === undefined && aliases.includes(key)) map[field] = index;
    }
  });
  return map;
}

// RFC 4180 CSV (quotes, escaped quotes, CRLF) with BOM stripping; also accepts TSV (Excel paste).
export function parseDelimited(text) {
  const source = String(text ?? '').replace(/^﻿/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const delimiter = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"') { if (source[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

// Excel often stores phone numbers as numbers and drops the leading 0 (1012345678).
export function normalizePhone(value) {
  let digits = String(value ?? '').trim();
  if (/^\d+\.0+$/.test(digits)) digits = digits.replace(/\.0+$/, '');
  digits = digits.replace(/[\s().-]/g, '');
  if (/^1\d{7,9}$/.test(digits)) digits = '0' + digits;
  return digits;
}
export const validPhone = value => /^0\d{8,10}$/.test(normalizePhone(value));

// matrix: array of rows (first non-empty row is the header). Returns rows numbered as in the sheet.
export function rowsFromMatrix(matrix) {
  const rows = (matrix || []).map(r => (r || []).map(c => String(c ?? '')));
  if (!rows.length) return {error: 'empty', rows: []};
  const map = headerMap(rows[0]);
  const missing = ['shop', 'phone', 'location', 'items'].filter(field => map[field] === undefined);
  if (missing.length) return {error: 'header', missing, rows: []};
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const pick = field => (rows[r][map[field]] ?? '').trim();
    const entry = {i: r + 1, shop: pick('shop'), phone: normalizePhone(pick('phone')), location: pick('location'), items: pick('items')};
    if (entry.shop || entry.phone || entry.location || entry.items) out.push(entry);
  }
  if (!out.length) return {error: 'empty', rows: []};
  if (out.length > MAX_ROWS) return {error: 'too_many', rows: []};
  return {rows: out};
}

// Spreadsheet formula injection guard for CSV exports.
export function safeCell(value) {
  const text = String(value ?? '');
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}
export function toCsv(headers, rows) {
  const quote = value => {
    const text = safeCell(value);
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  return '﻿' + [headers, ...rows].map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
}

export function formatKst(iso) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return '';
  const d = new Date(time + 9 * 3600 * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export function fieldText(field, value) {
  if (field === 'review_state') return STATE_LABELS[value] || String(value ?? '');
  if (field === 'created_at') return formatKst(value);
  return String(value ?? '');
}

export function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
let sheetPromise = null;
export function loadSheetJs() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  sheetPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SHEETJS.src; script.integrity = SHEETJS.integrity; script.crossOrigin = 'anonymous';
    script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(Error('sheet_library'));
    script.onerror = () => { sheetPromise = null; reject(Error('sheet_library')); };
    document.head.append(script);
  });
  return sheetPromise;
}
export async function downloadTable(name, format, headers, rows) {
  if (format === 'csv') return downloadBlob(name + '.csv', new Blob([toCsv(headers, rows)], {type: 'text/csv;charset=utf-8'}));
  const XLSX = await loadSheetJs();
  // aoa_to_sheet stores strings as text cells, so leading "=" is never evaluated as a formula.
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows.map(r => r.map(v => String(v ?? '')))]);
  sheet['!cols'] = headers.map(h => ({wch: Math.max(10, String(h).length * 2 + 4)}));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, '명단');
  XLSX.writeFile(book, name + '.xlsx', {compression: true});
}
export async function readSheetFile(file) {
  if (!file) return {error: 'empty', rows: []};
  if (file.size > MAX_FILE_BYTES) return {error: 'file_size', rows: []};
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) return rowsFromMatrix(parseDelimited(await file.text()));
  if (!name.endsWith('.xlsx')) return {error: 'file_type', rows: []};
  const XLSX = await loadSheetJs();
  const book = XLSX.read(await file.arrayBuffer(), {type: 'array', cellFormula: false, cellHTML: false, sheetRows: MAX_ROWS + 2});
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) return {error: 'empty', rows: []};
  return rowsFromMatrix(XLSX.utils.sheet_to_json(sheet, {header: 1, raw: false, defval: '', blankrows: false}));
}
