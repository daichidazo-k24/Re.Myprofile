import {STAGE_INDEX,STAGES,STEP} from '../data/stages.js';
import {OBSERVATORY,buildRooftopStructure} from './observatory-layout.js';
import {fallenFruit} from './island-lighting.js';

// The same cuboids form the island in WebGL and CSS3D.
const stone = ['#313945', '#414856', '#596374', '#687581'];
const soil = ['#3b3535', '#4a4139', '#554b3e', '#655a45'];
const moss = ['#30483a', '#3e5f46', '#517851', '#7b9d61'];
const bark = ['#382a30', '#553c36', '#714b38', '#956443'];
const cedar = ['#554039', '#89593f', '#b67d4f', '#e3b477'];
const roof = ['#392c3c', '#663f4b', '#9d5652', '#bf725d', '#e49b6b'];
const leaves = ['#25483f', '#356654', '#4b886c', '#77a57a'];
const TREEHOUSE_BASE = 2.35;
const TREEHOUSE_STRETCH = 1.4;
const TREEHOUSE_BACK = -2.6;
const westEdge = -8.35;
const eastEdge = STAGE_INDEX.badges * STEP + 8.2;
const bankHeight = {profile:1,projects:1.12,quests:1.18,badges:1};
const islandTip=-10.7;
export const TREEHOUSE_TOP=TREEHOUSE_BASE+9.95*TREEHOUSE_STRETCH;

// Each strip narrows the west and east ends by a different amount. The flat
// approach to the fishing pier is left inside the east shoreline.
const shoreline=[
 [-5.35,2.06,1.08],[-3.9,1.38,.74],[-2.46,.62,.53],[-.93,.19,.29],
 [.68,0,0],[1.96,.28,0],[3.08,.67,0],[3.32,1.09,0],
 [3.91,1.09,.42],[4.22,1.46,.76],[Infinity,2.02,1.35],
];

function shoreBlocks(block,wLimit,eLimit,relief,x,y,z,w,h,d,color,emissive){
 if(x>=wLimit+2.06*relief&&x+w<=eLimit-1.35*relief){
  block(x,y,z,w,h,d,color,emissive);
  return;
 }
 const end=z+d;
 let start=-Infinity;
 for(const [stop,westInset,eastInset] of shoreline){
  const near=Math.max(start,z),far=Math.min(stop,end);
  if(far-near>1e-5){
   const left=Math.max(x,wLimit+westInset*relief);
   const right=Math.min(x+w,eLimit-eastInset*relief);
   if(right-left>1e-5)block(left,y,near,right-left,h,far-near,color,emissive);
  }
  if(stop>=end)break;
  start=stop;
 }
}

// Each cut lists its left and right edges, setback from the shore, and depth.
const terrain = {
 profile: {
  back: -6.47, front: 4.83, cut: [-1.8, 1.25, 1.26, .86],
  turf: [[-6.74, -.96, 2.75, 5.1, 1], [-4.86, 3.52, 5.7, .95, 1], [.83, 4.1, 3.43, .58, 2],
   [3.52, -5.7, 3.23, 4.62, 0], [4.02, -1.12, 2.73, 2.5, 1]],
  grass: [[-6.53, 3.7, 1], [-5.1, .46, 1], [-3.54, 3.86, 2], [-1.84, 4.19, 1],
   [1.44, 4.25, 0], [3.58, 4.36, 2], [4.1, -.51, 1], [6.2, -1.67, 2]],
 },
 projects: {
  back: -6.96, front: 4.88, cut: [-1.9, 1.7, 1.57, 1.15],
  turf: [[-6.74, -.96, 2.75, 5.1, 1], [-4.86, 3.52, 5.7, .95, 1], [.83, 4.1, 3.43, .58, 2],
   [3.52, -5.7, 3.23, 4.62, 0], [4.02, -1.12, 2.73, 2.5, 1]],
  grass: [[-6.53, 3.7, 1], [-5.1, .46, 1], [-3.54, 3.86, 2], [-1.84, 4.19, 1],
   [1.44, 4.25, 0], [3.58, 4.36, 2], [4.1, -.51, 1], [6.2, -1.67, 2]],
 },
 quests: {
  back: -7.38, front: 4.92, cut: [-1.8, 2.0, 1.74, 1.35],
  turf: [[-6.75, -5.7, 4.28, 6.28, 1], [-6.74, .57, 2.2, 4.17, 2], [-4.53, 3.25, 4.71, 1.44, 1],
   [.18, 3.72, 6.56, .93, 2], [.75, -5.7, 6, 1.16, 1], [3.21, -.24, 1.74, 3.69, 1]],
  grass: [[-6.56, 3.54, 2], [-4.59, 3.31, 1], [-3.83, 4.18, 2], [-2.15, 4.29, 0],
   [-.66, 4.5, 1], [1.8, 3.98, 1], [3.82, 4.1, 2], [5.12, 4.2, 1], [6.04, 4.35, 0]],
 },
 badges: {
  back: -8, front: 4.98, cut: [-2.15, 2.3, 1.85, 1.56],
  turf: [[-6.75, 3.25, 3.35, 1.51, 2], [-6.75, -5.7, 3.4, 4.9, 1],
   [-3.42, 4.01, 6.82, .79, 1], [-2.4, -5.78, 6.92, 2.2, 0],
   [3.4, -5.65, 4.19, 5.05, 1], [3.41, -.6, 4.15, 3.78, 2], [3.41, 3.18, 3.44, 1.66, 1]],
  grass: [],
 },
};

