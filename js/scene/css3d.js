/** Original CSS3D stage geometry/camera, with ONLY the whiteboard interior made continuous. */
import {STAGE_INDEX,STAGES,STEP} from '../data/stages.js';
import {renderStageDocument} from '../ui/document.js';
import {state} from '../state.js';
import {selectStage,toggleFocus,onNavigate} from '../ui/navigation.js';
import {registerBoard,scrollToSection} from '../ui/board-scroll.js';
import {positionFishingHotspot} from '../fishing/ui.js';
import {GRAPHIC_STAGES} from '../graphic/board.js';
import {openGraphicGallery} from '../graphic/ui.js';
import {createNotebookFallback} from '../graphic/notebook.js';
import {createSkyBackdrop} from './sky-backdrop.js';
import {createSkyCamera,updateCSSSkyCamera,updateSkyCamera} from './sky-camera.js';
import {skyDomeDirection} from './sky-dome.js';
import {updateObservatory} from './observatory.js';
import {STAIR_HOTSPOT,TELESCOPE_POSITION,buildRooftopTelescope,observatoryCameraOffset,observatoryClimberPose} from './observatory-layout.js';
import {syncObservatoryUI,positionObservatoryHotspots} from '../ui/observatory.js';
import {worldCameraPose,telescopeFov,cssTelescopeView} from '../ui/orbit-camera.js';
import {WORLD_CAMERA} from './camera-settings.js';
import {TREEHOUSE_TOP,buildIslandLandscape,islandTreePlanes} from './island-landscape.js';
import {createIslandTreeAtlas} from './island-trees.js';
import {FRUIT_GLOW,collectFruitShadows,createFruitGlow,fruitLights,islandFaceLight,rasterIslandFace} from './island-lighting.js';
import {createFrostSprite,frostFlakes,frostPose,showIslandFrost} from './island-frost.js';
import {loadMinerWalkFrames,minerWalkPose} from './miner-pose.js';
import {hex} from './math.js';

const CSS_SCALE=.674;
const CSS_STAGE_STEP=800;
const CSS_WORLD_UNITS=CSS_STAGE_STEP/STEP;
const CSS_ISLAND_DEPTH=79;
const CSS_ISLAND_GROUND=193;
const CSS_ISLAND_VERTICAL_UNIT=72;
const BADGES_X=STAGE_INDEX.badges*STEP;
const BADGES_VIEW_SPAN=(TREEHOUSE_TOP+3.56)*CSS_ISLAND_VERTICAL_UNIT;
const BADGES_VIEW_CENTER=CSS_ISLAND_GROUND-(TREEHOUSE_TOP-3.56)*CSS_ISLAND_VERTICAL_UNIT/2;
const ISLAND_FACES=[
 ['front',0,0,1],['back',0,0,-1],['left',-1,0,0],['right',1,0,0],['top',0,1,0],['bottom',0,-1,0],
];

function islandTransform(x,y,z){
 return `translate3d(${x*CSS_WORLD_UNITS}px,${CSS_ISLAND_GROUND-y*CSS_ISLAND_VERTICAL_UNIT}px,${CSS_ISLAND_DEPTH+z*CSS_WORLD_UNITS}px)`;
}

function createTreeLayer(){
 const trees=islandTreePlanes(),atlas=createIslandTreeAtlas(trees);
 const {width,height}=atlas.canvas;
 const layer=document.createElement('div');
 layer.className='island-trees';
 layer.setAttribute('aria-hidden','true');
 layer.style.setProperty('--island-tree-atlas',`url("${atlas.canvas.toDataURL()}")`);
 for(const tree of trees){
  const frame=atlas.frame(tree);
  const plane=document.createElement('div');
  plane.className='island-tree-silhouette';
  plane.style.width=`${tree.width*CSS_WORLD_UNITS}px`;
  plane.style.height=`${tree.height*CSS_ISLAND_VERTICAL_UNIT}px`;
  plane.style.backgroundSize=`${width/frame.width*100}% ${height/frame.height*100}%`;
  plane.style.backgroundPosition=`${frame.x/(width-frame.width)*100}% ${frame.y/(height-frame.height)*100}%`;
  plane.style.transform=islandTransform(tree.x,tree.y,tree.z)+` rotateY(${tree.yaw}rad) translate(-50%,-50%)`;
  layer.appendChild(plane);
 }
 return layer;
}

