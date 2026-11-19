import test from 'node:test';
import assert from 'node:assert/strict';
import {M} from '../js/scene/math.js';
import {createSkyCamera,updateSkyCamera,updateCSSSkyCamera} from '../js/scene/sky-camera.js';

const norm=v=>{const n=Math.hypot(...v);return v.map(x=>x/n)};
const ray=(camera,x,y)=>norm([0,1,2].map(i=>camera.rays[i]*x+camera.rays[i+3]*y+camera.rays[i+6]));
const close=(actual,expected)=>actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<2e-6,`${actual} != ${expected}`));

test('sky rays agree with the actual world projection across orbit, pan, focus and portrait',()=>{
 const camera=createSkyCamera(),rays=camera.rays,eyeBuffer=camera.eye;
 for(const [eye,target,fov,aspect] of [
  [[2.4,6.4,15.3],[0,2.65,-1.55],.98,1.6],
  [[41,15,-3],[30,5,-1],1.17,390/844],
  [[67.68,4.09,8.15],[67.5,3.65,-1.55],.70,1.6],
  [[-8,39,6],[1,3,-1],1.17,1.6],
 ]){
  updateSkyCamera(camera,eye,target,fov,aspect);
  const vp=M.mul(M.persp(fov,aspect,.1,120),M.look(eye,target));
  for(const offset of [[0,0,0],[2,1,-2],[-3,-1,-5]]){
   const point=target.map((v,i)=>v+offset[i]);
   const project=row=>vp[row]*point[0]+vp[row+4]*point[1]+vp[row+8]*point[2]+vp[row+12];
   close(ray(camera,project(0)/project(3),project(1)/project(3)),norm(point.map((v,i)=>v-eye[i])));
  }
  assert.equal(camera.rays,rays);assert.equal(camera.eye,eyeBuffer);
 }
});

test('CSS sky rays use the CSS perspective, off-center origin and world rotation',()=>{
 const camera=createSkyCamera(),units=800/13.5;
 for(const c of [
  {width:1440,height:900,perspective:1120,scale:1.05,yaw:-.4,pitch:.2,x:80,y:-40,z:100,stageX:1600,units},
  {width:390,height:844,perspective:880,scale:.35,yaw:.8,pitch:1.1,x:-35,y:113,z:-250,stageX:4000,units},
 ]){
  updateCSSSkyCamera(camera,c);
  for(const point of [[c.stageX/units,3,0],[c.stageX/units+4,7,-3]]){
   // Project a world point through the actual CSS transform order and perspective.
   const local=[(point[0]*units-c.stageX)*c.scale,-point[1]*units*c.scale,point[2]*units*c.scale];
   const world=M.mul(M.rotY(c.yaw),M.rotX(c.pitch));
   const css=[0,1,2].map(i=>world[i]*local[0]+world[i+4]*local[1]+world[i+8]*local[2]);
   const depth=c.perspective-css[2]-c.z;
   const nx=(css[0]+c.x)*c.perspective/depth/(c.width/2);
   const ny=-(css[1]+c.y-c.height*.09)*c.perspective/depth/(c.height/2);
   close(ray(camera,nx,ny),norm(point.map((v,i)=>v-camera.eye[i])));
  }
 }
});