export function buildIslandLandscape(add) {
 buildIslandFoundation(add);
 for(const [index,stage] of STAGES.entries()) {
  if(stage.id==='fishing') continue;
  buildStageIsland(stage.id,(x,y,z,w,h,d,c,emissive)=>add(index*STEP+x,y,z,w,h,d,c,emissive));
 }
}

function buildIslandFoundation(add) {
 const block = (x,y,z,w,h,d,c)=>add(x+w/2,y+h/2,z+d/2,w,h,d,c);
 // One mass narrows along both axes as its rock courses descend toward the tip.
 const strata = [
  [-.54,-1.81, .12,.1, -7.43,3.06, soil[1]],
  [-1.79,-2.98, .83,1.03, -6.32,4.12, soil[0]],
  [-2.96,-4.34, 3.7,3.21, -5.98,3.75, soil[0]],
  [-4.32,-5.69, 7.45,7.08, -5.61,2.91, '#3d3b42'],
  [-5.67,-7.03, 12.2,12.01, -5.08,2.05, '#31343c'],
  [-7.01,-8.29, 17.26,17.08, -4.51,.7, '#303e59'],
  [-8.27,-9.35, 21.48,21.89, -4.1,-.5, '#27344e'],
  [-9.33,-10.18, 25.29,25.33, -3.73,-1.45, '#25334a'],
  [-10.16,islandTip, 27.55,27.2, -3.33,-2.21, '#3d4862'],
 ];
 for(const [index,[top,bottom,insetLeft,insetRight,back,front,color]] of strata.entries()){
  const left=westEdge+insetLeft,right=eastEdge-insetRight;
  const relief=Math.max(.28,1-index*.092);
  shoreBlocks(block,left,right,relief,left,bottom,back,right-left,top-bottom,front-back,color);
  if(index===0)continue;
  // Most of the visible face is soil. Isolated pieces of shale show through.
  const plates=Math.max(1,Math.floor((right-left)/4.45));
  for(let j=0;j<plates;j++){
   const width=(right-left)/plates;
   const x=left+j*width+width*.08;
   const h=.33+((index*7+j*3)%5)*.12;
   const y=top-h-.06;
   const depth=.24+((j+index)%3)*.13;
   shoreBlocks(block,left,right,relief,x,y,front-.09,width*.7,h,depth,j%3===0?stone[1]:soil[1]);
   if(index<=3&&(j+index)%3===0)shoreBlocks(block,left,right,relief,x+width*.27,y+.09,front+depth-.05,.34,.13,.09,moss[1]);
   if(index<5&&j%2===0)shoreBlocks(block,left,right,relief,x+width*.09,y+.04,back-.18,width*.43,h*.67,.22,soil[0]);
  }
 }
}

function buildShoreDetail(stage,block){
 // Short shelves continue into the soil at different heights, with roots
 // wrapping around the rounded shoulders instead of tracing a straight frame.
 if(stage==='profile'){
  for(const [x,y,z,w,h,d,shade] of [
   [-7.62,-.88,-4.12,1.36,.51,.82,1],[-8.04,-1.06,-2.86,1.15,.64,.99,2],
   [-8.43,-.82,-1.71,.94,.62,.65,1],[-8.38,-1.35,-.49,1.09,.88,.97,0],
   [-8.19,-1.37,.79,.98,.94,.92,1],[-7.88,-1.09,2.22,.79,.72,.66,1],
   [-7.46,-1.17,3.17,.78,.74,.63,2],[-6.94,-1.13,4.09,.76,.67,.56,1],
  ])block(x,y,z,w,h,d,soil[shade]);
  for(const [x,y,z,w,h,d,c] of [
   [-7.58,-.06,.62,.46,.27,1.18,bark[2]],[-8.09,-.26,.82,.67,.32,.71,bark[1]],
   [-8.15,-.73,.88,.36,.65,.57,bark[2]],[-7.96,-1.07,1.06,.32,.44,.39,bark[1]],
   [-7.42,-.06,2.36,.53,.22,.55,moss[1]],[-7.11,-.28,3.23,.46,.33,.37,moss[0]],
  ])block(x,y,z,w,h,d,c);
 }
 if(stage==='badges'){
  for(const [x,y,z,w,h,d,shade] of [
   [6.67,-1.21,-6.72,.79,.84,.9,1],[7.17,-.94,-4.8,.72,.6,.76,2],
   [7.48,-1.5,-3.17,.87,1.02,.63,1],[7.52,-.91,-1.66,.89,.63,.62,1],
   [7.13,-1.06,3.46,.83,.72,.58,0],[6.54,-.82,4.3,.69,.51,.59,1],
  ])block(x,y,z,w,h,d,soil[shade]);
 }
}

