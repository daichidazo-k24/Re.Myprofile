/** Original CSS3D stage geometry/camera, with ONLY the whiteboard interior made continuous. */
import {STAGES,STEP} from '../data/stages.js';
import {renderStageDocument} from '../ui/document.js';
import {state} from '../state.js';
import {selectStage,toggleFocus,onNavigate} from '../ui/navigation.js';
import {registerBoard,scrollToSection} from '../ui/board-scroll.js';
import {positionFishingHotspot} from '../fishing/ui.js';
import {GRAPHIC_STAGES} from '../graphic/board.js';
import {openGraphicGallery} from '../graphic/ui.js';
import {createNotebookFallback} from '../graphic/notebook.js';
import {createSkyBackdrop} from './sky-backdrop.js';
import {createSkyCamera,updateCSSSkyCamera} from './sky-camera.js';
import {skyDomeDirection} from './sky-dome.js';

const CSS_SCALE=.674;
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
  stage.innerHTML=`<div class="css3d-back"></div><div class="board-popup-title" aria-hidden="true">${meta.boardHeading}</div><div class="css3d-frame"><span class="corner-led"></span><div class="card-cut board-scroll-area" tabindex="0" role="region" aria-label="${meta.short} の連続スクロール資料"><div class="board-scroll-sized"><div class="board-scroll-sheet">${renderStageDocument(i)}</div></div></div><span class="monitor-scroll-track" aria-hidden="true"><span></span></span></div><div class="sprite-podium"></div><img class="css-miner" src="${new URL('../../assets/miner.png',import.meta.url).href}" alt=""><div class="block-stack">${Array.from({length:6},(_,j)=>`<div class="voxel" style="--d:${(j%3)*22}px;--delay:${j*.2}s"></div>`).join('')}</div><div class="stage-plinth"></div>`;
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
 // The shared celestial sphere replaces screen-fixed decorative light dots.
 if(!backdrop){
  const stars=document.createElement('div');stars.className='css3d-star-panorama';
  stars.setAttribute('aria-hidden','true');viewport.appendChild(stars);
 }
 document.getElementById('worldCanvas').insertAdjacentElement('afterend',viewport);
 function applyPositions(){stages.forEach((stage,i)=>{
  const baseZ=i%2===0?-15:-100,focusZ=state.focused?(i===state.active?140:-260-Math.abs(i-state.active)*45):0;
  const focusX=state.focused?(i-state.active)*35:0;
  const scale=state.focused?(i===state.active?1.08:.9):1,rot=state.focused&&i===state.active?0:i%2===0?0:6;
  stage.style.transform=`translate3d(${i*800+focusX}px,0,${baseZ+focusZ}px) rotateY(${rot}deg) scale(${scale})`;
  stage.classList.toggle('is-focus-target',state.focused&&i===state.active);
  stage.classList.toggle('is-miner-active',i===state.active);
 });}
 onNavigate(applyPositions);applyPositions();
 let running=true,lastFrame=0;
 function cssFrame(now){
  if(!running)return;
  const dt=lastFrame?(now-lastFrame)/1000:0;lastFrame=now;
  const baseScale=Math.max(.30,Math.min(1.05,innerWidth/(innerWidth<680?1110:1330)));
  state.cameraX+=(state.aim-state.cameraX)*(state.reduceMotion?1:.07);
  state.focusMix+=((state.focused?1:0)-state.focusMix)*(state.reduceMotion?1:.09);
  // Orbit the *entire world* around the currently selected stage. The label is
  // a DOM sibling of its board, hence inherits the identical stage rotation.
  const f=state.focusMix;
  const yawDeg=(-state.orbitYaw*180/Math.PI)*(1-f)+(-2)*f;
  const pitchDeg=((state.orbitPitch*180/Math.PI)-9)*(1-f)+1.2*f;
  const zoom=(17.5-state.orbitDistance)*41*(1-f);
  const z=(state.entered?35:-360)*(1-f)+(state.entered?90:-140)*f+zoom;
  const y=(state.entered?0:-12)*(1-f)+113*f -state.orbitPanY*48*(1-f);
  const panOffset=state.orbitPanX*59*(1-f);
  const stageX=state.cameraX/STEP*800;
  world.style.transform=`translate3d(${panOffset}px,${y}px,${z}px) rotateY(${yawDeg}deg) rotateX(${pitchDeg}deg) scale(${baseScale}) translate3d(${-stageX}px,0,0)`;
  updateCSSSkyCamera(skyCamera,{width:innerWidth,height:innerHeight,perspective:innerWidth<=800?880:1120,
   scale:baseScale,yaw:yawDeg*Math.PI/180,pitch:pitchDeg*Math.PI/180,x:panOffset,y,z,stageX,units:800/STEP});
  if(backdrop)backdrop.draw(state,dt,skyCamera);
  else{
   // A panoramic still remains navigable even when WebGL itself is unavailable.
   const r=skyCamera.rays;
   skyRay[0]=r[6];skyRay[1]=r[7];skyRay[2]=r[8];
   skyDomeDirection(skyCamera.eye,skyRay,skyDirection);
   const longitude=Math.atan2(skyDirection[2],skyDirection[0])/(2*Math.PI)+.5;
   const latitude=Math.asin(Math.max(-1,Math.min(1,skyDirection[1])))/Math.PI+.5;
   const perspective=innerWidth<=800?880:1120,skyWidth=2*Math.PI*perspective,skyHeight=Math.PI*perspective;
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
