import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {renderStageDocument} from '../js/ui/document.js';
import {STAGES} from '../js/data/stages.js';
import {PROJECTS_CONTENT} from '../js/content/projects.js';
import {PROFILE_CONTENT} from '../js/content/profile.js';
import {FISHING_CONTENT} from '../js/content/fishing.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(path)=>readFileSync(resolve(root,path),'utf8');

test('editable content exists as separate stage modules',()=>{
 for(const name of ['profile','skills','projects','quests','badges','links','fishing']){
  assert.ok(existsSync(resolve(root,`js/content/${name}.js`)));
 }
 assert.equal(renderStageDocument(0).includes(PROFILE_CONTENT.name),true);
 assert.equal(renderStageDocument(2).includes(PROJECTS_CONTENT.projects.at(-1).name),true);
 assert.equal(STAGES[5].id,'fishing');
 assert.equal(FISHING_CONTENT.imageCount,30);
});

test('no runtime code navigates to the retired portfolio or fishing page',()=>{
 const files=['index.html','js/ui/document.js','js/fishing/ui.js','js/fishing/data.js','js/content/links.js','js/data/portfolio.js'];
 for(const file of files){
  const source=read(file);
  assert.doesNotMatch(source,/daichidazo-k24\.github\.io\/My-Profile/,'legacy public URL in '+file);
  assert.doesNotMatch(source,/fish\.html|元の釣果ページ/,'legacy gallery page in '+file);
 }
 assert.match(read('index.html'),/href="\.\/" class="logotype"/);
 assert.doesNotMatch(renderStageDocument(2),/公開中の自己紹介サイト/);
});

test('GitHub Pages root and static file paths are ready for deployment',()=>{
 assert.ok(existsSync(resolve(root,'index.html')));
 assert.ok(existsSync(resolve(root,'.nojekyll')));
 assert.ok(existsSync(resolve(root,'js/main.js')));
 assert.ok(existsSync(resolve(root,'assets/miner.png')));
 assert.match(read('index.html'),/src="js\/main\.js"/);
 assert.doesNotMatch(read('index.html'),/src="\/(?:js|assets)\//);
});


test('Re.Myprofile release keeps fishing image directory empty until user adds photos',()=>{
 assert.ok(existsSync(resolve(root,'image/.gitkeep')));
 assert.ok(!existsSync(resolve(root,'assets/fishing')));
 const fishData=read('js/fishing/data.js');
 assert.match(fishData,/image\/fish/);
 assert.doesNotMatch(fishData,/assets\/fishing/);
 assert.match(read('js/content/links.js'),/github\.com\/daichidazo-k24\/Re\.Myprofile/);
 assert.ok(!existsSync(resolve(root,'README.md')));
});