function buildProfileRidge(block, back, front) {
 const tiers = [[1, .17], [.76, .4], [.51, .69], [.24, 1]];
 let start = back + .32;
 for (const [stop, inset] of shoreline) {
  const end = Math.min(stop, front - .16);
  const depth = end - start;
  const x = westEdge + inset + .045;
  const rise = 1.5 * (1.22 - Math.abs((start + end) / 2 + .18) * .174);
  let width = 1.66 - inset * .42;
  // The bank drops before it reaches the miner's pedestal.
  if (start < 3.45 && end > 1.15) width = Math.min(width, -7.02 - x);
  let floor = -.14;
  for (const [span, height] of tiers) {
   const top = rise * height;
   block(x, floor, start, width * span, top - floor, depth, soil[2]);
   block(x, top, start + .028, width * span, .026, depth - .056, moss[0]);
   floor = top;
  }
  start = end;
 }
}

export function buildStageIsland(stage, add) {
 const {back, front, cut, turf, grass} = terrain[stage];
 const [cutLeft, cutRight, cutDepth, drop] = cut;
 const bank = front - cutDepth;
 const block = (x, y, z, w, h, d, color, emissive) => add(x + w / 2, y + h / 2, z + d / 2, w, h, d, color, emissive);
 const left = stage === 'profile' ? westEdge : -6.75;
 const right = stage === 'badges' ? 8.2 : 6.75;
 const width = right - left;
 const rimBlock=(x,y,z,w,h,d,c)=>{
  if(stage==='profile'||stage==='badges'){
   shoreBlocks(block,stage==='profile'?left:-Infinity,stage==='badges'?right:Infinity,y<-.5 ? .88 : 1,x,y,z,w,h,d,c);
  }else block(x,y,z,w,h,d,c);
 };

 // The rim sits on the common rock mass and breaks at each ravine.
 rimBlock(left + .14, -1.81, back + .12, width - .28, 1.31, bank - back - .12, soil[1]);
 rimBlock(left, -.54, back, width, .44, bank - back, soil[2]);
 for (const [start, end] of [[left, cutLeft], [cutRight, right]]) {
  rimBlock(start + .22, -2.18, bank - .37, end - start - .4, 1.68, cutDepth + .09, soil[0]);
  rimBlock(start, -.54, bank, end - start, .44, cutDepth, soil[2]);
  rimBlock(start+.05, -.23, front-.32, end-start-.1, .24, .39, moss[0]);
  rimBlock(start+.38, -.04, front-.46, (end-start)*.51, .11, .29, moss[1]);
 }
 rimBlock(left+.28, -.33, back+.02, width-.56, .48, .58, moss[0]);
 buildShoreDetail(stage,block);
 if (stage === 'profile') buildProfileRidge(block, back, front);
 block(cutLeft, -drop - .92, bank - .12, cutRight - cutLeft, .82, cutDepth - .12, soil[0]);
 block(cutLeft + .2, -drop - .1, bank, cutRight - cutLeft - .4, .13, cutDepth - .4, moss[0]);

 // Split coats at the cut so moss and paving follow the actual rock surface.
 const pave = (paint,x,y,z,w,h,d,color)=>{
  const end = x + w;
  if (z < bank) paint(x, y, z, w, h, Math.min(d, bank - z), color);
  if (z + d <= bank) return;
  const frontZ = Math.max(z, bank);
  for (const [start, stop, offset] of [[left, cutLeft, 0], [cutLeft, cutRight, -drop], [cutRight, right, 0]]) {
   const from = Math.max(x, start), to = Math.min(end, stop);
   if (to > from) paint(from, y + offset, frontZ, to - from, h, z + d - frontZ, color);
  }
 };
 const surface=(...args)=>pave(rimBlock,...args);
 surface(left + .12, -.12, back+.46, width-.24, .16, front-back-.55, moss[0]);
 surface(left + 1.21, .035, -2.93, width - 2.46, .026, 5.7, soil[2]);
 surface(left + 3.18, -.12, 2.77, width - 6.2, .17, .86, moss[1]);
 for (const [x, drop, w] of [[left + 1.05, .45, .74], [-2.21, 1.04, .92], [1.38, .49, .65], [4.11, .43, 1.08]]) {
  const atBank = x + w > cutLeft && x < cutRight;
  rimBlock(x, -drop, atBank ? bank : front, w, .22, .11, stone[3]);
 }
 for (const [x, z, w, d, shade] of turf) {
  surface(x, -.12, z, w, .19, d, moss[shade]);
  surface(x + .29, .07, z + .12, Math.min(w - .33, .84), .06, .21, moss[shade + 1]);
 }
 for (const [x, z, shade] of grass) {
  surface(x, -.1, z, .5, .3, .31, moss[shade]);
  surface(x + .13, .2, z + .05, .25, .18, .2, moss[shade + 1]);
 }
 const heightScale=bankHeight[stage];
 const tallBlock=(x,y,z,w,h,d,color)=>{
  const floor=y<0?y:y*heightScale;
  const top=y+h>0?(y+h)*heightScale:y+h;
  block(x,floor,z,w,top-floor,d,color);
 };
 buildTerraces(stage, tallBlock);
 buildWoodland(stage,block,surface);
 buildCliffRoots(stage,front,block);
 if (stage === 'profile') buildExposedRoots(block);
 if (stage === 'quests') buildQuestGrove(tallBlock);
 if (stage === 'badges') {
  buildTreehouse(block,(...args)=>pave(block,...args));
  const badgeX=OBSERVATORY.rightStage*STEP;
  buildRooftopStructure((x,y,z,w,h,d,color)=>add(x-badgeX,y,z,w,h,d,color));
 }
 buildFallenFruit(stage,block,surface);
}

