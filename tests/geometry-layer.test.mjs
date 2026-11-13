import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {minerModel,minerPose} from '../js/scene/miner-pose.js';
import {ROD_POINTS,FISH_WORLD,segmentGeometry} from '../js/fishing/scene.js';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the board is one physical HTML-textured WebGL quad: depth is natural and nothing is redrawn',()=>{
 const world=file('js/scene/webgl.js');
 const native=file('js/scene/native-html-textures.js');
 const html=file('index.html');
 assert.match(html,/id="worldCanvas" content="drawable"/);
 assert.match(world,/htmlBoards\?\.textures\[i\]/);
 assert.match(world,/gl\.enable\(gl\.DEPTH_TEST\)/);
 assert.match(world,/htmlBoards\.uploadPending/);
 assert.match(world,/htmlBoards\.syncGeometry/);
 assert.match(native,/texElementSubImage2D/);
 assert.match(native,/canvas\.updateElementGeometry/);
 assert.doesNotMatch(world,/createForegroundOcclusion|occlusion\.render|liveBoards\.project/);
 assert.doesNotMatch(world,/draw\(terrainMesh[\s\S]*draw\(terrainMesh/);
 const pose=minerPose(2,1.3),matrix=minerModel(2,1.3);
 assert.equal(matrix[12],Math.fround(pose.x));
 assert.equal(matrix[13],Math.fround(pose.y));
 assert.equal(matrix[14],Math.fround(pose.z));
});

test('the rod is a connected chain and its tip shares the fishing-line attachment coordinate',()=>{
 assert.equal(ROD_POINTS.length,4);
 const tip=ROD_POINTS.at(-1);
 assert.ok(Math.abs(FISH_WORLD.hookX-(FISH_WORLD.x+tip[0]))<1e-9);
 assert.equal(FISH_WORLD.hookZ,tip[2]);
 assert.equal(FISH_WORLD.rodTipY,tip[1]);
 for(let i=0;i<ROD_POINTS.length-1;i++){
  const a=ROD_POINTS[i],b=ROD_POINTS[i+1],s=segmentGeometry(a,b);
  assert.ok(s.length>0);
  assert.ok(Math.abs((s.x-Math.sin(s.angle)*s.length/2)-b[0])<1e-9);
  assert.ok(Math.abs((s.y+Math.cos(s.angle)*s.length/2)-b[1])<1e-9);
 }
 const scene=file('js/fishing/scene.js');
 assert.match(scene,/const lineLen=Math\.max\(\.12,tip\[1\]-hookY\)/);
 const fallback=file('js/fishing/ui.js');
 assert.match(fallback,/x="190" y="8" width="16" height="16"/);
 assert.match(fallback,/M198 16 V208/);
});

test('the bottom-left instructions were deleted without removing stage navigation buttons',()=>{
 const html=file('index.html');
 const css=file('css/focus.css');
 assert.doesNotMatch(html,/controller-hint/);
 assert.match(html,/class="chapter-dock"/);
 assert.match(html,/id="focusBtn"/);
 assert.match(css,/\.bottom-hud\{justify-content:flex-end\}/);
});
