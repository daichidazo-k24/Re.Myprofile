import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAGES,STEP} from '../js/data/stages.js';
import {portfolio as p} from '../js/data/portfolio.js';
import {renderStageDocument} from '../js/ui/document.js';
import {state} from '../js/state.js';
import {registerBoard,scrollBoard,boardProgress,scrollToEnd,scrollToStart} from '../js/ui/board-scroll.js';
import {quadHomography,unprojectQuad} from '../js/scene/native-html-textures.js';
import {FISH_IMAGES,FISH_COUNT} from '../js/fishing/data.js';
import {existsSync} from 'node:fs';
import {FISH_WORLD} from '../js/fishing/scene.js';
import {fishingState,startCast,finishCast,resetCast} from '../js/fishing/state.js';

const baseIDs=['profile','skills','projects','quests','badges'];
test('original world keeps the five previous stages and their coordinates',()=>{
 assert.deepEqual(STAGES.slice(0,5).map(s=>s.id),baseIDs);
 assert.equal(STAGES.length,6);assert.equal(STAGES[5].id,'fishing');
 assert.deepEqual(STAGES.slice(0,5).map(s=>s.title),['PLAYER PROFILE','EQUIPPED ABILITIES','ITEM COLLECTION','ADVENTURE LOG','ACHIEVEMENTS']);
 assert.equal(STEP,13.5);
});
test('one continuous document per stage — no fixed slide boundaries',()=>{
 assert.equal(STAGES.length,6);
 STAGES.slice(0,5).forEach((s,i)=>{
  const html=renderStageDocument(i);
  assert.match(html,/class="board-document"/);
  assert.equal((html.match(/<article class="board-document"/g)||[]).length,1);
  assert.ok(!/data-slide=|PAGE_HEIGHT|class="native-card"/.test(html));
 });
});
test('all public profile information and original links are embedded in their categories',()=>{
 const docs=STAGES.slice(0,5).map(s=>renderStageDocument(s));
 for(const text of [p.name,p.romanName,p.school,p.course,p.tagline,...p.hobbies,...p.focus])assert.ok(docs[0].includes(text),text);
 for(const text of [...p.languages,...p.security,...p.producedWith])assert.ok(docs[1].includes(text),text);
 for(const pr of p.projects){for(const value of [pr.name,pr.description,pr.repo,...pr.tech])assert.ok(docs[2].includes(value),value)}
 for(const act of p.activities)assert.ok(docs[3].includes(act.name),act.name);
 for(const cert of p.qualifications)assert.ok(docs[4].includes(cert.name),cert.name);
 for(const url of [p.links.github,...p.socialLinks.map(x=>x.url)])assert.ok(docs[0].includes(url),url);
 assert.ok(docs[2].includes(p.links.mapDemo));
});
test('each board has an independent natural scroll limit and preserved position',()=>{
 const makeRegion=(max)=>({scrollTop:0,scrollHeight:max+560,clientHeight:560,addEventListener(){}});
 const profile=makeRegion(2700),projects=makeRegion(4200);
 registerBoard(0,profile);registerBoard(2,projects);
 scrollBoard(1300,0);scrollBoard(2130,2);
 assert.equal(state.scrollY[0],1300);
 assert.equal(state.scrollY[2],2130);
 scrollToEnd(0);assert.equal(state.scrollY[0],2700);assert.equal(boardProgress(0),1);
 assert.equal(state.scrollY[2],2130);
 scrollToStart(0);assert.equal(state.scrollY[0],0);
});
test('the perspective projection maps the HTML viewport to its intended screen quad',()=>{
 const quad=[[100,80],[600,100],[570,400],[80,360]];
 const a=quadHomography(quad,960,560);
 assert.equal(a.length,16);
 for(const [source,target] of [[ [0,0],quad[0] ],[[960,0],quad[1]],[[960,560],quad[2]],[[0,560],quad[3]]]){
  const [x,y]=source;
  const divisor=a[3]*x+a[7]*y+a[15];
  const px=(a[0]*x+a[4]*y+a[12])/divisor;
  const py=(a[1]*x+a[5]*y+a[13])/divisor;
  assert.ok(Math.abs(px-target[0])<.01,`${source} x ${px} != ${target[0]}`);
  assert.ok(Math.abs(py-target[1])<.01,`${source} y ${py} != ${target[1]}`);
  const inverse=unprojectQuad(a,target[0],target[1]);
  assert.ok(inverse&&Math.abs(inverse[0]-source[0])<.01&&Math.abs(inverse[1]-source[1])<.01);
 }
});
test('original WebGL terrain, camera, board frame and props remain present',()=>{
 const webgl=readFileSync(new URL('../js/scene/webgl.js',import.meta.url),'utf8');
 for(const fn of ['buildTerrain','drawStageProps','drawVoxelMiner','function board','introZoom','const focusEye'])assert.ok(webgl.includes(fn),fn);
 assert.match(webgl,/htmlBoards\.syncGeometry/);
 assert.match(webgl,/htmlBoards\?\.textures\[i\]/);
 assert.ok(!webgl.includes('PAGE_HEIGHT'));
});

