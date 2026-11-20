import {state} from '../state.js';
import {OBSERVATORY,approachLadder,climbLadder,descendLadder,useTelescope,stopViewing} from '../scene/observatory.js';

let panel,ladderButton,telescopeButton,lastStatus='',lastUIKey='';
export function installObservatoryUI(){
 panel=document.createElement('div');panel.className='observatory-panel';panel.hidden=true;
 panel.innerHTML='<p role="status" aria-live="polite"></p><button type="button" data-observe="climb">↑ 梯子を上る</button><button type="button" data-observe="stop">見回しを終了</button><button type="button" data-observe="descend">↓ 梯子を下りる</button>';
 panel.querySelector('[data-observe="climb"]').addEventListener('click',climbLadder);
 panel.querySelector('[data-observe="stop"]').addEventListener('click',stopViewing);
 panel.querySelector('[data-observe="descend"]').addEventListener('click',descendLadder);
 document.body.appendChild(panel);
 ladderButton=document.createElement('button');ladderButton.type='button';ladderButton.className='observatory-hotspot ladder-hotspot';ladderButton.hidden=true;
 ladderButton.textContent='梯子へ';ladderButton.addEventListener('click',approachLadder);
 telescopeButton=document.createElement('button');telescopeButton.type='button';telescopeButton.className='observatory-hotspot telescope-hotspot';telescopeButton.hidden=true;
 telescopeButton.setAttribute('aria-label','望遠鏡をのぞいて見回す');telescopeButton.innerHTML='<span>望遠鏡をのぞく</span>';
 telescopeButton.addEventListener('click',useTelescope);
 document.body.append(ladderButton,telescopeButton);
}
export function syncObservatoryUI(){
 if(!panel)return;
 const phase=state.observatoryPhase;
 const arrived=Math.abs(state.cameraX-OBSERVATORY.x)<.3;
 const key=[phase,state.entered,state.focused,state.atLadder,state.cameraUnlocked,arrived].join(':');
 if(key===lastUIKey)return;lastUIKey=key;
 panel.hidden=!state.entered||state.focused||!state.atLadder;
 const messages={ground:arrived?'↑ キーで梯子を上る · ← → で移動':'梯子へ移動中',climbing:'展望台へ上っています',top:'望遠鏡をクリックして、あたりを見渡す',viewing:'FPS VIEW · ドラッグ / 矢印キーで見回す · Esc で戻る',descending:'梯子を下りています'};
 const status=messages[phase];if(status!==lastStatus){panel.querySelector('p').textContent=status;lastStatus=status}
 panel.querySelector('[data-observe="climb"]').hidden=phase!=='ground';
 panel.querySelector('[data-observe="climb"]').disabled=!arrived;
 panel.querySelector('[data-observe="stop"]').hidden=phase!=='viewing';
 panel.querySelector('[data-observe="descend"]').hidden=!['top','viewing'].includes(phase);
 document.body.classList.toggle('is-at-ladder',state.atLadder);
 document.body.classList.toggle('is-observing',phase!=='ground');
 document.body.classList.toggle('is-telescope-view',phase==='viewing');
 const toggle=document.getElementById('cameraToggle');
 toggle.disabled=!state.cameraUnlocked;toggle.textContent=state.cameraUnlocked?'◇ CAMERA':'◇ CAMERA LOCKED';
 toggle.title=state.cameraUnlocked?'カメラを操作':'展望台の望遠鏡をクリックすると見回せます';
 if(!state.cameraUnlocked){document.getElementById('cameraPad').classList.remove('is-open');toggle.setAttribute('aria-expanded','false')}
}
export function positionObservatoryHotspots(project){
 if(!ladderButton)return;
 const visible=state.entered&&!state.focused&&[3,4].includes(state.active);
 for(const [button,point,enabled] of [
  [ladderButton,[OBSERVATORY.x,.8,OBSERVATORY.z+.2],visible&&!state.atLadder],
  [telescopeButton,[OBSERVATORY.x+.65,OBSERVATORY.height+1.75,OBSERVATORY.z-1.15],visible&&state.observatoryPhase==='top']
 ]){
  const p=enabled?project(point):null;
  button.hidden=!p||p.x<0||p.x>innerWidth||p.y<70||p.y>innerHeight-90;
  if(!button.hidden){button.style.left=`${p.x}px`;button.style.top=`${p.y}px`}
 }
}
