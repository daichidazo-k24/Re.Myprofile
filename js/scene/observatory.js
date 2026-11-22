import {state} from '../state.js';
import {resetWorldCamera} from '../ui/orbit-camera.js';
import {TELESCOPE_HOME} from './camera-settings.js';
import {OBSERVATORY,STAIR_ARRIVAL_DISTANCE,buildRooftopTelescope,observatoryClimberPose} from './observatory-layout.js';
export {OBSERVATORY} from './observatory-layout.js';

export function approachLadder(){
 if(!state.entered||state.focused||state.observatoryPhase!=='ground')return false;
 state.atLadder=true;state.aim=OBSERVATORY.x;return true;
}
export function climbLadder(){
 if(!state.entered||state.focused||!state.atLadder||state.observatoryPhase!=='ground'||Math.abs(state.cameraX-OBSERVATORY.x)>=STAIR_ARRIVAL_DISTANCE)return false;
 state.observatoryPhase='climbing';return true;
}
export function descendLadder(){
 if(!['top','viewing'].includes(state.observatoryPhase))return false;
 state.cameraUnlocked=false;resetWorldCamera();state.observatoryPhase='descending';return true;
}
export function useTelescope(){
 if(state.observatoryPhase!=='top')return false;
 resetWorldCamera();state.orbitYaw=TELESCOPE_HOME.yaw;state.orbitPitch=TELESCOPE_HOME.pitch;
 state.telescopeSession++;
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
 const step=state.reduceMotion?OBSERVATORY.height:Math.max(0,Math.min(dt,.05))*5;
 state.observatoryHeight+=Math.sign(target-state.observatoryHeight)*Math.min(step,Math.abs(target-state.observatoryHeight));
 if(state.observatoryHeight===target)state.observatoryPhase=phase==='climbing'?'top':'ground';
}

/** The fixed stair, ladder and roof deck are part of the island mesh. */
export function drawObservatory({box,quad},{minerTex,uprightTex,climbTextures,walk},time){
 if(state.observatoryPhase==='viewing')return;
 buildRooftopTelescope(box);
 if(state.atLadder&&!walk){
  const {x,y,z,onStairs,onLadder}=observatoryClimberPose(state.observatoryHeight);
  const frame=Math.floor(time*7)%2;
  const texture=(onLadder?climbTextures[frame]:onStairs?uprightTex:minerTex)||minerTex;
  if(texture)quad(x,y+OBSERVATORY.actorCenter,z,OBSERVATORY.actorWidth,OBSERVATORY.actorHeight,'#ffffff',texture);
 }
}
