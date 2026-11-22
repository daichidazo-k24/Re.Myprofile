import {state} from '../state.js';
import {OBSERVATORY,approachLadder,climbLadder,descendLadder,useTelescope,stopViewing} from '../scene/observatory.js';
import {STAIR_HOTSPOT,TELESCOPE_POSITION} from '../scene/observatory-layout.js';
import {setTelescopeMagnification,telescopeMagnification} from './orbit-camera.js';

let panel,ladderButton,telescopeButton,zoomControl,zoomSlider,lastStatus='',lastUIKey='';
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
 document.body.append(ladderButton,telescopeButton);
}
export function syncObservatoryUI(){
 if(!panel)return;
 const phase=state.observatoryPhase;
 const arrived=Math.abs(state.cameraX-OBSERVATORY.x)<.3;
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
export function positionObservatoryHotspots(project){
 if(!ladderButton)return;
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