function buildCliffRoots(stage,front,block) {
 const rootX={profile:-5.37,projects:-4.46,quests:3.55,badges:5.19}[stage];
 const direction=stage==='badges'?-1:1;
 block(rootX,-1.21,front-.4,.65,1.38,.53,bark[2]);
 block(rootX+direction*.29,-2.46,front-.73,.59,1.34,.36,bark[1]);
 block(rootX+direction*.53,-3.53,3.84,.45,1.18,.36,bark[2]);
 block(rootX+direction*.71,-4.22,3.68,.31,.76,.25,bark[0]);
 block(rootX-.43,-.21,front-.16,1.18,.33,.31,leaves[1]);
 block(rootX-.66,-.57,front-.15,.76,.39,.37,leaves[0]);
 block(rootX-.52,-1.01,front-.11,.44,.48,.29,moss[1]);
 block(rootX-.32,-1.26,front-.16,.27,.33,.24,leaves[0]);
}

function buildExposedRoots(block) {
 // Start at the former Projects level of interwoven stone and roots.
 for (const [x, y, z, w, h, d, c] of [
  [-6.51, -.13, 3.43, 2.18, .29, .8, bark[1]], [-4.62, -.12, 2.92, 1.61, .34, .83, bark[2]],
  [-3.29, -.12, 2.16, 1.44, .36, .94, bark[2]], [-2.04, -.18, 1.74, 1.55, .32, .67, bark[1]],
  [-5.68, -.65, 4.12, .9, .72, .71, bark[2]], [-5.88, -1.3, 4.12, .74, .65, .39, bark[1]],
  [2.98, -.14, -4.88, 3.79, .42, .89, bark[1]], [3.28, .04, -4.72, 1.77, .27, .47, bark[2]],
  [5.16, .04, -4.45, 1.57, .38, .73, bark[2]], [5.55, .37, -4.45, .72, .53, .63, bark[3]],
 ]) block(x, y, z, w, h, d, c);
}

// Tall crowns stagger the skyline. The gaps in front stay available to each board.
const woodland = {
 profile: [[-6.1,-3.35,.18,8.2,3.7],[-1.9,-6.66,.05,7.25,3.45],[5.81,-5.47,.1,9.8,4.05]],
 projects: [[-5.86,-3.98,.16,10.3,4.25],[.5,-7.12,.14,8.6,3.66],[5.49,-5.62,.06,11.25,4.2]],
 quests: [[-5.95,-4.94,.18,12.65,4.3],[-1.94,-7.04,.13,10.35,4.05],[3.66,-6.85,.12,12.05,3.67]],
 badges: [[-3.62,-7.46,1.1,11.25,3.25],[7.79,-7.75,.5,13.05,3.45]],
};

function buildWoodland(stage,block,surface){
 for(const [x,z,base,height,span] of woodland[stage]){
  const radius=span*.31;
  block(x-.54,base,z-.43,1.04,height*.41,.92,bark[2]);
  block(x-.39,base+height*.4,z-.49,.79,height*.32,.76,bark[1]);
  block(x-.21,base+height*.70,z-.56,.54,height*.23,.64,bark[2]);
  block(x-.94,base-.11,z-.36,1.76,.45,1.22,bark[1]);
  block(x-.38,base-.06,z+.53,.72,.27,.84,bark[2]);
  block(x-radius,base+height*.49,z-.46,radius+.28,.55,.63,bark[2]);
  block(x-radius-.11,base+height*.53,z-.49,.55,height*.22,.67,bark[1]);
  block(x+.2,base+height*.6,z-.67,radius,.58,.59,bark[2]);
  block(x+radius-.21,base+height*.62,z-.72,.57,height*.17,.64,bark[1]);
 }

 // Ferns and leafy banks occupy the spaces between the tall trunks and lamps.
 for(const [x,z,shade] of [[-6.3,3.04,0],[-4.55,3.69,1],[-3.17,.7,0],[2.32,3.42,1],[4.21,1.36,0],[5.92,4.19,1]]){
  surface(x,-.08,z,.82,.23,.45,leaves[shade]);
  surface(x+.13,.11,z+.08,.55,.26,.31,leaves[shade+1]);
  surface(x+.34,.29,z+.09,.25,.23,.24,leaves[shade+2]);
 }
}