function createFrostLayer(world){
 const layer=document.createElement('div');
 layer.className='island-frost';
 layer.setAttribute('aria-hidden','true');
 layer.hidden=true;
 const src=createFrostSprite().toDataURL();
 const flakes=frostFlakes.map(flake=>{
  const node=document.createElement('img');
  node.alt='';node.src=src;
  node.style.width=`${flake.size*CSS_WORLD_UNITS}px`;
  node.style.height=`${flake.size*CSS_ISLAND_VERTICAL_UNIT}px`;
  node.style.opacity=String(flake.tint);
  layer.appendChild(node);
  return node;
 });
 world.appendChild(layer);
 let time=0;
 const pose=new Float32Array(4);
 return (cameraX,dt)=>{
  const visible=showIslandFrost(state);
  layer.toggleAttribute('hidden',!visible);
  if(!visible)return;
  if(!state.reduceMotion)time+=Math.min(dt,.045);
  for(const [i,flake] of frostFlakes.entries()){
   const node=flakes[i];
   const nearby=Math.abs(flake.x-cameraX)<=22;
   node.toggleAttribute('hidden',!nearby);
   if(!nearby)continue;
   frostPose(flake,time,pose);
   const [x,y,z,size]=pose;
   node.style.transform=islandTransform(x,y,z)+` translate(-50%,-50%) scale(${size/flake.size})`;
  }
 };
}

function applyLightAtlas(island,entries){
 if(!entries.length)return;
 // Pack the small face textures into one bitmap. Padding repeats the edge pixels.
 entries.sort((a,b)=>b.field.rows-a.field.rows);
 const width=1024;
 let x=0,y=0,rowHeight=0;
 for(const entry of entries){
  const {columns,rows}=entry.field;
  if(x+columns+2>width){y+=rowHeight;x=0;rowHeight=0}
  entry.x=x+1;entry.y=y+1;
  x+=columns+2;rowHeight=Math.max(rowHeight,rows+2);
 }
 const height=y+rowHeight;
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');
 const pixels=ctx.createImageData(width,height);
 for(const {face,field,x,y} of entries){
  const {columns,rows,colors}=field;
  for(let row=-1;row<=rows;row++)for(let col=-1;col<=columns;col++){
   const sourceRow=rows-1-Math.max(0,Math.min(rows-1,row));
   const sourceCol=Math.max(0,Math.min(columns-1,col));
   const i=(sourceRow*columns+sourceCol)*3,j=((y+row)*width+x+col)*4;
   pixels.data[j]=colors[i];pixels.data[j+1]=colors[i+1];pixels.data[j+2]=colors[i+2];pixels.data[j+3]=255;
  }
  face.classList.add('stage-landscape-lit');
  face.style.backgroundSize=`${width/columns*100}% ${height/rows*100}%`;
  face.style.backgroundPosition=`${x/(width-columns)*100}% ${y/(height-rows)*100}%`;
 }
 ctx.putImageData(pixels,0,0);
 island.style.setProperty('--forest-light-atlas',`url("${canvas.toDataURL()}")`);
}

function createCubeGroup(build){
 const island=document.createElement('div');
 island.className='stage-landscape';
 island.setAttribute('aria-hidden','true');
 const cubes=document.createDocumentFragment();
 const cuboids=[],litFaces=[];
 build((...cuboid)=>cuboids.push(cuboid));
 const shadows=collectFruitShadows(cuboids);
 for(const [x,y,z,width,height,depth,color,emissive] of cuboids){
  const cube=document.createElement('div');
  cube.className='stage-landscape-cube';
  cube.style.transform=islandTransform(x,y,z);
  cube.style.setProperty('--cube-width',`${width*CSS_WORLD_UNITS}px`);
  cube.style.setProperty('--cube-height',`${height*CSS_ISLAND_VERTICAL_UNIT}px`);
  cube.style.setProperty('--cube-depth',`${depth*CSS_WORLD_UNITS}px`);
  const rgb=hex(color);
  for(const [direction,nx,ny,nz] of ISLAND_FACES){
   const face=document.createElement('i');
   face.className=`stage-landscape-${direction}`;
   const center=[x+nx*width/2,y+ny*height/2,z+nz*depth/2];
   const u=nx?[0,0,-nx*depth]:[nz===-1?-width:width,0,0];
   const v=ny?[0,0,-ny*depth]:[0,height,0];
   const field=rasterIslandFace(rgb,center,u,v,[nx,ny,nz],emissive,shadows);
   if(field)litFaces.push({face,field});
   else{
    const lit=islandFaceLight(rgb,...center,nx,ny,nz,emissive,shadows);
    face.style.backgroundColor=`rgb(${lit.map(channel=>Math.round(channel*255)).join(',')})`;
   }
   cube.appendChild(face);
  }
  cubes.appendChild(cube);
 }
 applyLightAtlas(island,litFaces);
 island.appendChild(cubes);
 return island;
}

