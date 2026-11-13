/** World-view orbit camera shared by WebGL and CSS3D renderers.
 * Values are world-space camera angles (radians), distance and target pan.
 * Stage focus never changes these values, so WORLD VIEW restores the previous angle.
 */
import {state} from '../state.js';
export const CAMERA_LIMITS=Object.freeze({yaw:1.36,minPitch:-.21,maxPitch:1.27,minDistance:9,maxDistance:43,maxPan:4.4});
const orbitClamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function rotateWorld(dx,dy){
 state.orbitYaw=orbitClamp(state.orbitYaw+dx,-CAMERA_LIMITS.yaw,CAMERA_LIMITS.yaw);
 state.orbitPitch=orbitClamp(state.orbitPitch+dy,CAMERA_LIMITS.minPitch,CAMERA_LIMITS.maxPitch);
}
export function zoomWorld(delta){
 state.orbitDistance=orbitClamp(state.orbitDistance*Math.exp(delta*.0012),CAMERA_LIMITS.minDistance,CAMERA_LIMITS.maxDistance);
}
export function panWorld(dx,dy){
 state.orbitPanX=orbitClamp(state.orbitPanX+dx,-CAMERA_LIMITS.maxPan,CAMERA_LIMITS.maxPan);
 state.orbitPanY=orbitClamp(state.orbitPanY+dy,-CAMERA_LIMITS.maxPan,CAMERA_LIMITS.maxPan);
}
export function resetWorldCamera(){
 state.orbitYaw=.14;state.orbitPitch=.22;state.orbitDistance=17.5;
 state.orbitPanX=0;state.orbitPanY=0;
}
export function worldCameraPose(stageX){
 const {orbitYaw:y,orbitPitch:p,orbitDistance:d,orbitPanX:panX,orbitPanY:panY}=state;
 const target=[stageX+panX,2.65+panY,-1.55];
 const cp=Math.cos(p);
 const eye=[target[0]+d*cp*Math.sin(y),target[1]+d*Math.sin(p),target[2]+d*cp*Math.cos(y)];
 return {target,eye};
}