function buildFallenFruit(stage,block,surface){
 for(const [x,z,floor] of fallenFruit[stage]){
  // A handful of small faces sample the light close to the fruit.
  const patches=[[-.82,-.4,.71,.68],[-.43,-.84,.78,.49],[.26,-.65,.57,.48],
   [.36,-.24,.64,.6],[-.61,.24,.57,.59],[-.06,.28,.72,.53],[-.25,-.28,.55,.55]];
  for(const [i,[dx,dz,w,d]] of patches.entries()){
   surface(x+dx,floor-.081+i*.002,z+dz,w,.082,d,i%2?moss[1]:soil[2]);
  }
  block(x-.23,floor,z-.17,.46,.15,.34,'#966037');
  block(x-.2,floor+.1,z-.18,.4,.22,.36,'#f5ad53',true);
  block(x-.14,floor+.29,z-.13,.29,.075,.27,'#e4a259',true);
  block(x-.145,floor+.154,z+.182,.29,.119,.032,'#ffe186',true);
  block(x-.05,floor+.193,z+.216,.095,.077,.018,'#fff4b7',true);
  block(x+.015,floor+.346,z-.038,.083,.11,.08,'#a3834a');
  surface(x-.47,floor+.012,z+.22,.065,.022,.065,'#edac58');
  surface(x+.37,floor+.016,z+.09,.075,.028,.069,'#e3a253');
 }
}

const terraces = {
 profile: [
  [-7.64, -.12, -3.78, 2.62, 1.16, 4.55, 2],
  [-7.43, 1.02, -3.66, 2.21, .96, 3.62, 1],
  [-7.16, 1.96, -3.57, 1.64, .89, 2.71, 2],
  [4.46, -.12, -6.29, 2.44, 1.2, 4.75, 1],
  [4.76, 1.06, -6.18, 2.12, 1.03, 3.71, 2],
  [5.21, 2.07, -6.04, 1.45, 1.08, 2.64, 1],
 ],
 projects: [
  [-6.73, -.12, -4.76, 2.69, 1.16, 5.46, 1],
  [-6.68, 1.02, -4.64, 2.17, 1.02, 4.43, 2],
  [-6.42, 2.02, -4.59, 1.61, 1.02, 3.57, 1],
  [3.52, -.12, -6.31, 3.24, 1.51, 4.65, 2],
  [3.98, 1.37, -6.34, 2.73, 1.48, 4.13, 1],
  [4.43, 2.83, -6.27, 2.25, 1.51, 3.11, 2],
  [-3.4, -.12, -6.82, 5.45, 1.21, 2.62, 1],
  [-3.08, 1.07, -6.78, 4.39, 1.1, 2, 2],
 ],
 quests: [
  [-6.76, -.12, -5.71, 3.57, 1.15, 6.22, 1],
  [-6.69, 1.01, -5.7, 3.17, 1.04, 5.11, 2],
  [-6.45, 2.03, -5.52, 2.69, .69, 2.2, 1],
  [-3.45, -.12, -7.16, 7.09, 1.33, 3.6, 1],
  [-3.14, 1.19, -7.19, 6.22, 1.4, 3.09, 2],
  [-2.68, 2.57, -7.22, 4.99, 1.47, 2.67, 1],
  [-2.11, 4.02, -7.17, 3.13, 1.12, 1.98, 2],
 ],
 badges: [
  [-5.14, -.12, -7.6, 9.61, 1.34, 4.08, 2],
  [-4.9, 1.2, -7.69, 9.5, 1.56, 3.68, 1],
  [-4.48, 2.74, -7.82, 8.67, 1.73, 3.3, 2],
  [-3.96, 4.45, -7.68, 7.66, 1.67, 2.64, 1],
  [-3.22, 6.1, -7.4, 4.52, 1.38, 1.98, 2],
  [4.31, -.12, -7.79, 3.46, 1.12, 4.87, 1],
  [4.55, .98, -7.66, 3.08, TREEHOUSE_BASE - .98, 4.47, 2],
 ],
};

function buildTerraces(stage, block) {
 // Rooted banks carry grass and hanging plants, with stone only in small cuts.
 for (const [x, y, z, w, h, d, shade] of terraces[stage]) {
  block(x, y, z, w, h, d, soil[shade]);
  block(x + .14, y + h - .13, z + .23, w - .28, .26, d - .17, moss[shade]);
  block(x + w * .13, y + h * .27, z + d - .04, Math.min(.68, w * .26), .22, .13, stone[shade]);
  block(x + w * .59, y + h * .45, z + d - .02, w * .33, h * .48, .28, leaves[1]);
  block(x + w * .63, y + h * .31, z + d + .06, w * .18, h * .28, .16, leaves[0]);
 }

 if (stage === 'profile') {
  block(-6.74, 1.01, -.7, .79, 1.13, 1.06, bark[2]);
  block(-6.86, .44, -.22, .67, .76, 1.14, bark[1]);
  block(-6.6, -.13, .82, .52, .62, 2.66, bark[2]);
  block(5.45, 1.93, -3.67, .69, 1.3, .52, bark[2]);
  block(5.58, 3.15, -4.46, .84, .39, 1.21, bark[3]);
  block(5.62, 3.46, -5.31, .71, .52, 1.12, bark[2]);
  return;
 }

 if (stage === 'projects') {
  // A root crosses the front of the shelves and forks at the middle ledge.
  for (const [x, y, z, w, h, d, c] of [
   [-6.2, -.15, .55, .72, .35, 2.87, bark[1]], [-6.16, -.13, -.51, .68, .84, 1.21, bark[2]],
   [-6.47, .48, -.99, .71, 1.61, .79, bark[2]],
   [-6.37, 1.87, -2.1, .67, .47, 1.31, bark[3]],
   [-5.86, -.14, 3.21, 2.42, .33, .73, bark[2]], [-4.08, -.13, 2.73, 1.4, .24, .61, bark[1]],
   [5.4, -.13, -2.18, .66, 1.38, 1.12, bark[1]],
   [5.45, .68, -2.96, .62, 1.73, .92, bark[2]],
   [5.09, 1.52, -3.91, 1.41, 1.52, 1.28, bark[2]],
  ]) block(x, y, z, w, h, d, c);
  block(5.3, 3.91, -5.54, 1.11, .93, 1.18, bark[2]);
  block(-5.91, 2.91, -3.97, .99, .48, 1.47, bark[3]);
 }
}