export function startCSS3D(){
 document.body.classList.add('css3d-renderer');
 const viewport=document.createElement('div');viewport.id='css3dFallback';viewport.className='css3d-viewport';
 const backdrop=createSkyBackdrop(document.getElementById('worldCanvas'));
 const skyCamera=createSkyCamera();
 const skyDirection=new Float32Array(3),skyRay=new Float32Array(3);
 if(backdrop)viewport.classList.add('has-sky-backdrop');
 const world=document.createElement('div');world.className='css3d-world';viewport.appendChild(world);
 const stages=[],observers=[];
 STAGES.forEach((meta,i)=>{
  const stage=document.createElement('div');stage.className='css3d-stage'+(i===state.active?' is-miner-active':'');
  stage.dataset.stage=meta.id;
  if(meta.id==='fishing'){
   stage.classList.add('fishing-css-stage');
   stage.innerHTML=`<div class="fishing-css-scene"><div class="fish-abyss"></div><div class="fish-cliff"></div><div class="fish-platform"></div><svg class="fish-rig-svg" viewBox="0 0 720 465" aria-hidden="true">
<polyline points="330,322 386,291 451,251 520,220" fill="none" stroke="#192846" stroke-width="17" stroke-linecap="square" stroke-linejoin="miter"/>
<polyline points="330,322 386,291 451,251 520,220" fill="none" stroke="#e6ad59" stroke-width="11" stroke-linecap="square" stroke-linejoin="miter"/>
<polyline points="451,251 520,220" fill="none" stroke="#ffe7a3" stroke-width="5" stroke-linecap="square"/>
<rect x="510" y="210" width="20" height="20" fill="#f5ad3a" stroke="#ffd98a" stroke-width="3"/>
<line class="fish-svg-line" x1="520" y1="220" x2="520" y2="345" stroke="#d8e8ff" stroke-width="3"/>
<g class="fish-svg-bob"><rect x="504" y="329" width="32" height="32" fill="#f68d1f" stroke="#fff1bc" stroke-width="4"/><rect x="513" y="335" width="13" height="9" fill="#fff0ab"/></g>
</svg><div class="fish-anchor"></div><div class="fish-pixel-stars"></div><div class="fishing-island-marker">EDGE OF THE ISLAND / FISHING SPOT</div></div>`;
   world.appendChild(stage);stages.push(stage);return;
  }
  stage.innerHTML=`<div class="css3d-back"></div><div class="board-popup-title" aria-hidden="true">${meta.boardHeading}</div><div class="css3d-frame"><span class="corner-led"></span><div class="card-cut board-scroll-area" tabindex="0" role="region" aria-label="${meta.short} の連続スクロール資料"><div class="board-scroll-sized"><div class="board-scroll-sheet">${renderStageDocument(i)}</div></div></div><span class="monitor-scroll-track" aria-hidden="true"><span></span></span></div><div class="sprite-podium"></div><img class="css-miner" src="${new URL('../../assets/miner.png',import.meta.url).href}" alt="">`;
  if(meta.id==='profile'){
   stage.insertAdjacentHTML('beforeend',`<div class="block-stack">${Array.from({length:6},(_,j)=>`<div class="voxel" style="--d:${(j%3)*22}px;--delay:${j*.2}s"></div>`).join('')}</div>`);
  }
  world.appendChild(stage);stages.push(stage);
  if(i===GRAPHIC_STAGES[0]){
   const graphic=document.createElement('button');graphic.type='button';graphic.className='css-graphic-board';
   const artwork=createNotebookFallback();artwork.setAttribute('aria-hidden','true');graphic.appendChild(artwork);
   graphic.setAttribute('aria-label','グラフィックボードをクリックしてGraphic Galleryを開く');
   graphic.addEventListener('click',openGraphicGallery);stage.appendChild(graphic);
  }
  const scroller=stage.querySelector('.board-scroll-area');
  const article=stage.querySelector('.board-document');
  const sized=stage.querySelector('.board-scroll-sized');
  const thumb=stage.querySelector('.monitor-scroll-track span');
  const updateThumb=()=>{
   const max=Math.max(0,scroller.scrollHeight-scroller.clientHeight);
   const frac=max>0?scroller.clientHeight/scroller.scrollHeight:1;
   const thumbPct=Math.max(12,100*frac);
   thumb.style.height=`${thumbPct}%`;
   thumb.style.top=`${max?(scroller.scrollTop/max)*(100-thumbPct):0}%`;
  };
  const updateHeight=()=>{sized.style.height=`${Math.ceil(article.scrollHeight*CSS_SCALE+3)}px`;updateThumb()};
  const resizeObserver=new ResizeObserver(updateHeight);resizeObserver.observe(article);observers.push(resizeObserver);
  registerBoard(i,scroller);scroller.addEventListener('scroll',updateThumb,{passive:true});updateHeight();
  scroller.addEventListener('click',event=>{
   if(!state.focused||state.active!==i)return;
   const anchor=event.target.closest?.('a[href]')||document.elementsFromPoint(event.clientX,event.clientY)
    .map(node=>node.closest?.('a[href]')).find(link=>link&&scroller.contains(link));
   if(!anchor)return;
   event.preventDefault();event.stopPropagation();
   const href=anchor.getAttribute('href');
   if(href?.startsWith('#'))scrollToSection(i,href);
   else if(href)window.open(anchor.href,'_blank','noopener,noreferrer');
  });
  stage.querySelector('.css3d-frame').addEventListener('click',event=>{
   if(!state.entered||event.target.closest('a,button'))return;
   if(state.active!==i)selectStage(i);
   else if(!state.focused)toggleFocus();
  });
 });
 const telescope=createCubeGroup(buildRooftopTelescope);
 world.prepend(createCubeGroup(buildIslandLandscape),createTreeLayer(),telescope);
 const fruitGlowSrc=createFruitGlow().toDataURL();
 for(const [x,y,z] of fruitLights){
  const glow=document.createElement('img');
  glow.className='forest-fruit-glow';
  glow.alt='';
  glow.src=fruitGlowSrc;
  glow.style.width=`${FRUIT_GLOW.width*CSS_WORLD_UNITS}px`;
  glow.style.height=`${FRUIT_GLOW.height*CSS_ISLAND_VERTICAL_UNIT}px`;
  glow.style.transform=islandTransform(x,y,z+FRUIT_GLOW.offsetZ)+' translate(-50%,-50%)';
  world.appendChild(glow);
 }
 const updateFrost=createFrostLayer(world);
 function makeAnchor(point){
  const [x,y,z]=point,anchor=document.createElement('i');
  anchor.className='observatory-anchor';
  anchor.style.transform=islandTransform(x,y,z);
  anchor.setAttribute('aria-hidden','true');
  world.appendChild(anchor);
  return anchor;
 }
 const stairAnchor=makeAnchor(STAIR_HOTSPOT);
 const telescopeAnchor=makeAnchor(TELESCOPE_POSITION);
 const climber=document.createElement('img');
 climber.className='observatory-miner';
 climber.alt='';
 world.appendChild(climber);
 // The shared celestial sphere replaces screen-fixed decorative light dots.
 if(!backdrop){
  const stars=document.createElement('div');stars.className='css3d-star-panorama';
  stars.setAttribute('aria-hidden','true');viewport.appendChild(stars);
 }
 document.getElementById('worldCanvas').insertAdjacentElement('afterend',viewport);
 function applyPositions(){stages.forEach((stage,i)=>{
  const fishing=stage.dataset.stage==='fishing';
  const baseZ=fishing?-100:-15,focusZ=state.focused?(i===state.active?140:-260-Math.abs(i-state.active)*45):0;
  const focusX=state.focused?(i-state.active)*35:0;
  const scale=state.focused?(i===state.active?1.08:.9):1;
  const rot=fishing?6:(state.focused&&i===state.active?0:i%2*3);
  stage.style.transform=`translate3d(${i*CSS_STAGE_STEP+focusX}px,0,${baseZ+focusZ}px) rotateY(${rot}deg) scale(${scale})`;
  stage.classList.toggle('is-focus-target',state.focused&&i===state.active);
  stage.classList.toggle('is-miner-active',i===state.active);
 });}
 onNavigate(applyPositions);applyPositions();
 let running=true,lastFrame=0;
 const walker=document.createElement('div');
 walker.className='css3d-stage css3d-walking-stage is-miner-active';
 walker.hidden=true;
 walker.setAttribute('aria-hidden','true');
 world.appendChild(walker);
 const walkFrames=[];
 let walkFrame=-1;
 loadMinerWalkFrames((canvas,index)=>{
  if(!running)return;
  canvas.className='css-miner';
  canvas.hidden=true;
  walkFrames[index]=canvas;
  walker.appendChild(canvas);
 });
 function cssFrame(now){
  if(!running)return;
  const dt=lastFrame?(now-lastFrame)/1000:0;lastFrame=now;
  updateObservatory(dt);syncObservatoryUI();
  const actor=observatoryClimberPose(state.observatoryHeight);
  const climbSprite=actor.onLadder?'sub'+(Math.floor(now/150)%2+1)+'.png':'miner.png';
  if(climber.dataset.pose!==climbSprite){
   climber.src=new URL('../../assets/'+climbSprite,import.meta.url).href;climber.dataset.pose=climbSprite;
  }
  climber.hidden=!state.atLadder||state.observatoryPhase==='viewing';
  telescope.hidden=state.observatoryPhase==='viewing';
  climber.style.transform=islandTransform(actor.x,actor.y,actor.z)+' translate(-50%,-100%)';
  const baseScale=Math.max(.30,Math.min(1.05,innerWidth/(innerWidth<680?1110:1330)));
  state.cameraX+=(state.aim-state.cameraX)*(state.reduceMotion?1:.07);
  const walk=walkFrames[0]&&walkFrames[1]&&minerWalkPose(state,now/1000);
  walker.hidden=!walk;
  world.classList.toggle('is-miner-walking',Boolean(walk));
  if(walk){
   if(walkFrame!==walk.frame){
    if(walkFrame>=0)walkFrames[walkFrame].hidden=true;
    walkFrames[walk.frame].hidden=false;
    walkFrame=walk.frame;
   }
   const descent=1-walk.lift;
   const x=`calc(${state.cameraX*CSS_WORLD_UNITS}px + var(--walk-pier-offset) * ${walk.pierProgress})`;
   const y=`calc(var(--walk-descent) * ${descent})`;
   walker.style.transform=`translate3d(${x},${y},${-15+52*descent}px)`;
   walker.style.setProperty('--walk-facing',walk.direction);
  }
  state.focusMix+=((state.focused?1:0)-state.focusMix)*(state.reduceMotion?1:.09);
  updateFrost(state.cameraX,dt);
  // Orbit the *entire world* around the currently selected stage. The label is
  // a DOM sibling of its board, hence inherits the identical stage rotation.
  const f=state.focusMix;
  const yawDeg=(-state.orbitYaw*180/Math.PI)*(1-f)+(-2)*f;
  const pitchDeg=(-state.orbitPitch*180/Math.PI)*(1-f)+1.2*f;
  const zoom=(17.5-state.orbitDistance)*41*(1-f);
  const [routeX,routeY,routeZ]=state.atLadder?observatoryCameraOffset(state.observatoryHeight):[0,0,0];
  const z=(state.entered?35:-360)*(1-f)+(state.entered?90:-140)*f+zoom-routeZ*CSS_WORLD_UNITS*baseScale;
  const cameraLift=WORLD_CAMERA.targetHeight+WORLD_CAMERA.distance*Math.sin(WORLD_CAMERA.pitch)-2.65;
  const y=((state.entered?0:-12)+cameraLift*(800/STEP)*baseScale)*(1-f)+113*f -state.orbitPanY*48*(1-f)+routeY*CSS_ISLAND_VERTICAL_UNIT*baseScale;
  const panOffset=state.orbitPanX*59*(1-f);
  const stageX=(state.cameraX+routeX)*CSS_WORLD_UNITS;
  if(state.observatoryPhase==='viewing'){
   const pose=worldCameraPose(state.cameraX);
   const view=cssTelescopeView(pose.eye,pose.target,innerHeight,CSS_WORLD_UNITS,{
    ground:CSS_ISLAND_GROUND, depth:CSS_ISLAND_DEPTH,
    verticalUnit:CSS_ISLAND_VERTICAL_UNIT,
   });
   viewport.style.perspective=`${view.perspective}px`;
   world.style.transform=`matrix3d(${Array.from(view.matrix).join(',')})`;
   updateSkyCamera(skyCamera,pose.eye,pose.target,telescopeFov(),innerWidth/innerHeight);
  }else{
   viewport.style.perspective='';
   // Preserve the original map magnification and the roof framing at BADGES.
   const approach=Math.max(0,1-Math.abs(state.cameraX-BADGES_X)/STEP);
   const fit=state.atLadder?0:approach*(1-f);
   const fitScale=Math.min(baseScale,Math.max(.23,(innerHeight-116)/BADGES_VIEW_SPAN));
   const worldScale=baseScale+(fitScale-baseScale)*fit;
   const frameOffset=fit*(innerHeight*.065-BADGES_VIEW_CENTER*fitScale-cameraLift*CSS_WORLD_UNITS*baseScale);
   world.style.transform=`translate3d(${panOffset}px,${y+frameOffset}px,${z}px) rotateY(${yawDeg}deg) rotateX(${pitchDeg}deg) scale(${worldScale}) translate3d(${-stageX}px,0,0)`;
   updateCSSSkyCamera(skyCamera,{width:innerWidth,height:innerHeight,perspective:innerWidth<=800?880:1120,
    scale:baseScale,yaw:yawDeg*Math.PI/180,pitch:pitchDeg*Math.PI/180,x:panOffset,y,z,stageX,units:800/STEP});
  }
  positionObservatoryHotspots(point=>{
   const anchor=point===STAIR_HOTSPOT?stairAnchor:telescopeAnchor;
   const rect=anchor.getBoundingClientRect();return {x:rect.x,y:rect.y};
  });
  if(backdrop)backdrop.draw(state,dt,skyCamera);
  else{
   // A panoramic still remains navigable even when WebGL itself is unavailable.
   const r=skyCamera.rays;
   skyRay[0]=r[6];skyRay[1]=r[7];skyRay[2]=r[8];
   skyDomeDirection(skyCamera.eye,skyRay,skyDirection);
   const longitude=Math.atan2(skyDirection[2],skyDirection[0])/(2*Math.PI)+.5;
   const latitude=Math.asin(Math.max(-1,Math.min(1,skyDirection[1])))/Math.PI+.5;
   const perspective=state.observatoryPhase==='viewing'?innerHeight/(2*Math.tan(telescopeFov()/2)):(innerWidth<=800?880:1120),skyWidth=2*Math.PI*perspective,skyHeight=Math.PI*perspective;
   viewport.style.setProperty('--sky-width',`${skyWidth}px`);viewport.style.setProperty('--sky-height',`${skyHeight}px`);
   viewport.style.setProperty('--sky-x',`${innerWidth/2-longitude*skyWidth}px`);
   viewport.style.setProperty('--sky-y',`${Math.max(innerHeight-skyHeight,Math.min(0,innerHeight/2-(1-latitude)*skyHeight))}px`);
  }
  if(state.entered&&STAGES[state.active].id==='fishing'){const anchor=stages[STAGES.length-1].querySelector('.fish-anchor');const rect=anchor.getBoundingClientRect();positionFishingHotspot(rect.x+rect.width/2,rect.y+rect.height/2)}
  requestAnimationFrame(cssFrame);
 }
 requestAnimationFrame(cssFrame);
 return {type:'css3d',destroy(){running=false;backdrop?.destroy();observers.forEach(ro=>ro.disconnect())}};
}
