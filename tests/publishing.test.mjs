import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {renderStageDocument} from '../js/ui/document.js';
import {STAGES,STAGE_INDEX} from '../js/data/stages.js';
import {PROJECTS_CONTENT} from '../js/content/projects.js';
import {PROFILE_CONTENT} from '../js/content/profile.js';
import {FISHING_CONTENT} from '../js/content/fishing.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(path)=>readFileSync(resolve(root,path),'utf8');

test('editable content exists as separate stage modules',()=>{
 for(const name of ['profile','projects','quests','badges','links','fishing']){
  assert.ok(existsSync(resolve(root,`js/content/${name}.js`)));
 }
 assert.equal(renderStageDocument(0).includes(PROFILE_CONTENT.name),true);
 assert.equal(renderStageDocument(STAGE_INDEX.projects).includes(PROJECTS_CONTENT.projects.at(-1).name),true);
 assert.equal(STAGES.at(-1).id,'fishing');
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
 assert.doesNotMatch(renderStageDocument(STAGE_INDEX.projects),/公開中の自己紹介サイト/);
});

test('GitHub Pages root and static file paths are ready for deployment',()=>{
 assert.ok(existsSync(resolve(root,'index.html')));
 assert.ok(existsSync(resolve(root,'.nojekyll')));
 assert.ok(existsSync(resolve(root,'js/main.js')));
 assert.ok(existsSync(resolve(root,'assets/miner.png')));
 assert.match(read('index.html'),/src="js\/main\.js"/);
 assert.doesNotMatch(read('index.html'),/src="\/(?:js|assets)\//);
});


test('gallery assets use separate FishingImage and GraphicImage folders',()=>{
 assert.ok(existsSync(resolve(root,'FishingImage/.gitkeep')));
 assert.ok(!existsSync(resolve(root,'assets/fishing')));
 assert.ok(existsSync(resolve(root,'GraphicImage/.gitkeep')));
 assert.ok(!existsSync(resolve(root,'image')));
 const fishData=read('js/fishing/data.js');
 assert.match(fishData,/FishingImage\/fish/);
 assert.doesNotMatch(fishData,/assets\/fishing/);
 assert.match(read('js/content/links.js'),/github\.com\/daichidazo-k24\/Re\.Myprofile/);
});
