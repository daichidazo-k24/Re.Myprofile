import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/state.js';
import {OBSERVATORY,approachLadder,climbLadder,descendLadder,useTelescope,stopViewing,leaveObservatory,updateObservatory} from '../js/scene/observatory.js';
import {rotateWorld,zoomWorld,panWorld,worldCameraPose} from '../js/ui/orbit-camera.js';
import {TELESCOPE_EYE} from '../js/scene/observatory-layout.js';
import {telescopeFov,telescopeMagnification,setTelescopeMagnification,telescopeLookSensitivity,cssTelescopeView,resetWorldCamera} from '../js/ui/orbit-camera.js';
import {WORLD_CAMERA,TELESCOPE_OPTICS} from '../js/scene/camera-settings.js';
import {M} from '../js/scene/math.js';
beforeEach(()=>{leaveObservatory();Object.assign(state,{entered:true,focused:false,cameraX:0,reduceMotion:false})});
function reachTop(){approachLadder();state.cameraX=OBSERVATORY.x;climbLadder();for(let i=0;i<60;i++)updateObservatory(.05)}
test('ground camera stays fixed under rotation, zoom and pan',()=>{
 const before=worldCameraPose(0);rotateWorld(.5,.5);zoomWorld(500);panWorld(3,3);
 assert.deepEqual(worldCameraPose(0),before);assert.equal(useTelescope(),false);
});
test('climbing requires arrival at the ladder and raises the camera with the player',()=>{
 assert.equal(climbLadder(),false);approachLadder();assert.equal(climbLadder(),false);
 state.cameraX=OBSERVATORY.x;assert.equal(climbLadder(),true);
 updateObservatory(.05);assert.ok(state.observatoryHeight>0&&state.observatoryHeight<OBSERVATORY.height);
 assert.equal(useTelescope(),false);
 for(let i=0;i<60;i++)updateObservatory(.05);
 assert.equal(state.observatoryPhase,'top');assert.equal(state.cameraUnlocked,false);
 assert.equal(worldCameraPose(OBSERVATORY.x).target[1],WORLD_CAMERA.targetHeight+OBSERVATORY.height);
});
test('only telescope unlocks the camera; exiting and descending restore the fixed view',()=>{
 reachTop();const fixed=worldCameraPose(OBSERVATORY.x);assert.equal(useTelescope(),true);const before=worldCameraPose(OBSERVATORY.x);
 rotateWorld(.4,.2);assert.notDeepEqual(worldCameraPose(OBSERVATORY.x),before);
 assert.equal(stopViewing(),true);assert.deepEqual(worldCameraPose(OBSERVATORY.x),fixed);
 useTelescope();assert.equal(descendLadder(),true);assert.equal(state.cameraUnlocked,false);
 for(let i=0;i<60;i++)updateObservatory(.05);
 assert.equal(state.observatoryHeight,0);assert.equal(state.observatoryPhase,'ground');
});
test('map camera stays frontal, slightly elevated and tilted upward',()=>{
 const pose=worldCameraPose(OBSERVATORY.x);
 assert.equal(pose.eye[0],pose.target[0]);
 assert.ok(pose.eye[1]>2.65&&pose.eye[1]<3.5,'slightly higher than the previous map view');
 assert.ok(pose.target[1]>pose.eye[1],'looks upward without introducing lateral yaw');
 assert.ok(OBSERVATORY.z< -1.55);
});
test('telescope opens at default magnification, caps all zoom at 3x, and resets on reentry',()=>{
 reachTop();useTelescope();
 assert.equal(state.telescopeFovDegrees,56);
 assert.equal(telescopeMagnification(),1);
 const sensitivity=telescopeLookSensitivity(),eye=worldCameraPose(0).eye;
 zoomWorld(-99999);assert.equal(state.telescopeFovDegrees,TELESCOPE_OPTICS.minFov);
 assert.ok(Math.abs(telescopeMagnification()-3)<1e-12);
 assert.ok(telescopeLookSensitivity()<sensitivity,'high magnification needs finer motion');
 zoomWorld(99999);assert.equal(state.telescopeFovDegrees,TELESCOPE_OPTICS.maxFov);
 assert.equal(telescopeMagnification(),1);
 setTelescopeMagnification(2.5);assert.ok(Math.abs(telescopeMagnification()-2.5)<1e-12);
 setTelescopeMagnification(10);assert.ok(Math.abs(telescopeMagnification()-3)<1e-12);
 setTelescopeMagnification(-10);assert.equal(telescopeMagnification(),1);
 setTelescopeMagnification(NaN);assert.equal(telescopeMagnification(),1);
 assert.deepEqual(worldCameraPose(0).eye,eye);
 resetWorldCamera();assert.equal(state.telescopeFovDegrees,56);
 setTelescopeMagnification(3);stopViewing();useTelescope();assert.equal(telescopeMagnification(),1);
});
test('telescope is first person: full-circle look and zoom never move the eye',()=>{
 reachTop();useTelescope();const before=worldCameraPose(0);assert.deepEqual(before.eye,TELESCOPE_EYE);
 rotateWorld(Math.PI,0);const behind=worldCameraPose(0);
 assert.deepEqual(behind.eye,before.eye);assert.ok(behind.target[2]>behind.eye[2]);
 const fov=telescopeFov();zoomWorld(-200);panWorld(2,2);
 assert.deepEqual(worldCameraPose(0),behind);assert.ok(telescopeFov()<fov);
 rotateWorld(18*Math.PI,999);const up=worldCameraPose(0);
 assert.deepEqual(up.eye,before.eye);assert.ok(up.target.every(Number.isFinite));
 assert.equal(state.orbitPitch,1.4);
});
test('CSS first-person projection matches WebGL camera for front, side and rear views',()=>{
 reachTop();useTelescope();
 const width=1280,height=720,units=800/13.5;
 const transform=(m,p)=>[0,1,2,3].map(row=>m[row]*p[0]+m[4+row]*p[1]+m[8+row]*p[2]+m[12+row]);
 for(const yaw of [0,1.2,Math.PI,-2.7]){
  state.orbitYaw=yaw;state.orbitPitch=.3;
  const {eye,target}=worldCameraPose(0),view=cssTelescopeView(eye,target,height,units);
  const worldPoint=eye.map((v,i)=>v+(target[i]-v)*10);worldPoint[1]+=.4;
  const cssPoint=[worldPoint[0]*units,(3.08-worldPoint[1])*units,worldPoint[2]*units];
  const css=transform(view.matrix,cssPoint),scale=view.perspective/(view.perspective-css[2]);
  const px=width/2+css[0]*scale,py=height/2+(css[1]-height*.09)*scale;
  const vp=M.mul(M.persp(telescopeFov(),width/height,.1,120),M.look(eye,target)),gpu=transform(vp,worldPoint);
  assert.ok(Math.abs(px-(gpu[0]/gpu[3]+1)*width/2)<.03);
  assert.ok(Math.abs(py-(1-gpu[1]/gpu[3])*height/2)<.03);
 }
});
test('navigation reset and reduced motion cannot leave an unlocked or elevated camera',()=>{
 state.reduceMotion=true;approachLadder();state.cameraX=OBSERVATORY.x;climbLadder();updateObservatory(0);
 assert.equal(state.observatoryPhase,'top');useTelescope();leaveObservatory();
 assert.equal(state.cameraUnlocked,false);assert.equal(state.atLadder,false);assert.equal(state.observatoryHeight,0);
 state.focused=true;assert.equal(approachLadder(),false);
});
