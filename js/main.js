/** Original stage scene, intro, camera and controls; continuous HTML only inside boards. */
import {STAGES} from './data/stages.js';
import {installPerformanceDiagnostics} from './ui/performance.js';
import {portfolio} from './data/portfolio.js';
import {state} from './state.js';
import {renderNavigation} from './ui/navigation.js';
import {installMobileReader} from './ui/mobile-reader.js';
import {bindControls} from './ui/controls.js';
import {createMiningIntro} from './intro/mining.js';
import {startWebGL} from './scene/webgl.js';
import {startCSS3D} from './scene/css3d.js';
import {installFishingUI} from './fishing/ui.js';
import {installGraphicUI} from './graphic/ui.js';
import {installObservatoryUI} from './ui/observatory.js';

// The actual HTML documents are already semantic DOM inside the drawable canvas.
// Do not duplicate all five long documents into a hidden accessibility mirror.
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
const intro=createMiningIntro();
bindControls(intro);
intro.start();
window.__quest3d={renderer:renderer.type,htmlInCanvas:Boolean(renderer.htmlInCanvas),depthOcclusion:false,stats:renderer.stats||null,state,stages:STAGES,portfolio,fishing,graphic,
 getBoard:(i)=>(renderer.boards||document.querySelectorAll('.css3d-stage .board-scroll-area'))[i],
};

installPerformanceDiagnostics(()=>renderer);
