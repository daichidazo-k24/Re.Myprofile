import test from 'node:test';
import assert from 'node:assert/strict';
import {SKY_DOME_CENTER,SKY_DOME_RADIUS,skyDomeDirection} from '../js/scene/sky-dome.js';
import {createAuroraPanels} from '../js/scene/aurora-panel-model.js';
import {createSkyCamera,updateCSSSkyCamera} from '../js/scene/sky-camera.js';
import {CAMERA_LIMITS,worldCameraPose} from '../js/ui/orbit-camera.js';
import {state} from '../js/state.js';
import {STAGES,STEP} from '../js/data/stages.js';

test('every sky ray lands on a round shell with identical horizontal and vertical radii',()=>{
 const out=new Float64Array(3);
 for(const eye of [[0,6,18],[67.5,14,8],[33.75,-10,70],[-55,48,-32]]){
  for(const ray of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[.3,.8,-.5]]){
   assert.equal(skyDomeDirection(eye,ray,out),out);
   assert.ok(Math.abs(Math.hypot(...out)-1)<1e-12);
   const hit=Array.from(out,(v,i)=>v*SKY_DOME_RADIUS+SKY_DOME_CENTER[i]);
   const delta=hit.map((v,i)=>v-eye[i]),length=Math.hypot(...delta),rayLength=Math.hypot(...ray);
   delta.forEach((v,i)=>assert.ok(Math.abs(v/length-ray[i]/rayLength)<1e-12));
  }
 }
});

test('sky ray intersections coincide with the hinges on the same spherical screen',()=>{
 const panels=createAuroraPanels(),out=new Float64Array(3);
 for(const eye of [[0,6,18],[33.75,40,0],[67.5,4,9],[-30,16,65]]){
  for(let i=0;i<panels.length;i+=67){
   const direction=panels[i].center;
   const ray=direction.map((v,j)=>SKY_DOME_CENTER[j]+v*SKY_DOME_RADIUS-eye[j]);
   skyDomeDirection(eye,ray,out);
   direction.forEach((v,j)=>assert.ok(Math.abs(v-out[j])<1e-12,'projection layers cannot slide onto different shells'));
  }
 }
});

test('the spherical enclosure contains every stage at desktop/mobile orbit and intro extremes',()=>{
 const prior={...state},camera=createSkyCamera(),limits=CAMERA_LIMITS;
 const inside=eye=>assert.ok(Math.hypot(...Array.from(eye,(v,i)=>v-SKY_DOME_CENTER[i]))<SKY_DOME_RADIUS);
 try{
  for(let stage=0;stage<STAGES.length;stage++)for(const yaw of [-limits.yaw,0,limits.yaw]){
   for(const pitch of [limits.minPitch,limits.maxPitch])for(const distance of [limits.minDistance,limits.maxDistance]){
    Object.assign(state,{orbitYaw:yaw,orbitPitch:pitch,orbitDistance:distance,orbitPanX:limits.maxPan,orbitPanY:limits.maxPan});
    inside(worldCameraPose(stage*STEP).eye);
    for(const [width,height] of [[320,844],[390,844],[1440,900],[3440,1440]])for(const entered of [false,true]){
     const scale=Math.max(.30,Math.min(1.05,width/(width<680?1110:1330)));
     updateCSSSkyCamera(camera,{width,height,perspective:width<=800?880:1120,scale,
      yaw:-yaw,pitch:pitch-9*Math.PI/180,x:limits.maxPan*59,y:(entered?0:-12)-limits.maxPan*48,
      z:(entered?35:-360)+(17.5-distance)*41,stageX:stage*800,units:800/STEP});
     inside(camera.eye);
    }
   }
  }
 }finally{Object.assign(state,prior)}
});
