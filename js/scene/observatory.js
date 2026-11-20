import {state} from '../state.js';
import {resetWorldCamera} from '../ui/orbit-camera.js';
import {OBSERVATORY} from './observatory-layout.js';
export {OBSERVATORY} from './observatory-layout.js';

export function approachLadder(){
 if(!state.entered||state.focused||state.observatoryPhase!=='ground')return false;
 state.atLadder=true;state.aim=OBSERVATORY.x;return true;
}
export function climbLadder(){
 if(!state.entered||state.focused||!state.atLadder||state.observatoryPhase!=='ground'||Math.abs(state.cameraX-OBSERVATORY.x)>.3)return false;
 state.observatoryPhase='climbing';return true;
}
export function descendLadder(){
 if(!['top','viewing'].includes(state.observatoryPhase))return false;
 state.cameraUnlocked=false;resetWorldCamera();state.observatoryPhase='descending';return true;
}
export function useTelescope(){
 if(state.observatoryPhase!=='top')return false;
 resetWorldCamera();state.orbitPitch=.22;
 state.cameraUnlocked=true;state.observatoryPhase='viewing';return true;
}
export function stopViewing(){
 if(state.observatoryPhase!=='viewing')return false;
 state.cameraUnlocked=false;resetWorldCamera();state.observatoryPhase='top';return true;
}
export function leaveObservatory(){
 state.atLadder=false;state.observatoryPhase='ground';state.observatoryHeight=0;
 state.cameraUnlocked=false;resetWorldCamera();
}
export function updateObservatory(dt){
 const phase=state.observatoryPhase;
 if(phase!=='climbing'&&phase!=='descending')return;
 const target=phase==='climbing'?OBSERVATORY.height:0;
 const step=state.reduceMotion?OBSERVATORY.height:Math.max(0,Math.min(dt,.05))*3.6;
 state.observatoryHeight+=Math.sign(target-state.observatoryHeight)*Math.min(step,Math.abs(target-state.observatoryHeight));
 if(state.observatoryHeight===target)state.observatoryPhase=phase==='climbing'?'top':'ground';
}

/** Physical ladder, elevated landing and a brass telescope, in world coordinates. */
export function drawObservatory({box,quad},minerTex,climbTextures=[],time=0){
 const {x,z,height:h}=OBSERVATORY;
 for(const side of [-1,1]){
  box(x+side*.61,h/2,z,.15,h,.18,'#e6ad59');
  box(x+side*1.5,h/2,z-1.5,.22,h,.22,'#354b72');
 }
 for(let y=.35;y<h;y+=.48)box(x,y,z+.05,1.25,.12,.22,'#ffd083');
 box(x,h-.16,z-1.1,3.8,.32,3.2,'#34486f');
 box(x,h+.03,z-1.1,3.8,.09,3.2,'#9fb8d9');
 for(const side of [-1,1]){
  box(x+side*1.75,h+.65,z-2.5,.12,1.3,.12,'#e6ad59');
  box(x+side*1.75,h+.65,z+.25,.12,1.3,.12,'#e6ad59');
  box(x+side*1.75,h+1.3,z-1.1,.12,.12,2.8,'#e6ad59');
 }
 box(x,h+1.3,z-2.5,3.5,.12,.12,'#e6ad59');
 // The observer looks through the telescope; do not draw their own sprite/tube.
 if(state.observatoryPhase==='viewing')return;
 const tx=x+.65,tz=z-1.15;
 box(tx,h+.8,tz,.16,1.6,.16,'#9fb8d9');
 for(const s of [-1,1])box(tx+s*.35,h+.45,tz,.12,1,.16,'#6e86ad',0,0,-s*.5);
 box(tx,h+1.75,tz,1.65,.45,.5,'#e6ad59',0,0,.35);
 box(tx+.78,h+2.03,tz,.22,.62,.65,'#263c64',0,0,.35);
 box(tx+.9,h+2.07,tz,.08,.48,.51,'#84e0ca',0,0,.35);
 box(tx-.87,h+1.44,tz,.35,.22,.25,'#182548',0,0,.35);
 if(state.atLadder){
  const atTop=['top','viewing'].includes(state.observatoryPhase);
  const frame=Math.floor(time*7)%2;
  const animating=['climbing','descending'].includes(state.observatoryPhase);
  const texture=animating?(climbTextures[frame]||minerTex):minerTex;
  if(texture)quad(x-(atTop?.8:0),state.observatoryHeight+1.05,z+.35,1.9,1.65,'#ffffff',texture);
 }
}
