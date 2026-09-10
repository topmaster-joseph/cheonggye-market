import test from 'node:test';
import assert from 'node:assert/strict';
import {storeAliasKey,canonicalStoreKey,buildAliasIndex,resolveIdentity} from './functions/_shared/cgma-store-identity.js';
test('normalizes legacy names but prefers stable store id',()=>{assert.equal(storeAliasKey('자담치킨 목포대점'),'자담치킨');assert.equal(canonicalStoreKey('ABC-123'),'id:abc-123');});
test('maps one known alias to canonical identity',()=>{const index=buildAliasIndex([{store_id:'s1',alias_key:'가게a'}]);assert.equal(resolveIdentity({store_key:'가게a'},index),'id:s1');assert.equal(resolveIdentity({store_id:'s2',store_key:'가게b'},index),'id:s2');});
test('does not collapse ambiguous aliases',()=>{const index=buildAliasIndex([{store_id:'s1',alias_key:'공통'},{store_id:'s2',alias_key:'공통'}]);assert.equal(resolveIdentity({store_key:'공통'},index),'공통');});
