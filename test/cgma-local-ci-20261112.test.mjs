import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CGMA local CI preserves frog mascot, independent organizational identity, disclosure and navigation',()=>{
 const html=load('index.html'),css=load('styles.css');
 assert.match(html,/data-cgma-ci="frog-market" aria-hidden="true"/);
 assert.match(html,/cgma-mascot">🐸<\/span>/);
 assert.match(html,/청계면상인회<\/b><small>CHEONGGYE MERCHANTS/);
 assert.match(html,/data-ekodi-header-home="cgma"/);
 assert.match(html,/href="#market-map"/);
 assert.match(html,/id="siteLanguage"/);
 assert.ok(css.includes('frog-market'));
 assert.doesNotMatch(html,/EKODI®|상표등록 완료/);
});