test('sixth fishing stage is OUTSIDE the five original board documents and island geometry',()=>{
 const source=readFileSync(new URL('../js/scene/webgl.js',import.meta.url),'utf8');
 const cssScene=readFileSync(new URL('../js/scene/css3d.js',import.meta.url),'utf8');
 const native=readFileSync(new URL('../js/scene/native-html-textures.js',import.meta.url),'utf8');
 assert.equal(STAGES[5].id,'fishing');
 assert.equal(STAGES[5].title,'THE FISHING SPOT');
 assert.ok(FISH_WORLD.x>4*STEP);
 assert.match(source,/if\(STAGES\[i\]\.id==='fishing'\)/);
 assert.match(source,/for\(let st=0;st<STAGES\.length-1/);
 assert.match(cssScene,/fish-abyss/);
 assert.match(native,/STAGES\.slice\(0,BOARD_COUNT\)/);
 assert.throws(()=>renderStageDocument(5),/Unknown stage/);
});
test('fishing photo paths are reserved for locally provided images without legacy dependencies',()=>{
 assert.equal(FISH_IMAGES.length,30);
 assert.equal(FISH_COUNT,30);
 assert.equal(new Set(FISH_IMAGES.map(f=>f.id)).size,30);
 for(const image of FISH_IMAGES){
  assert.equal(image.src,`image/fish${image.id}.jpg`);
 }
});
test('cast, catch and release transitions are exclusive and repeatable',()=>{
 resetCast();assert.equal(fishingState.phase,'idle');
 assert.equal(startCast(100),true);assert.equal(startCast(200),false);
 finishCast();assert.equal(fishingState.phase,'caught');assert.equal(fishingState.opened,true);
 resetCast();assert.equal(fishingState.phase,'idle');assert.equal(fishingState.opened,false);
 assert.equal(startCast(400),true);
 resetCast();
});


test('each info board has a short heading attached OUTSIDE the scrollable document for BOTH renderers',()=>{
 const headings=['PROFILE / 自己紹介','SKILLS / 技術・学習領域','PROJECTS / 制作物','QUEST LOG / 学外活動','BADGES / 取得資格'];
 assert.deepEqual(STAGES.slice(0,5).map(s=>s.boardHeading),headings);
 const css3=readFileSync(new URL('../js/scene/css3d.js',import.meta.url),'utf8');
 const webgl=readFileSync(new URL('../js/scene/webgl.js',import.meta.url),'utf8');
 const sceneCss=readFileSync(new URL('../css/scene.css',import.meta.url),'utf8');
 assert.match(css3,/board-popup-title.*meta\.boardHeading/);
 assert.doesNotMatch(css3,/titleLayer\.appendChild/);
 assert.match(css3,/rotateY\(/);
 assert.match(webgl,/stage\.boardHeading/);
 assert.match(webgl,/titleTextures\[i\]/);
 assert.doesNotMatch(webgl,/title\.style\.left=/);
 assert.match(sceneCss,/board-popup-title/);
 assert.equal(STAGES[5].boardHeading,undefined);
});
