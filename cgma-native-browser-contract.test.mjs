import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('./.github/workflows/cloudflare-pages-deploy.yml',import.meta.url),'utf8');

test('CGMA production deploy hands off to EKODI native browser verification',()=>{
  assert.match(workflow,/outputs:\s*\n\s*deployed:/);
  assert.match(workflow,/native_surface_verification_desktop:/);
  assert.match(workflow,/native_surface_verification_mobile:/);
  assert.equal((workflow.match(/topmaster-joseph\/ekodi-platform\/\.github\/workflows\/ekodi-background-browser-worker\.yml@main/g)||[]).length,2);
  assert.equal((workflow.match(/surface_paths:\s*\/cgma\/,\/cgma\/notices\/1/g)||[]).length,2);
  assert.match(workflow,/device_profile:\s*desktop/);
  assert.match(workflow,/device_profile:\s*mobile-portrait/);
  assert.equal((workflow.match(/if:\s*needs\.deploy\.outputs\.deployed == 'true'/g)||[]).length,2);
  assert.doesNotMatch(workflow,/tinyfish|browserless|browserbase|selenium-grid/i);
});
