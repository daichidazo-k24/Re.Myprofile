/** Fishing rod/hook click target, reel animation, and a separate catchable gallery. */
import {createGallery} from '../ui/gallery.js';
import {FISH_IMAGES} from './data.js';
import {FISHING_CONTENT} from '../content/fishing.js';
import {fishingState,startCast,finishCast,resetCast} from './state.js';
import {state} from '../state.js';
import {STAGE_INDEX} from '../data/stages.js';
import {onNavigate} from '../ui/navigation.js';
import {beep} from '../ui/audio.js';
const fishingIndex=STAGE_INDEX.fishing;
let hotspot=null,dialog=null,gallery=null,castTimer=0,lastAnchor=0;
const isFishing=()=>state.entered&&state.active===fishingIndex;
/** Gallery dialogs are modal: background camera controls must not consume any input. */
export const isFishingOverlayActive=()=>Boolean(gallery?.isOpen());
const localPhoto=entry=>globalThis.__questPreviewFishPhotos?.[entry.id-1]||entry.src;
function makeGallery(){
 gallery=createGallery({id:'fishing',title:FISHING_CONTENT.title,label:FISHING_CONTENT.miniLabel,
  intro:FISHING_CONTENT.intro,entries:FISH_IMAGES,itemLabel:'PHOTOS',resolveSource:localPhoto,
  onClose(){document.body.classList.remove('has-fishing-catch');fishingState.opened=false;resetCast();syncFishingUI()}});
 dialog=gallery.dialog;
}
export function syncFishingUI(){
 if(!hotspot)return;
 const visible=isFishing()&&!dialog?.open;
 hotspot.hidden=!visible;
 document.body.classList.toggle('on-fishing-stage',isFishing());
 hotspot.disabled=fishingState.phase==='reeling';
 hotspot.querySelector('.fish-hotspot-text').textContent=fishingState.phase==='reeling'?'REELING IN…':'🎣 釣り糸をクリック';
 hotspot.setAttribute('aria-label',fishingState.phase==='reeling'?'釣り上げています':'釣り糸をクリックして釣果ギャラリーを釣り上げる');
}
export function closeGallery(){gallery?.close()}
export function castFishingLine(){
 if(!isFishing()||dialog?.open)return false;
 if(!startCast(performance.now()))return false;
 beep(420,.08);syncFishingUI();
 document.body.classList.add('fishing-reeling');
 clearTimeout(castTimer);castTimer=setTimeout(()=>{
  document.body.classList.remove('fishing-reeling');finishCast();
  beep(690,.12);gallery.open();document.body.classList.add('has-fishing-catch');
  syncFishingUI();
 },state.reduceMotion?180:1350);
 return true;
}
/** The renderer sends projected 2D pixels for the 3D line's *hook*, not for the stage board. */
export function positionFishingHotspot(x,y){
 if(!hotspot)return;
 if(!Number.isFinite(x)||!Number.isFinite(y))return;
 lastAnchor=performance.now();
 const cx=Math.min(innerWidth-108,Math.max(112,x));
 const cy=Math.min(innerHeight-155,Math.max(140,y));
 hotspot.style.left=`${cx}px`;
 hotspot.style.top=`${cy}px`;
 document.documentElement.style.setProperty('--fishing-hook-x',`${cx}px`);
 document.documentElement.style.setProperty('--fishing-hook-y',`${cy}px`);
}
export function installFishingUI(){
 makeGallery();
 hotspot=document.createElement('button');hotspot.type='button';hotspot.id='fishingCastHotspot';hotspot.className='fishing-cast-hotspot';
 hotspot.innerHTML='<span class="fish-reticle" aria-hidden="true">✦</span><span class="fish-hotspot-text">🎣 釣り糸をクリック</span><small>CLICK TO REEL UP THE GALLERY</small>';
 hotspot.style.left='64%';hotspot.style.top='49%';hotspot.hidden=true;hotspot.addEventListener('click',castFishingLine);
 document.body.append(hotspot);
 const mobileRig=document.createElement('div');mobileRig.className='fishing-mobile-rig';mobileRig.setAttribute('aria-hidden','true');
 mobileRig.innerHTML=`<svg viewBox="0 0 260 230" width="260" height="230" xmlns="http://www.w3.org/2000/svg"><path d="M10 222 L118 118 L198 16" stroke="#091329" stroke-width="15" stroke-linejoin="miter" fill="none"/><path d="M10 222 L118 118 L198 16" stroke="#ffc778" stroke-width="9" stroke-linejoin="miter" fill="none"/><path d="M10 222 L118 118 L198 16" stroke="#dc9550" stroke-width="3" stroke-linejoin="miter" fill="none"/><rect x="190" y="8" width="16" height="16" fill="#f5a334" stroke="#ffd484" stroke-width="3"/><path class="mobile-rig-line" d="M198 16 V208" stroke="#c2e5ff" stroke-width="3" fill="none"/><circle cx="198" cy="208" r="8" fill="#ffad41" stroke="#fff3bb" stroke-width="3"/></svg>`;
 document.body.append(mobileRig);
 onNavigate((kind)=>{if(kind==='stage'||kind==='focus'){
  if(!isFishing()){clearTimeout(castTimer);document.body.classList.remove('fishing-reeling');if(dialog.open)closeGallery();resetCast()}
  syncFishingUI();
 }});
 window.addEventListener('keydown',event=>{
  if(!isFishing()||dialog.open)return;
  if(event.key==='Enter'&&!(event.target instanceof HTMLElement&&event.target.closest('a,button'))){event.preventDefault();castFishingLine()}
 });
 syncFishingUI();return {cast:castFishingLine,close:closeGallery,dialog};
}
