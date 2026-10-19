// Static contract tests: the public approved-merchant page renders only public fields safely,
// and the admin console exposes CSV download + history without leaking into public pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync('festival/2026/coupon/merchants/index.html','utf8');
const form=readFileSync('festival/2026/coupon/index.html','utf8');
const admin=readFileSync('admin-coupon.js','utf8');
const adminHtml=readFileSync('admin/index.html','utf8');

test('public page reads only the public endpoint and renders via textContent (no innerHTML injection)',()=>{
  assert.match(page,/\/public\/coupon-merchants/);
  assert.doesNotMatch(page,/admin\/coupon/);
  assert.doesNotMatch(page,/innerHTML/);
  assert.match(page,/textContent=m\.shopName/);
});
test('public page never references phone, receipt or applicant fields',()=>{
  const script=page.slice(page.indexOf('<script>'));
  assert.doesNotMatch(script,/phone|receipt|privacy|actor|tel:\$/i);
  assert.match(page,/개인정보는 공개하지 않습니다/);
});
test('application form links to the approved list',()=>{
  assert.match(form,/href="merchants\/"/);
});
test('admin console offers authenticated CSV download and per-shop history',()=>{
  assert.match(adminHtml,/id="couponAdminCsv"/);
  assert.match(adminHtml,/admin-coupon\.js\?v=20261019-coupon-v2/);
  assert.match(admin,/admin\/coupon\.csv/);
  assert.match(admin,/authorization:'Bearer '\+token/);
  assert.match(admin,/처리 이력/);
  assert.match(admin,/공개 목록에 표시됩니다/);
});
