/** Fishing rod/hook click target, reel animation, and a separate catchable gallery. */
import {FISH_IMAGES} from './data.js';
import {FISHING_CONTENT} from '../content/fishing.js';
import {fishingState,startCast,finishCast,resetCast} from './state.js';
import {state} from '../state.js';
import {STAGES} from '../data/stages.js';
import {onNavigate} from '../ui/navigation.js';
import {beep} from '../ui/audio.js';
const fishingIndex=STAGES.findIndex(s=>s.id==='fishing');
let hotspot=null,dialog=null,viewer=null,viewImg=null,castTimer=0,lastAnchor=0;
const isFishing=()=>state.entered&&state.active===fishingIndex;
/** Gallery dialogs are modal: background camera controls must not consume any input. */
export const isFishingOverlayActive=()=>Boolean(dialog?.open||viewer?.open);
const escText=(text)=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localPhoto=(entry)=>globalThis.__questPreviewFishPhotos?.[entry.id-1]||entry.src;
function makePhoto(entry){
 const img=document.createElement('img');img.src=localPhoto(entry);img.alt=entry.alt;
 img.loading='lazy';img.decoding='async';img.dataset.photoId=String(entry.id);
 return img;
}
function showPhoto(entry,image){
 viewImg.src=image.src;viewImg.alt=entry.alt;
 const caption=viewer.querySelector('[data-caption]');caption.textContent=`${entry.id} / ${FISH_IMAGES.length} · ${entry.alt}`;
 if(!viewer.open)viewer.showModal();
}
function makeGallery(){
 dialog=document.createElement('dialog');dialog.id='fishingGallery';dialog.className='fishing-gallery-dialog';dialog.setAttribute('aria-label','釣果ギャラリー');
 dialog.innerHTML=`<div class="fishing-gallery-shell"><header class="gallery-masthead"><span class="gallery-icon">🐟</span><div><span class="gallery-mini-label">${escText(FISHING_CONTENT.miniLabel)}</span><h2>${escText(FISHING_CONTENT.title)}</h2><p>${escText(FISHING_CONTENT.intro)}</p><span class="gallery-scroll-hint">▼ SCROLL TO SEE ALL ${FISH_IMAGES.length} PHOTOS</span></div><button class="gallery-close" id="closeCatch" type="button" aria-label="釣果ギャラリーを閉じる">×</button></header><div class="gallery-photogrid" id="galleryPhotogrid"></div><footer class="gallery-footer"><span>${FISH_IMAGES.length} FISH CAUGHT</span><button id="releaseCatch" type="button">↶ WORLDへ戻る</button></footer></div>`;
 viewer=document.createElement('dialog');viewer.id='fishingPhotoViewer';viewer.className='fishing-photo-viewer';viewer.innerHTML=`<button type="button" aria-label="画像を閉じる" class="viewer-close">×</button><div class="viewer-image-wrap"><img alt="" id="viewerPhoto"></div><p data-caption></p>`;
 viewImg=viewer.querySelector('img');
 document.body.append(dialog,viewer);
 const grid=dialog.querySelector('#galleryPhotogrid');
 grid.tabIndex=0;
 grid.setAttribute('role','region');
 grid.setAttribute('aria-label',`釣果写真${FISH_IMAGES.length}枚。スクロールして最後まで閲覧できます`);
 for(const entry of FISH_IMAGES){
  const b=document.createElement('button');b.className='gallery-photo';b.type='button';
  b.setAttribute('aria-label',`${entry.alt}を拡大表示`);
  const image=makePhoto(entry);
  image.addEventListener('error',()=>{b.classList.add('is-missing-photo');b.disabled=true;});
  const number=document.createElement('span');number.className='gallery-photo-number';
  number.textContent=`FISH ${String(entry.id).padStart(2,'0')}`;
  b.append(image,number);
  b.addEventListener('click',()=>showPhoto(entry,image));grid.append(b);
 }
 // Do not bubble input to the 3D camera. Native scrolling on the grid remains intact.
 dialog.addEventListener('wheel',event=>{
  if(!dialog.open)return;
  event.stopPropagation();
  const node=event.target instanceof Element?event.target:null;
  if(!node?.closest('#galleryPhotogrid')){
   const unit=event.deltaMode===1?16:event.deltaMode===2?grid.clientHeight:1;
   grid.scrollTop+=event.deltaY*unit;
   if(event.cancelable)event.preventDefault();
  }
 },{capture:true,passive:false});
 viewer.addEventListener('wheel',event=>{
  event.stopPropagation();if(event.cancelable)event.preventDefault();
 },{capture:true,passive:false});
 dialog.addEventListener('keydown',event=>{
  if(!dialog.open||viewer.open)return;
  const key=event.key;
  const d={ArrowDown:80,ArrowUp:-80,PageDown:grid.clientHeight*.8,PageUp:-grid.clientHeight*.8,' ':grid.clientHeight*.8};
  if(Object.prototype.hasOwnProperty.call(d,key)){
   event.preventDefault();event.stopPropagation();grid.scrollTop+=d[key];
  }else if(key==='Home'||key==='End'){
   event.preventDefault();event.stopPropagation();
   grid.scrollTop=key==='Home'?0:grid.scrollHeight;
  }
 },{capture:true});
 dialog.querySelector('#closeCatch').addEventListener('click',closeGallery);
 dialog.querySelector('#releaseCatch').addEventListener('click',closeGallery);
 viewer.querySelector('.viewer-close').addEventListener('click',()=>viewer.close());
 viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close()});
 dialog.addEventListener('click',event=>{if(event.target===dialog)closeGallery()});
 dialog.addEventListener('close',()=>{dialog.classList.remove('is-caught');document.body.classList.remove('has-fishing-catch');fishingState.opened=false;resetCast();syncFishingUI()});
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&dialog.open&&!viewer.open){event.stopImmediatePropagation();closeGallery()}},true);
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
export function closeGallery(){if(viewer?.open)viewer.close();if(dialog?.open)dialog.close();}
export function castFishingLine(){
 if(!isFishing()||dialog?.open)return false;
 if(!startCast(performance.now()))return false;
 beep(420,.08);syncFishingUI();
 document.body.classList.add('fishing-reeling');
 clearTimeout(castTimer);castTimer=setTimeout(()=>{
  document.body.classList.remove('fishing-reeling');finishCast();
  beep(690,.12);dialog.showModal();requestAnimationFrame(()=>{dialog.classList.add('is-caught');document.body.classList.add('has-fishing-catch');dialog.querySelector('#galleryPhotogrid').focus({preventScroll:true})});
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
