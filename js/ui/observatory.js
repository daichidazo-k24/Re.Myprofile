import {state} from '../state.js';
import {OBSERVATORY,approachLadder,climbLadder,descendLadder,useTelescope,stopViewing} from '../scene/observatory.js';
import {STAIR_ARRIVAL_DISTANCE,STAIR_HOTSPOT,TELESCOPE_POSITION} from '../scene/observatory-layout.js';
import {setTelescopeMagnification,telescopeFov,telescopeMagnification} from './orbit-camera.js';
import {UFO_DIRECTION,projectTelescopeUfo} from '../scene/telescope-ufo.js';
import {TELESCOPE_OPTICS} from '../scene/camera-settings.js';

let panel,ladderButton,telescopeButton,zoomControl,zoomSlider,ufoButton,ufoShot,ufoCrack,lastStatus='',lastUIKey='';
const UFO_WARNING_CLICK=2,UFO_ATTACK_CLICK=4,UFO_WARNING_MS=2300,UFO_AIM_MS=230,UFO_SHOT_MS=240;
const UFO_ANGRY_AFTER_IMPACT_MS=800,UFO_REACTION_COOLDOWN_MS=6600;
let ufoClicks=0,ufoWarningUntil=null,ufoAttackAt=null;
let ufoSession=-1,lensHits=0,impactApplied=false;
function resetUfoReaction(){ufoClicks=0;ufoWarningUntil=null;ufoAttackAt=null;impactApplied=false;}
export function installObservatoryUI(){
 panel=document.createElement('div');panel.className='observatory-panel';panel.hidden=true;
 panel.innerHTML='<p role="status" aria-live="polite"></p><button type="button" data-observe="climb" aria-label="上矢印キーで梯子を上る">↑ 上る</button><button type="button" data-observe="stop" aria-label="望遠鏡を閉じる。Escキーでも戻れます">戻る <kbd>Esc</kbd></button><button type="button" data-observe="descend" aria-label="下矢印キーで梯子を下りる">↓ 下りる</button>';
 panel.querySelector('[data-observe="climb"]').addEventListener('click',climbLadder);
 panel.querySelector('[data-observe="stop"]').addEventListener('click',stopViewing);
 panel.querySelector('[data-observe="descend"]').addEventListener('click',descendLadder);
 document.body.appendChild(panel);
 zoomControl=document.createElement('div');zoomControl.className='telescope-zoom';zoomControl.hidden=true;
 zoomControl.innerHTML='<label for="telescopeZoom">倍率</label><output for="telescopeZoom" aria-label="現在の倍率">1.0×</output><span aria-hidden="true">3×</span><input id="telescopeZoom" type="range" min="1" max="3" step="0.01" value="1" aria-orientation="vertical" aria-valuetext="1.0倍"><span aria-hidden="true">1×</span>';
 zoomSlider=zoomControl.querySelector('input');
 zoomSlider.addEventListener('input',()=>setTelescopeMagnification(Number(zoomSlider.value)));
 document.body.appendChild(zoomControl);
 ladderButton=document.createElement('button');ladderButton.type='button';ladderButton.className='observatory-hotspot ladder-hotspot';ladderButton.hidden=true;
 ladderButton.setAttribute('aria-label','ツリーハウスの石段へ移動');ladderButton.textContent='石段へ';
 ladderButton.addEventListener('click',approachLadder);
 telescopeButton=document.createElement('button');telescopeButton.type='button';telescopeButton.className='observatory-hotspot telescope-hotspot';telescopeButton.hidden=true;
 telescopeButton.setAttribute('aria-label','望遠鏡をのぞいて見回す');telescopeButton.innerHTML='<span>望遠鏡をのぞく</span>';
 telescopeButton.addEventListener('click',useTelescope);
 ufoButton=document.createElement('button');
 ufoButton.type='button';ufoButton.className='telescope-ufo';ufoButton.hidden=true;
 ufoButton.setAttribute('aria-label','UFOを望遠鏡で拡大する');
 for(const [index,name] of ['ufo1','ufo2','ufo3'].entries()){
  const sprite=document.createElement('img');
  sprite.src=new URL('../../assets/'+name+'.png',import.meta.url).href;
  if(index===2)sprite.className='ufo-angry';
  sprite.alt='';sprite.draggable=false;ufoButton.appendChild(sprite);
 }
 const greeting=document.createElement('span');greeting.className='ufo-greeting';greeting.textContent='hi , human';
 const warning=document.createElement('span');warning.className='ufo-warning';
 const angerIcon=document.createElement('img');angerIcon.src=new URL('../../assets/oko.png',import.meta.url).href;
 angerIcon.alt='怒り';angerIcon.draggable=false;warning.appendChild(angerIcon);
 ufoButton.append(greeting,warning);
 ufoShot=document.createElement('div');ufoShot.className='telescope-ufo-shot';ufoShot.hidden=true;
 ufoShot.setAttribute('aria-hidden','true');
 ufoCrack=document.createElement('div');ufoCrack.className='telescope-ufo-crack';ufoCrack.hidden=true;
 ufoCrack.setAttribute('aria-hidden','true');
 ufoCrack.innerHTML=`<svg viewBox="0 0 1000 600" preserveAspectRatio="none">
  <path class="ufo-crack-main" d="M536 306 503 275 470 277 388 205 365 150 304 129 268 62 197 0 M536 306 565 267 647 239 687 170 759 138 811 45 917 0 M536 306 573 314 610 293 670 324 725 304 822 335 873 310 1000 355 M536 306 557 357 603 384 595 456 661 504 669 600 M536 306 494 337 478 397 419 408 377 483 316 505 273 600 M536 306 474 312 448 344 378 351 341 327 279 367 192 343 118 390 0 380"/>
  <path class="ufo-crack-branches" d="M365 150 327 173 285 162 247 195 M687 170 657 134 661 81 622 45 M822 335 850 374 905 396 929 455 M595 456 547 467 519 508 466 513 M377 483 355 449 320 436 277 448 M192 343 169 310 110 284 90 246 M503 275 515 252 550 244 565 267 581 291 573 314 557 357 521 358 494 337 474 312 470 277"/>
  <g class="ufo-crack-spread">
   <path pathLength="1" d="M503 275 512 217 483 179 496 126 472 75 490 17 M388 205 365 228 300 211 247 195 164 206 137 173 44 170 M268 62 228 87 169 67 122 115 28 98"/>
   <path pathLength="1" d="M565 267 594 224 579 173 603 127 594 64 632 0 M647 239 693 254 734 218 798 223 847 189 894 205 975 184 M811 45 841 89 899 87 963 121 1000 106"/>
   <path pathLength="1" d="M610 293 633 348 687 370 702 415 753 421 800 481 878 505 M661 504 700 481 759 512 781 563 858 592 M929 455 965 468 1000 520"/>
   <path pathLength="1" d="M478 397 502 436 480 474 491 543 456 580 M419 408 415 458 430 491 401 542 410 600 M279 367 241 396 220 450 157 474 125 540 69 568 M118 390 81 422 18 439"/>
  </g>
 </svg>`;
 ufoButton.addEventListener('click',()=>{
  if(state.observatoryPhase!=='viewing'||ufoAttackAt!==null)return;
  state.orbitYaw=UFO_DIRECTION.yaw;state.orbitPitch=UFO_DIRECTION.pitch;
  setTelescopeMagnification(TELESCOPE_OPTICS.maxMagnification);
  const now=performance.now();
  if(ufoWarningUntil!==null&&now>=ufoWarningUntil)resetUfoReaction();
  ufoClicks++;
  if(ufoClicks===UFO_WARNING_CLICK)ufoWarningUntil=now+UFO_WARNING_MS;
  if(ufoClicks===UFO_ATTACK_CLICK)ufoAttackAt=ufoWarningUntil;
 });
 document.body.append(ladderButton,telescopeButton,ufoButton,ufoShot,ufoCrack);
}
export function syncObservatoryUI(){
 if(!panel)return;
 const phase=state.observatoryPhase;
 const arrived=Math.abs(state.cameraX-OBSERVATORY.x)<STAIR_ARRIVAL_DISTANCE;
 const key=[phase,state.entered,state.focused,state.atLadder,state.cameraUnlocked,arrived,state.telescopeFovDegrees].join(':');
 if(key===lastUIKey)return;lastUIKey=key;
 panel.hidden=!state.entered||state.focused||!state.atLadder;
 const messages={ground:arrived?'↑ キーで石段と梯子を上る · ← → で移動':'ツリーハウスの石段へ移動中',climbing:'ツリーハウスの屋上へ上っています',top:'望遠鏡をクリックするか Enter キーでのぞく。↓ キーで下りる',viewing:'望遠鏡をのぞいています。ドラッグや矢印キーで見回す。ホイールやピンチで拡大。Esc で戻る',descending:'梯子と石段を下りています'};
 const status=messages[phase];if(status!==lastStatus){panel.querySelector('p').textContent=status;lastStatus=status}
 panel.querySelector('[data-observe="climb"]').hidden=phase!=='ground';
 panel.querySelector('[data-observe="climb"]').disabled=!arrived;
 panel.querySelector('[data-observe="stop"]').hidden=phase!=='viewing';
 panel.querySelector('[data-observe="descend"]').hidden=phase!=='top';
 zoomControl.hidden=panel.hidden||phase!=='viewing';
 const magnification=telescopeMagnification();
 zoomControl.querySelector('output').textContent=`${magnification.toFixed(1)}×`;
 zoomSlider.value=String(magnification);
 zoomSlider.setAttribute('aria-valuetext',`${magnification.toFixed(1)}倍`);
 document.body.classList.toggle('is-at-ladder',state.atLadder);
 document.body.classList.toggle('is-observing',phase!=='ground');
 document.body.classList.toggle('is-telescope-view',phase==='viewing');
 const toggle=document.getElementById('cameraToggle');
 toggle.disabled=!state.cameraUnlocked;toggle.textContent=state.cameraUnlocked?'◇ CAMERA':'◇ CAMERA LOCKED';
 toggle.title=state.cameraUnlocked?'カメラを操作':'ツリーハウス屋上の望遠鏡から見回せます';
 if(!state.cameraUnlocked){document.getElementById('cameraPad').classList.remove('is-open');toggle.setAttribute('aria-expanded','false')}
}
export function positionObservatoryHotspots(project,time){
 if(!ladderButton)return;
 const viewing=state.observatoryPhase==='viewing';
 if(!viewing||ufoSession!==state.telescopeSession){
  resetUfoReaction();
  lensHits=0;
  ufoSession=state.telescopeSession;
 }
 const travel=state.reduceMotion?0:UFO_SHOT_MS;
 const now=performance.now();
 const elapsed=ufoAttackAt===null?null:now-ufoAttackAt;
 const warningExpired=ufoAttackAt===null&&ufoWarningUntil!==null&&now>=ufoWarningUntil;
 const impactTime=UFO_AIM_MS+travel;
 const recoveryTime=impactTime+UFO_ANGRY_AFTER_IMPACT_MS;
 if(!impactApplied&&elapsed!==null&&elapsed>=impactTime){
  impactApplied=true;
  lensHits++;
  const spread=1-1/lensHits;
  ufoCrack.style.setProperty('--crack-spread',spread);
  ufoCrack.style.setProperty('--crack-width',1.8+1.1*spread);
 }
 if(warningExpired||(elapsed!==null&&elapsed>=impactTime+UFO_REACTION_COOLDOWN_MS))resetUfoReaction();
 const attacking=ufoAttackAt!==null&&elapsed>=0&&elapsed<recoveryTime;
 const firing=attacking&&elapsed>=UFO_AIM_MS&&elapsed<impactTime;
 const ufo=viewing&&projectTelescopeUfo(state.orbitYaw,state.orbitPitch,telescopeFov(),innerWidth,innerHeight);
 if(firing&&ufoShot.hidden){
  ufoShot.style.setProperty('--ufo-shot-x',`${ufo?.x??innerWidth/2}px`);
  ufoShot.style.setProperty('--ufo-shot-y',`${ufo?.y??innerHeight/2}px`);
 }
 ufoShot.hidden=!firing;
 ufoCrack.hidden=lensHits===0;
 ufoButton.hidden=!ufo;
 if(ufo){
  ufoButton.style.left=`${ufo.x}px`;ufoButton.style.top=`${ufo.y}px`;
  ufoButton.style.setProperty('--ufo-size',`${ufo.size}px`);
  ufoButton.classList.toggle('is-warning',ufoWarningUntil!==null&&now<ufoWarningUntil);
  ufoButton.classList.toggle('is-angry',attacking);
  ufoButton.classList.toggle('shows-alt',!attacking&&!state.reduceMotion&&Math.floor(time*2.5)%2===1);
 }
 const visible=state.entered&&!state.focused&&[OBSERVATORY.leftStage,OBSERVATORY.rightStage].includes(state.active);
 for(const [button,point,enabled] of [
  [ladderButton,STAIR_HOTSPOT,visible&&!state.atLadder],
  [telescopeButton,TELESCOPE_POSITION,visible&&state.observatoryPhase==='top']
 ]){
  button.hidden=!enabled;
  if(!enabled)continue;
  const p=project(point);
  const inFrame=p&&p.x>=40&&p.x<=innerWidth-40&&p.y>=70&&p.y<=innerHeight-92;
  button.style.left=`${inFrame?p.x:innerWidth/2}px`;
  button.style.top=`${inFrame?p.y:innerHeight-120}px`;
 }
}
