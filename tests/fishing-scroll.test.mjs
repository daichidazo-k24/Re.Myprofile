import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {FISH_IMAGES} from '../js/fishing/data.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const css=readFileSync(resolve(root,'css/fishing.css'),'utf8');
const ui=readFileSync(resolve(root,'js/fishing/ui.js'),'utf8');
const controls=readFileSync(resolve(root,'js/ui/controls.js'),'utf8');
test('30 photos are preserved in original order',()=>{
 assert.equal(FISH_IMAGES.length,30);
 assert.deepEqual(FISH_IMAGES.map(x=>x.id),Array.from({length:30},(_,i)=>i+1));
});
test('gallery uses individually stacked rows with responsive columns and independent overflow',()=>{
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/overflow-y:auto;overflow-x:hidden/);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/overscroll-behavior:contain/);
});
test('gallery is given scroll priority over the 3D world',()=>{
 assert.match(ui,/isFishingOverlayActive/);
 assert.match(ui,/dialog\.addEventListener\('wheel'/);
 assert.match(ui,/event\.stopPropagation\(\)/);
 assert.match(ui,/grid\.scrollTop\+=event\.deltaY\*unit/);
 assert.match(controls,/if\(isFishingOverlayActive\(\)\|\|!state\.entered\)return/);
});
test('fishing images use local lazy-loaded assets rather than the legacy site',()=>{
 assert.match(ui,/img\.loading='lazy'/);
 assert.match(ui,/localPhoto\(entry\)/);
 assert.doesNotMatch(ui,/GALLERY_ORIGINAL|PHOTO_BASE|upgradePhotosWhenOpened/);
});