function buildQuestGrove(block) {
 // The grove grows out of the upper left ledge. The right side is the ladder approach.
 const ledge = 2.59;
 for (const [x, y, z, w, h, d, c] of [
  [-6.23, -.14, -4.37, 2.5, .41, 1.3, bark[1]], [-5.65, .13, -4.62, 1.79, 1.35, 1.53, bark[2]],
  [-5.42, 1.48, -4.76, 1.37, 1.42, 1.26, bark[1]], [-5.21, 2.9, -4.82, 1.23, 1.27, 1.18, bark[2]],
  [-4.44, 3.34, -4.83, 1.7, .64, .96, bark[2]], [-3.54, 3.92, -4.98, 1.37, .53, .82, bark[3]],
 ]) block(x, y + ledge, z, w, h, d, c);
 for (const [x, y, z, w, h, d, c] of [
  [-5.34, 1.88, -3.31, 1.55, .8, 1.64, bark[2]], [-4.87, .94, -1.78, 1.23, 1.11, 1.49, bark[2]],
  [-4.43, -.11, -.49, 1.06, 1.27, .79, bark[1]],
  [-4.13, -.11, -.19, 1.1, .29, 1.55, bark[1]], [-3.47, -.13, 1.26, 1.9, .23, .67, bark[2]],
  [-2.32, 2.74, -5.12, 3.64, .37, .77, bark[1]], [.82, 1.23, -4.68, 1.47, 1.66, .83, bark[2]],
  [1.88, -.14, -4.88, 2.15, .44, 1.03, bark[1]], [3.75, -.14, -5.11, 3, .37, .71, bark[2]],
 ]) block(x, y, z, w, h, d, c);
}

export function islandTreePlanes(){
 const trees=[];
 for(const [index,stage] of STAGES.entries()){
  if(stage.id==='fishing')continue;
  const id=stage.id,back=terrain[id].back;
  const add=(kind,x,y,z,width,height,tone,variant,yaw=0)=>{
   trees.push({kind,x:index*STEP+x,y,z,width,height,tone,variant,yaw});
  };
  // Stack pale far silhouettes behind darker woods. Their feet stay on the island.
  add('grove',-.76,4.45,back+.12,11.9,8.9,'far',index%3);
  add('grove',1.51,3.54,back+.57,8.4,7.08,'middle',(index+2)%3);
  for(const [tree,[x,z,floor,height,span]] of woodland[id].entries()){
   const variant=(tree+index)%3,kind=tree===1?'pine':'crown';
   const y=floor+height*(kind==='pine' ? .60 : .845);
   const h=height*(kind==='pine' ? .95 : .38);
   const w=span*(kind==='pine' ? .78 : 1.2);
   add(kind,x-.19,y+.12,z-.5,w*.99,h*.97,'middle',(variant+1)%3);
   add(kind,x+.12,y,z+.48,w,h,'near',variant);
   add(kind,x,y-.09,z-.13,w*.83,h*.91,'near',(variant+2)%3,tree%2===0 ? .92 : -1.01);
  }
  if(id==='profile')add('crown',5.98,4.12,-5.08,2.3,1.28,'near',2,.18);
  if(id==='projects'){
   add('crown',5.52,5.47,-5.0,2.6,1.65,'near',0,.13);
   add('crown',-5.62,3.86,-3.31,2.4,1.39,'near',1,-.21);
  }
  if(id==='quests')add('crown',-4.74,8.02,-4.21,3.94,2.36,'near',2,.2);
 }
 return trees;
}

