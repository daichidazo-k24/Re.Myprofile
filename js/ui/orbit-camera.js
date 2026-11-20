/** Shared camera: frontal stage view, elevated landing, or telescope first person.
 * Telescope yaw/pitch change the viewing ray; its eye never orbits the island.
 */
import {state} from '../state.js';
import {TELESCOPE_EYE} from '../scene/observatory-layout.js';
import {M} from '../scene/math.js';
export const CAMERA_LIMITS=Object.freeze({yaw:1.36,minPitch:-.21,maxPitch:1.27,minDistance:9,maxDistance:43,maxPan:4.4});
const orbitClamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function rotateWorld(dx,dy){
 if(!state.cameraUnlocked)return;
 if(state.observatoryPhase==='viewing'){
  state.orbitYaw=((state.orbitYaw+dx+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
  state.orbitPitch=orbitClamp(state.orbitPitch+dy,-1.4,1.4);return;
 }
 state.orbitYaw=orbitClamp(state.orbitYaw+dx,-CAMERA_LIMITS.yaw,CAMERA_LIMITS.yaw);
 state.orbitPitch=orbitClamp(state.orbitPitch+dy,CAMERA_LIMITS.minPitch,CAMERA_LIMITS.maxPitch);
}
export function zoomWorld(delta){
 if(!state.cameraUnlocked)return;
 state.orbitDistance=orbitClamp(state.orbitDistance*Math.exp(delta*.0012),CAMERA_LIMITS.minDistance,CAMERA_LIMITS.maxDistance);
}
export function panWorld(dx,dy){
 if(!state.cameraUnlocked||state.observatoryPhase==='viewing')return;
 state.orbitPanX=orbitClamp(state.orbitPanX+dx,-CAMERA_LIMITS.maxPan,CAMERA_LIMITS.maxPan);
 state.orbitPanY=orbitClamp(state.orbitPanY+dy,-CAMERA_LIMITS.maxPan,CAMERA_LIMITS.maxPan);
}
export function resetWorldCamera(){
 state.orbitYaw=0;state.orbitPitch=0;state.orbitDistance=17.5;
 state.orbitPanX=0;state.orbitPanY=0;
}
export function worldCameraPose(stageX){
 const {orbitYaw:y,orbitPitch:p,orbitDistance:d,orbitPanX:panX,orbitPanY:panY}=state;
 if(state.observatoryPhase==='viewing'){
  const eye=[...TELESCOPE_EYE],cp=Math.cos(p);
  return {eye,target:[eye[0]+Math.sin(y)*cp,eye[1]+Math.sin(p),eye[2]-Math.cos(y)*cp]};
 }
 const target=[stageX+panX,2.65+panY+state.observatoryHeight,-1.55];
 const cp=Math.cos(p);
 const eye=[target[0]+d*cp*Math.sin(y),target[1]+d*Math.sin(p),target[2]+d*cp*Math.cos(y)];
 return {target,eye};
}
export function telescopeFov(){return orbitClamp(56*state.orbitDistance/17.5,28,90)*Math.PI/180}

/** Convert CSS scene pixels (Y down) into the same first-person world camera. */
export function cssTelescopeView(eye,target,height,units){
 const perspective=height/(2*Math.tan(telescopeFov()/2));
 const toWorld=M.mul(M.move(0,3.08,0),M.size(1/units,-1/units,1/units));
 const toCSS=M.mul(M.move(0,height*.09,perspective),M.size(units,-units,units));
 return {perspective,matrix:M.mul(toCSS,M.mul(M.look(eye,target),toWorld))};
}
