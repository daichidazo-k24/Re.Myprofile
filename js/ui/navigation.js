/** Original 5-stage navigation and focus states; only board content is continuous. */
import {STAGES,STEP} from '../data/stages.js';
import {state} from '../state.js';
import {beep} from './audio.js';
import {onBoardScroll,boardProgress} from './board-scroll.js';
import {STAGE_LINKS} from './document.js';
const $=id=>document.getElementById(id);
const subscribers=new Set();
const fire=(kind,stage)=>{for(const fn of subscribers)fn(kind,stage)};
export function onNavigate(listener){subscribers.add(listener);return()=>subscribers.delete(listener)}
export function renderNavigation(){
 const i=state.active,stage=STAGES[i],fishing=stage.id==='fishing';
 document.querySelectorAll('.chapter').forEach((btn,j)=>{btn.classList.toggle('is-active',i===j);btn.setAttribute('aria-current',i===j?'page':'false')});
 const sceneKicker=$('sceneKicker'),sceneTitle=$('sceneTitle'),sceneSubtitle=$('sceneSubtitle');
 if(sceneKicker)sceneKicker.textContent=stage.kicker;
 if(sceneTitle)sceneTitle.textContent=stage.title;
 if(sceneSubtitle)sceneSubtitle.textContent=stage.subtitle;
 $('actionCaption').textContent=stage.kicker;
 const firstLink=STAGE_LINKS[i][0]||{label:'GITHUB PROFILE',url:'https://github.com/daichidazo-k24'};
 $('sideAction').hidden=fishing;
 $('primaryLink').textContent=firstLink.label+' ↗';$('primaryLink').href=firstLink.url;
 const parent=$('pageExternalLinks');parent.replaceChildren();
 // These are shortcuts only; all source links also live at their proper text location.
 for(const link of STAGE_LINKS[i].slice(0,2)){
  const a=document.createElement('a');a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=link.label+' ↗';parent.appendChild(a);
 }
 $('focusBtn').textContent=fishing?'🎣 CAST LINE':state.focused?'◀ WORLD VIEW':'◎ STAGE VIEW';$('focusBtn').setAttribute('aria-pressed',String(state.focused));
 document.body.classList.toggle('is-focus-mode',state.focused);
 document.querySelectorAll('.css3d-stage').forEach((el,j)=>{el.classList.toggle('is-miner-active',j===i);el.classList.toggle('is-focus-target',state.focused&&j===i)});
}
export function selectStage(index){
 const next=Math.max(0,Math.min(STAGES.length-1,index));
 if(next===state.active){renderNavigation();return}
 if(STAGES[next].id==='fishing')state.focused=false;
 state.active=next;state.aim=next*STEP;renderNavigation();fire('stage',next);beep(370+next*65,.11);
}
export function setFocus(value){if(!state.entered||STAGES[state.active].id==='fishing')return;state.focused=!!value;renderNavigation();fire('focus',state.active);beep(state.focused?560:320,.12)}
export const toggleFocus=()=>setFocus(!state.focused);
onBoardScroll(index=>{if(index===state.active){/* scroll position shown on whiteboard itself */}});