function buildTreehouse(ground, surface) {
 // Old blue flagstones and amber fragments are set into the forest floor.
 for (const [x, z, w] of [[-3.55, 3.38, 1.15], [-2.15, 2.85, 1.15], [-.75, 2.31, 1.2],
  [.66, 1.78, 1.1], [1.98, 1.3, 1], [3.18, .84, .72]]) {
  surface(x, -.1, z, w, .23, .63, stone[2]);
  surface(x, .13, z, w - .18, .05, .14, stone[3]);
 }
 for (const [x, y, z] of [[-4.15, -.78, 4.16], [2.68, -.44, 4.91], [5.46, .08, 3.46]])
  ground(x, y, z, .28, .12, .16, cedar[3]);

 // Roots spread across the platform, then turn down through the cliff blocks.
 for (const [x, y, z, w, h, d, c] of [
  [-6.75, -.14, -5.06, 2.98, .36, .76, bark[2]],
  [-3.93, -.14, -4.88, 3.43, .43, .81, bark[1]],
  [-.68, -.15, -4.63, 2.94, .58, .84, bark[2]],
  [2.1, -.16, -4.37, 2.71, .59, 1.03, bark[1]],
  [4.28, -.16, -4.15, 3.44, .78, 2.65, bark[1]],
  [4.45, -.12, -1.5, 1.48, .5, 2.2, bark[2]],
  [5.02, -.12, .7, 1.47, .4, 1.33, bark[2]],
  [5.34, -.13, 2.03, 1.25, .3, 2.95, bark[1]],
  [5.34, -1.03, 4.82, 1.03, .99, .27, bark[2]],
  [4.98, -1.53, 4.34, 1.08, .55, .68, bark[1]],
  [3.11, -.14, -1.82, 1.42, .38, 1.45, bark[2]],
  [2.4, -.15, -1.03, 1.29, .34, 1.83, bark[1]],
  [1.71, -.15, -.04, 1.06, .29, 1.17, bark[2]],
  [-.2, -.22, .39, 1.95, .32, .6, bark[1]],
  [-1.25, -.28, .75, 1.36, .33, .52, bark[1]],
  [6.96, -.18, -3.16, 1.32, .55, .83, bark[2]],
 ]) ground(x, y, z, w, h, d, c);

 // Exposed roots continue up the higher cliff under the treehouse.
 for (const [x, y, z, w, h, d, c] of [
  [4.77, -.13, -2.91, .78, 1.24, 1.87, bark[2]],
  [4.63, .89, -3.33, .93, 1.64, .84, bark[1]],
  [4.8, 2.32, -6.81, 2.16, .47, 3.89, bark[2]],
  [6.96, 1.06, -3.78, .47, 1.39, 1.08, bark[2]],
  [7.22, -.12, -3.07, .52, 1.42, 1.54, bark[1]],
  [-3.86, -.14, -3.63, .93, 1.49, .79, bark[2]],
  [-3.4, 1.15, -4.12, .69, 1.71, 1.04, bark[1]],
  [-2.92, 2.73, -4.56, .71, 1.94, .94, bark[2]],
  [-2.39, 4.52, -5.16, .74, 1.76, 1.04, bark[1]],
  [-2.05, 6.13, -5.53, 1.2, 1.47, .94, bark[2]],
  [-3.07, 7.41, -7.44, 3.8, .66, 2.07, leaves[1]],
  [-2.57, 7.98, -7.52, 2.6, .6, 1.98, leaves[2]],
 ]) ground(x, y, z, w, h, d, c);

 // Lift the cabin off the terrace and set the canopy back behind the board.
 const block = (x, y, z, w, h, d, color) => {
  ground(x, TREEHOUSE_BASE + y * TREEHOUSE_STRETCH, z + TREEHOUSE_BACK, w, h * TREEHOUSE_STRETCH, d, color);
 };

 // Stepped trunk and its branches form the structure around the display.
 block(4.97, .35, -4.55, 2.25, 3.06, 2.38, bark[2]);
 block(5.16, 3.41, -4.67, 2.25, 2.22, 2.25, bark[1]);
 block(5.44, 5.63, -4.87, 1.88, 2.15, 2.17, bark[2]);
 block(5.91, 7.65, -4.93, 1.69, 1.65, 1.85, bark[1]);
 block(6.95, 6.36, -4.64, 1.3, .67, 1.35, bark[2]);
 block(7.63, 6.95, -4.74, .9, .68, 1.11, bark[2]);
 block(3.98, 4.62, -4.42, 2.05, .62, 1.48, bark[1]);
 block(2.45, 5.15, -4.38, 2.42, .65, 1.65, bark[2]);
 block(-4.7, .05, -2.68, .41, 5.66, .46, bark[2]);
 block(-4.88, .2, -2.68, .22, 2.45, .45, bark[1]);
 block(-4.7, 5.38, -2.69, 10.3, .45, .5, cedar[1]);
 for (const [x, y, z, w, h, c] of [
  [5.13, .38, -2.16, .28, 1.35, bark[1]], [5.4, 1.82, -2.16, .24, 1.53, bark[3]],
  [6.49, .36, -2.16, .4, 2.84, bark[1]], [6.91, .38, -2.15, .23, 1.56, bark[3]],
  [5.62, 3.45, -2.41, .27, 1.72, bark[3]], [6.83, 4.11, -2.41, .35, 1.48, bark[0]],
  [5.81, 5.65, -2.69, .31, 1.48, bark[3]], [6.83, 6.18, -2.69, .22, 1.45, bark[1]],
 ]) block(x, y, z, w, h, .07, c);

 // The sketch's little door is cut into the root flare.
 block(5.24, .25, -2.28, 1.56, 1.45, .83, bark[2]);
 block(5.46, 1.7, -2.28, 1.13, .25, .83, bark[3]);
 block(5.37, .08, -1.45, 1.13, 1.43, .16, bark[0]);
 block(5.61, 1.5, -1.45, .67, .25, .16, bark[0]);
 for (const [x, h, c] of [[5.5, 1.22, cedar[1]], [5.79, 1.47, cedar[2]], [6.08, 1.22, cedar[1]]])
  block(x, .16, -1.28, .27, h, .09, c);
 block(6.09, .75, -1.16, .15, .15, .09, cedar[3]);
 block(5.26, .06, -1.3, 1.36, .13, .49, stone[3]);

 // The branch becomes a wooden deck and cabin, with the old console below it.
 block(.48, 5.64, -4.81, 5.33, .37, 2.56, cedar[0]);
 block(.36, 5.98, -4.85, 5.57, .18, 2.64, cedar[2]);
 block(.89, 6.16, -4.62, 4.19, 1.18, 1.65, cedar[1]);
 for (const y of [6.23, 6.53, 6.83, 7.13]) {
  block(.94, y, -2.97, 4.1, .065, .045, cedar[0]);
 }
 block(3.65, 6.41, -2.89, 1.18, .65, .1, cedar[0]);
 block(3.8, 6.51, -2.78, .88, .44, .06, '#ffd486');
 block(4.17, 6.51, -2.71, .12, .44, .07, cedar[0]);
 block(3.8, 6.71, -2.71, .88, .1, .07, cedar[0]);
 for (const x of [.53, .98, 1.43, 1.88, 2.33, 2.78, 3.23, 3.68, 4.13, 4.58, 5.03, 5.48])
  block(x, 6.14, -2.31, .11, .46, .12, cedar[2]);
 block(.45, 6.58, -2.36, 5.24, .11, .22, cedar[3]);

 // Wide, upturned eaves and a curled tip, drawn in deliberate pixel steps.
 block(-.12, 7.22, -4.99, 6.25, .24, 2.76, roof[0]);
 block(-.63, 7.46, -5.07, 7.26, .21, 2.91, roof[2]);
 block(-.93, 7.64, -4.78, 1.15, .19, 2.59, roof[3]);
 block(5.79, 7.64, -4.78, 1.14, .19, 2.59, roof[3]);
 block(-1.17, 7.81, -4.56, .49, .16, 2.37, roof[4]);
 block(6.69, 7.81, -4.56, .48, .16, 2.37, roof[4]);
 block(.42, 7.67, -4.87, 5.29, .2, 2.51, roof[2]);
 block(1.15, 7.87, -4.67, 3.91, .24, 2.14, roof[3]);
 block(1.77, 8.11, -4.46, 2.77, .25, 1.74, roof[2]);
 block(2.34, 8.36, -4.27, 1.62, .27, 1.43, roof[3]);
 block(2.56, 8.63, -4.05, 1.12, .27, 1.04, roof[3]);
 block(2.86, 8.9, -3.88, 1.15, .23, .8, roof[4]);
 block(3.78, 8.71, -3.87, .24, .2, .77, roof[3]);
 block(3.92, 8.52, -3.43, .09, .19, .09, cedar[3]);
 block(3.8, 8.25, -3.53, .32, .27, .31, cedar[0]);
 block(3.86, 8.31, -3.21, .2, .15, .06, '#ffcf7c');
 for (const [x, y, z, w] of [[.19, 7.49, -2.12, .67], [1.74, 7.71, -2.32, .76], [2.79, 8.15, -2.68, .58], [4.48, 7.69, -2.33, .67], [5.74, 7.5, -2.12, .62]])
  block(x, y, z, w, .075, .07, roof[4]);

 // Leaf clusters behind the roof echo the coarse tiles at the foot of the island.
 for (const [x, y, z, w, h, d, shade] of [
  [4.59, 7.81, -6.36, 3.81, .94, 1.96, 0],
  [5.24, 8.6, -6.13, 3.7, .88, 1.9, 1],
  [6.3, 9.35, -5.85, 1.98, .6, 1.45, 2],
  [7.76, 8.02, -5.38, 1.67, .79, 1.62, 2],
  [8.34, 7.54, -4.98, .96, .5, 1.21, 3],
  [6.83, 8.51, -4.66, 1.81, .48, .83, 2],
  [5.28, 8.8, -4.58, .99, .48, .75, 3],
  [7.66, 6.31, -4.89, 1.12, .7, 1.46, 1],
  [-5.12, 5.44, -4.36, 2.52, .62, 1.37, 1],
  [-4.98, 6.05, -4.09, 1.7, .52, 1.12, 2],
  [-5.12, 5.72, -2.98, .74, .38, .56, 3],
 ]) block(x, y, z, w, h, d, leaves[shade]);

 for (const [x, y, z, shade] of [
  [-6.15, .09, 3.37, 1], [-5.85, .09, 3.93, 2], [-6.36, .07, 4.72, 0],
  [-4.57, .07, 4.75, 2], [-3.07, .07, 4.83, 1], [2.88, .07, 4.74, 2],
  [4.44, .08, 3.86, 1], [6.4, .08, 3.16, 0], [6.82, .1, .56, 2], [7.0, .09, 1.56, 1],
 ]) {
  surface(x, -.1, z, .58, y + .28, .34, moss[shade]);
  surface(x + .12, y + .18, z + .04, .31, .19, .25, moss[shade + 1]);
 }
 for (const [x, z] of [[-6.3, 3.38], [-4.85, 4.75], [4.32, 3.15], [7.25, 2.56]]) {
  surface(x, -.1, z, .09, .45, .09, moss[3]);
  surface(x - .04, .32, z - .04, .17, .13, .17, roof[4]);
 }
}
