import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../'+name, import.meta.url),'utf8');

test('top-right status and left vertical story have been removed from layout',()=>{
  const html=read('index.html');
  assert.doesNotMatch(html,/class="top-right"/);
  assert.doesNotMatch(html,/id="sectorIndicator"/);
  assert.doesNotMatch(html,/id="renderMode"/);
  assert.doesNotMatch(html,/class="vertical-story"/);
  assert.match(html,/DAICHI PORTFOLIO WORLD/);
});

test('stage selection is visible in world view but hidden and non-interactive in focus mode',()=>{
  const html=read('index.html');
  const css=read('css/focus.css');
  const nav=read('js/ui/navigation.js');
  assert.match(html,/class="chapter-dock"/);
  assert.match(css,/body\.is-focus-mode \.chapter-dock\s*\{[^}]*opacity\s*:\s*0[^}]*visibility\s*:\s*hidden[^}]*pointer-events\s*:\s*none/);
  assert.match(nav,/document\.body\.classList\.toggle\('is-focus-mode',state\.focused\)/);
  assert.match(nav,/STAGES\[state\.active\]\.id==='fishing'\)return/);
});
