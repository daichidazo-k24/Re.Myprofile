/** Original stage scene, intro, camera and controls; continuous HTML only inside boards. */
import {STAGE_INDEX,STAGES} from './data/stages.js';
import {installPerformanceDiagnostics} from './ui/performance.js';
import {portfolio} from './data/portfolio.js';
import {state} from './state.js';
import {onNavigate,renderNavigation} from './ui/navigation.js';
import {installMobileReader} from './ui/mobile-reader.js';
import {bindControls} from './ui/controls.js';
import {createMiningIntro} from './intro/mining.js';
import {startWebGL} from './scene/webgl.js';
import {startCSS3D} from './scene/css3d.js';
import {installFishingUI} from './fishing/ui.js';
import {installGraphicUI} from './graphic/ui.js';
import {installObservatoryUI} from './ui/observatory.js';
import {ARRIVAL_DISTANCE} from './scene/miner-pose.js';

// The actual HTML documents are already semantic DOM inside the drawable canvas.
// Do not duplicate the long documents into a hidden accessibility mirror.
renderNavigation();
installObservatoryUI();
// Preserve original WebGL world and stage architecture; only the whiteboard
// surfaces are made of one uninterrupted, interactive HTML document each.
let renderer=startWebGL(state)||startCSS3D();
// Progressive fallback only: Chrome 157+ uses true GPU HTML textures.
// No extra DOM overlays are ever mounted in native WebGL mode.
if(renderer.type==='css3d')installMobileReader();
document.addEventListener('quest:native-failed',event=>{
 if(renderer.type==='css3d')return;
 console.warn('Switching to readable CSS3D fallback:',event.detail?.reason);
 renderer.destroy();document.getElementById('worldCanvas').style.display='none';
 renderer=startCSS3D();installMobileReader();
 if(window.__quest3d){window.__quest3d.renderer='css3d';window.__quest3d.htmlInCanvas=false;window.__quest3d.stats=null}
});
const fishing=installFishingUI();
const graphic=installGraphicUI();
const guide=document.getElementById('stageGuide'),guideLetters=[];
for(const paragraph of guide.querySelectorAll('p,h2,li')){
 paragraph.replaceChildren(...Array.from(paragraph.textContent,character=>{
  const letter=document.createElement('span');
  letter.textContent=character;
  letter.className='stage-guide-letter';
  guideLetters.push(letter);
  return letter;
 }));
}
let guideFrame=0;
function updateProfileGuide(delay=0){
 cancelAnimationFrame(guideFrame);
 guide.classList.remove('is-visible');
 if(!state.entered||state.active!==STAGE_INDEX.profile)return;
 let visible=0,start=null;
 function reveal(now){
  if(!state.entered||state.active!==STAGE_INDEX.profile)return;
  if(start===null){
   if(Math.abs(state.cameraX-state.aim)>=ARRIVAL_DISTANCE){guideFrame=requestAnimationFrame(reveal);return}
   guide.scrollTop=0;
   for(const letter of guideLetters)letter.classList.add('is-pending');
   guide.classList.add('is-visible');
   start=now+delay;
  }
  const count=state.reduceMotion?guideLetters.length:Math.min(guideLetters.length,Math.max(0,1+Math.floor((now-start)/40)));
  while(visible<count)guideLetters[visible++].classList.remove('is-pending');
  if(visible<guideLetters.length)guideFrame=requestAnimationFrame(reveal);
 }
 guideFrame=requestAnimationFrame(reveal);
}
onNavigate(kind=>{
 if(kind==='stage')updateProfileGuide();
});
const intro=createMiningIntro(()=>updateProfileGuide(600));
bindControls(intro);
intro.start();
window.__quest3d={renderer:renderer.type,htmlInCanvas:Boolean(renderer.htmlInCanvas),depthOcclusion:false,stats:renderer.stats||null,state,stages:STAGES,portfolio,fishing,graphic,
 getBoard:(i)=>(renderer.boards||document.querySelectorAll('.css3d-stage .board-scroll-area'))[i],
};

installPerformanceDiagnostics(()=>renderer);
