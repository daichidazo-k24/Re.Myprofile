import {GRAPHIC_CONTENT,GRAPHIC_GROUPS} from '../content/graphic.js';
import {GRAPHIC_IMAGES} from './data.js';
import {GRAPHIC_STAGES,GRAPHIC_BOARD,projectGraphicBoard,pointInGraphicBoard} from './board.js';
import {createGallery,isGalleryOverlayActive} from '../ui/gallery.js';
import {state} from '../state.js';
import {onNavigate} from '../ui/navigation.js';
const quad=new Float32Array(8);
let projected=false,gallery=null;
export function syncGraphicBoard(vp,width,height,eye){
 projected=state.entered&&!state.focused&&GRAPHIC_STAGES.includes(state.active)&&eye[2]>GRAPHIC_BOARD.z&&projectGraphicBoard(vp,width,height,quad);
}
export function openGraphicGallery(){
 if(!state.entered||!GRAPHIC_STAGES.includes(state.active)||isGalleryOverlayActive())return false;
 gallery?.open();return Boolean(gallery);
}
export function installGraphicUI(){
 gallery=createGallery({id:'graphic',title:GRAPHIC_CONTENT.title,label:GRAPHIC_CONTENT.miniLabel,
  intro:GRAPHIC_CONTENT.intro,entries:GRAPHIC_IMAGES,groups:GRAPHIC_GROUPS,itemLabel:'WORKS'});
 const shortcut=document.createElement('button');shortcut.type='button';shortcut.className='graphic-gallery-shortcut';
 shortcut.textContent='Graphic Gallery';shortcut.setAttribute('aria-label','ポスター・ヘッダー作品のGraphic Galleryを開く');
 shortcut.addEventListener('click',openGraphicGallery);document.querySelector('.right-ctl').prepend(shortcut);
 const sync=()=>{const nearby=GRAPHIC_STAGES.includes(state.active);shortcut.hidden=!nearby||state.focused;if(!nearby){projected=false;gallery.close()}};
 onNavigate(sync);sync();
 // Bubble phase respects the existing capture-phase suppression of drag-generated clicks.
 document.getElementById('worldCanvas').addEventListener('click',event=>{
  if(projected&&pointInGraphicBoard(quad,event.clientX,event.clientY)){
   if(openGraphicGallery()){event.preventDefault();event.stopPropagation()}
  }
 });
 return {open:openGraphicGallery,close:gallery.close,dialog:gallery.dialog};
}
