import {state} from '../state.js';
import {selectStage,toggleFocus,setFocus} from './navigation.js';
import {scrollBoard,scrollToStart,scrollToEnd} from './board-scroll.js';
import {isGalleryOverlayActive} from './gallery.js';
import {rotateWorld,zoomWorld,panWorld,resetWorldCamera,telescopeLookSensitivity} from './orbit-camera.js';
import {approachLadder,climbLadder,descendLadder,stopViewing,useTelescope} from '../scene/observatory.js';
import {OBSERVATORY} from '../scene/observatory-layout.js';
import {STAGES} from '../data/stages.js';

/** World mode: click/drag, touch gestures and trackpad update the actual camera.
 * Focus mode: native scroll and links on the live HTML board stay interactive.
 */
export function bindControls(intro){
 document.querySelectorAll('.chapter').forEach(btn=>btn.addEventListener('click',()=>{
  if(!state.entered)intro.finish();selectStage(+btn.dataset.section);
 }));
 document.getElementById('replayBtn').addEventListener('click',()=>intro.replay());
 document.getElementById('skipIntro').addEventListener('click',()=>intro.finish());

 // Optional compact button panel for touchscreens and keyboard-only users.
 const cameraToggle=document.getElementById('cameraToggle');
 const cameraPad=document.getElementById('cameraPad');
 const closePad=()=>{cameraPad.classList.remove('is-open');cameraToggle.setAttribute('aria-expanded','false')};
 cameraToggle.addEventListener('click',()=>{
  const open=!cameraPad.classList.contains('is-open');cameraPad.classList.toggle('is-open',open);
  cameraToggle.setAttribute('aria-expanded',String(open));
 });
 document.querySelectorAll('[data-cam]').forEach(button=>button.addEventListener('click',()=>{
  if(!state.entered||state.focused||!state.cameraUnlocked)return;
  const cmd=button.dataset.cam;
  if(cmd==='left')rotateWorld(-.18,0);
  if(cmd==='right')rotateWorld(.18,0);
  if(cmd==='up')rotateWorld(0,.15);
  if(cmd==='down')rotateWorld(0,-.15);
  if(cmd==='plus')zoomWorld(-165);
  if(cmd==='minus')zoomWorld(165);
  if(cmd==='reset')resetWorldCamera();
 }));

 window.addEventListener('keydown',event=>{
  if(isGalleryOverlayActive())return;
  if(event.key==='Escape'){
   if(stopViewing()){event.preventDefault();return}
   if(state.focused){event.preventDefault();setFocus(false);return}
   closePad();return;
  }
  if(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(['Enter',' '].includes(event.key)&&event.target instanceof HTMLElement&&event.target.closest('a,button'))return;
  if(!state.entered){if(['ArrowRight','ArrowLeft','PageDown','PageUp',' ','Enter'].includes(event.key)){event.preventDefault();intro.finish()}return}
  if(state.focused){
   if(['ArrowDown','PageDown',' ','ArrowUp','PageUp','Home','End'].includes(event.key)){
    event.preventDefault();
    if(event.key==='Home')scrollToStart(state.active);
    else if(event.key==='End')scrollToEnd(state.active);
    else scrollBoard(['ArrowUp','PageUp'].includes(event.key)?-(event.key==='PageUp'?340:95):(event.key==='PageDown'||event.key===' '?340:95));
    return;
   }
  }else{
   if(state.observatoryPhase!=='ground'){
    if(event.key==='Enter'&&state.observatoryPhase==='top'){event.preventDefault();useTelescope();return}
    if(event.key==='ArrowDown'&&!state.cameraUnlocked){event.preventDefault();descendLadder();return}
    if(!state.cameraUnlocked){if(event.key.startsWith('Arrow'))event.preventDefault();return}
    if(event.key.startsWith('Arrow')){
     event.preventDefault();const step=.12*telescopeLookSensitivity();
     rotateWorld(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?step:event.key==='ArrowDown'?-step:0);return;
    }
    if(['PageDown','PageUp',' ','Enter','z','Z'].includes(event.key)){event.preventDefault();return}
   }
   if(['ArrowRight','ArrowLeft','PageDown','PageUp',' '].includes(event.key)){
    event.preventDefault();
    const direction=['ArrowLeft','PageUp'].includes(event.key)?-1:1;
    const {leftStage,rightStage}=OBSERVATORY;
    if(state.atLadder){selectStage(direction<0?leftStage:rightStage);return}
    if((state.active===leftStage&&direction===1)||(state.active===rightStage&&direction===-1)){approachLadder();return}
    selectStage(state.active+direction);return;
   }
   if(event.key==='ArrowUp'){event.preventDefault();if(!climbLadder())rotateWorld(0,.12);return}
   if(event.key==='ArrowDown'){event.preventDefault();rotateWorld(0,-.12);return}
   if(['+','=','-','_'].includes(event.key)){
    event.preventDefault();zoomWorld(['+','='].includes(event.key)?-125:125);return;
   }
   if(event.key==='0'){resetWorldCamera();return}
  }
  if(/^[1-9]$/.test(event.key)&&Number(event.key)<=STAGES.length){selectStage(Number(event.key)-1);return}
  if(['Enter','z','Z'].includes(event.key)){event.preventDefault();toggleFocus();return}
  if(event.key.toLowerCase()==='r'){intro.replay();return}
 });

 const pointers=new Map();
 let gestureMoved=false,justDraggedUntil=0,pinchDistance=null;
 const ignoreTarget=target=>target instanceof Element&&!!target.closest('.top-hud,.bottom-hud,.chapter-dock,.camera-controls-root,.side-action,.fishing-ui,.fishing-gallery,.intro-screen,button,a,input,textarea,select,dialog');
 const distance=()=>{
  if(pointers.size<2)return null;
  const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);
 };
 document.addEventListener('pointerdown',event=>{
  if(isGalleryOverlayActive()||!state.entered||state.focused||!state.cameraUnlocked||ignoreTarget(event.target))return;
  if(event.pointerType==='mouse'&&event.button!==0)return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,shift:event.shiftKey});
  gestureMoved=false;pinchDistance=distance();
 },true);
 document.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;
  if(isGalleryOverlayActive()||!state.entered||state.focused||!state.cameraUnlocked){pointers.clear();return}
  const previous=pointers.get(event.pointerId),dx=event.clientX-previous.x,dy=event.clientY-previous.y;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,shift:event.shiftKey});
  if(Math.abs(dx)+Math.abs(dy)>.8){gestureMoved=true;justDraggedUntil=performance.now()+250}
  if(pointers.size>=2){
   const currentDistance=distance();
   if(pinchDistance!==null&&currentDistance!==null)zoomWorld((pinchDistance-currentDistance)*1.8);
   pinchDistance=currentDistance;
  }else if(state.observatoryPhase==='viewing'){const sensitivity=.004*telescopeLookSensitivity();rotateWorld(dx*sensitivity,-dy*sensitivity)}
  else if(event.shiftKey){panWorld(-dx*.013,dy*.013)}
  else rotateWorld(-dx*.006,-dy*.0052);
  if(event.cancelable)event.preventDefault();
 },{capture:true,passive:false});
 const endPointer=event=>{
  if(!pointers.has(event.pointerId))return;
  pointers.delete(event.pointerId);pinchDistance=distance();
  if(gestureMoved)justDraggedUntil=performance.now()+200;
 };
 document.addEventListener('pointerup',endPointer,true);
 document.addEventListener('pointercancel',endPointer,true);
 document.addEventListener('click',event=>{
  // Looking through the eyepiece must not activate a board behind the view.
  if(state.observatoryPhase==='viewing'&&event.target instanceof Element&&event.target.closest('.css3d-stage,#worldCanvas')){
   event.preventDefault();event.stopImmediatePropagation();return;
  }
  if(performance.now()<=justDraggedUntil && event.target instanceof Element &&
     event.target.closest('.css3d-stage,#worldCanvas')){
   event.preventDefault();event.stopImmediatePropagation();justDraggedUntil=0;
  }
 },true);

 window.addEventListener('wheel',event=>{
  if(isGalleryOverlayActive()||!state.entered)return;
  const node=event.target instanceof Element?event.target:null;
  if(node?.closest('.chapter-dock,.bottom-hud,.top-hud,.camera-controls-root,.fishing-gallery,.fishing-ui'))return;
  // Focus mode scrolls the document; do not steal native wheel or link events.
  if(state.focused){
   if(node?.closest('.board-scroll-area')&&!node.closest('.hic-board-viewport'))return;
   event.preventDefault();scrollBoard(event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?560:1));
   return;
  }
  event.preventDefault();
  const unit=event.deltaMode===1?16:event.deltaMode===2?560:1;
  // Trackpads: two-finger movement orbits. Pinch is ctrl+wheel.
  if(event.ctrlKey||event.altKey)zoomWorld(event.deltaY*unit);
  else if(state.observatoryPhase==='viewing')zoomWorld(event.deltaY*unit);
  else if(event.shiftKey){panWorld(-event.deltaY*unit*.008,-event.deltaX*unit*.008)}
  else rotateWorld(-(event.deltaX*unit)*.0023,-(event.deltaY*unit)*.0023);
 },{passive:false});
}
