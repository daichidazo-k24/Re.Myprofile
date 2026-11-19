import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSkyStars,createMiningSkyBridge,projectMiningTargets,advanceMiningStar,
 MINING_STAR_COUNT,SKY_STAR_COUNT,STAR_MIN_PIXELS,STAR_MAX_PIXELS} from '../js/scene/sky-model.js';
import {createSkyRenderer} from '../js/scene/sky.js';
import {STAGES,STEP} from '../js/data/stages.js';
import {M} from '../js/scene/math.js';

test('fixed stars cover the sky at every stage, at the original mined-star depth',()=>{
 const stars=createSkyStars();
 assert.equal(stars.length,SKY_STAR_COUNT);assert.deepEqual(stars,createSkyStars());
 assert.ok(stars.every(s=>s.position[2]<=-7&&s.position[2]>=-13));
 assert.ok(stars.every(s=>s.size>=.2&&s.size<=.34));
 for(const [width,height] of [[1440,900],[390,844]])for(let stage=0;stage<STAGES.length;stage++){
  const x=stage*STEP;
  const vp=M.mul(M.persp((width<750?67:56)*Math.PI/180,width/height,.1,120),M.look([x+2.4,6.47,15.36],[x,2.65,-1.55]));
  const bridge=createMiningSkyBridge();projectMiningTargets(bridge,stars,vp,width,height);
  assert.ok(bridge.targetCount>=12&&bridge.targetCount<=MINING_STAR_COUNT);
  const indices=Array.from(bridge.indices.slice(0,bridge.targetCount));
  assert.equal(new Set(indices).size,bridge.targetCount,'no duplicate destination');
  const xs=indices.map((_,i)=>bridge.targets[i*3]),ys=indices.map((_,i)=>bridge.targets[i*3+1]);
  assert.ok(Math.min(...xs)<.12&&Math.max(...xs)>.8,'stars reach both sides of each screen');
  assert.ok(Math.max(...ys)-Math.min(...ys)>.3,'stars have a broad vertical spread');
  assert.ok(xs.every(x=>x>=.04&&x<=.96)&&ys.every(y=>y>=.04&&y<=.7));
  projectMiningTargets(bridge,stars,vp,width,height);
  assert.deepEqual(Array.from(bridge.indices.slice(0,bridge.targetCount)),indices,'destinations stay fixed during flight');
 }
});

test('intro destinations agree with world projection and size in portrait/landscape, zoom and orbit',()=>{
 const bridge=createMiningSkyBridge(),stars=createSkyStars();
 const targets=bridge.targets;
 for(const [width,height,ratio] of [[1440,900,1],[585,1100,1.5],[1800,1100,1.22]]){
  for(const eye of [[2.4,6.47,15.36],[-8,10,12],[2,5,30]]){
   const vp=M.mul(M.persp(56*Math.PI/180,width/height,.1,120),M.look(eye,[0,2.65,-1.55]));
   projectMiningTargets(bridge,stars,vp,width,height,ratio);
   assert.equal(bridge.targets,targets,'reuse storage');
   for(let i=0;i<bridge.targetCount;i++){
    const star=stars[bridge.indices[i]];
    const [x,y,z]=star.position,w=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];
    const nx=(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w;
    const ny=(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w;
    assert.ok(Math.abs((bridge.targets[i*3]*2-1)-nx)<1e-6);
    assert.ok(Math.abs((1-bridge.targets[i*3+1]*2)-ny)<1e-6);
    assert.ok(Math.abs(bridge.targets[i*3+2]-Math.min(STAR_MAX_PIXELS,Math.max(STAR_MIN_PIXELS,star.size*height/w/ratio)))<1e-6);
   }
  }
 }
});

test('mined particles are ballistic first, then rise smoothly to the exact star at any refresh rate',()=>{
 const make=()=>({startX:100,startY:600,vx:30,vy:-90,age:0,initialSize:8});
 const a=make();advanceMiningStar(a,.1,200,100,5);
 assert.equal(a.x,103);assert.equal(a.y,592.35);assert.equal(a.glow,0);
 for(const hz of [30,60,120]){
  const p=make();let previousY=600;
  for(let i=0;i<hz*2;i++){
   advanceMiningStar(p,1/hz,200,100,5);
   assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
   assert.ok(Math.abs(p.y-previousY)<35,'no jump during flight');previousY=p.y;
  }
  assert.equal(p.x,200);assert.equal(p.y,100);assert.equal(p.size,5);assert.equal(p.glow,1);assert.equal(p.settled,true);
 }
 const p=make();advanceMiningStar(p,5,200,100,5);assert.equal(p.settled,true);
});

// A GL contract double verifies actual submissions, uniform state and cleanup.
function fakeGL(){
 let bound=null;
 const uploads=[],draws=[],deleted=[],uniforms={},enabled=new Set(),attribs=new Map();
 const gl={ARRAY_BUFFER:1,STATIC_DRAW:2,FLOAT:3,TRIANGLES:4,VERTEX_SHADER:5,FRAGMENT_SHADER:6,COMPILE_STATUS:7,LINK_STATUS:8,
  createProgram:()=>({}),createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,
  attachShader(){},linkProgram(){},getProgramParameter:()=>true,getAttribLocation:(_,n)=>['aFrom','aTo','aCorner','aStyle','aColor'].indexOf(n),
  getUniformLocation:(_,n)=>n,createBuffer:()=>({}),bindBuffer(_,b){bound=b},bufferData(_,data){bound.length=data.length;uploads.push(data)},
  useProgram(){},depthMask(value){this.depthWrite=value},
  uniformMatrix4fv(name,transpose,value){assert.equal(transpose,false);uniforms[name]=Array.from(value)},
  uniform2f(name,x,y){uniforms[name]=[x,y]},
  uniform1f(name,value){uniforms[name]=value},enableVertexAttribArray(n){enabled.add(n)},disableVertexAttribArray(n){enabled.delete(n)},
  vertexAttribPointer(n,size,type,norm,stride,offset){attribs.set(n,{buffer:bound,size,stride,offset})},
  drawArrays(mode,first,count){
   for(const n of enabled){const a=attribs.get(n);assert.ok((count-1)*a.stride+a.offset+a.size*4<=a.buffer.length*4)}
   assert.equal(this.depthWrite,false);draws.push({count,...uniforms});
  },deleteBuffer(b){deleted.push(b)},deleteShader(){},deleteProgram(){},uploads,draws,deleted,enabled};
 return gl;
}

test('glowing stars retain the world geometry and camera projection used by the mining handoff',()=>{
 const gl=fakeGL(),bridge=createMiningSkyBridge(),stars=createSkyStars(),sky=createSkyRenderer(gl,bridge);
 const data=gl.uploads[0];
 assert.equal(data.length,SKY_STAR_COUNT*6*14,'same static vertex storage');
 for(const [i,star] of stars.entries())for(let corner=0;corner<6;corner++){
  const offset=(i*6+corner)*14;
  assert.deepEqual(Array.from(data.slice(offset,offset+6)),[...star.position,...star.position].map(Math.fround));
  assert.deepEqual(Array.from(data.slice(offset+8,offset+14)),[0,star.size,star.phase,...star.color].map(Math.fround));
 }
 bridge.active=true;
 const state={active:0,entered:false,reduceMotion:false};
 for(const [width,height,cssHeight] of [[1440,900,900],[585,1100,844]]){
  for(const eye of [[2.4,6.47,15.36],[-8,10,12],[2,5,30]]){
   const vp=M.mul(M.persp(56*Math.PI/180,width/height,.1,120),M.look(eye,[0,2.65,-1.55]));
   sky.draw(vp,state,2,.016,width,height,cssHeight);
   const submitted=gl.draws.at(-1);
   assert.deepEqual(submitted.uVP,Array.from(vp),'glow uses the same moving world camera');
   assert.deepEqual(submitted.uViewport,[width,height]);
   assert.equal(submitted.uPixelRatio,height/cssHeight);
   assert.equal(submitted.uOffsetX,0);assert.equal(submitted.uMotion,0,'intro remains steady');
   assert.equal(submitted.uOpacity,1);assert.equal(submitted.count,SKY_STAR_COUNT*6);
   const expected=createMiningSkyBridge();
   expected.indices.set(bridge.indices);expected.targetCount=bridge.targetCount;
   projectMiningTargets(expected,stars,vp,width,height,height/cssHeight);
   assert.deepEqual(bridge.targets,expected.targets,'halo extent does not change debris destinations or sizes');
  }
 }
 assert.equal(gl.uploads.length,2,'moving the camera and glow never rebuilds geometry');
 sky.destroy();
});

test('one sky batch for every stage, no per-frame uploads, at most one extra meteor draw',()=>{
 const gl=fakeGL(),bridge=createMiningSkyBridge(),sky=createSkyRenderer(gl,bridge),vp=M.id();
 assert.equal(bridge.available,true);assert.equal(gl.uploads.length,2);
 const state={active:0,entered:true,reduceMotion:false};
 for(let stage=0;stage<STAGES.length;stage++){
  state.active=stage;
  for(let i=0;i<60;i++)sky.draw(vp,state,2+i/60,1/60,1440,900,900);
 }
 assert.equal(gl.draws.length,360,'no stage-specific geometry or connecting lines');
 assert.equal(gl.uploads.length,2,'no geometry transfer after initialization');
 assert.ok(gl.draws.every(d=>d.count===SKY_STAR_COUNT*6&&d.uOffsetX===0),'sky stays fixed in world space');
 state.reduceMotion=true;sky.draw(vp,state,9.5,.016,1440,900,900);
 assert.equal(gl.draws.length,361,'no meteor under reduced motion');
 assert.equal(gl.draws.at(-1).uMotion,0);assert.equal(gl.draws.at(-1).uTime,0);assert.equal(gl.draws.at(-1).uOpacity,1);
 state.reduceMotion=false;sky.draw(vp,state,9.6,.016,1440,900,900);assert.equal(gl.draws.length,363,'at most two draws including a meteor');
 assert.equal(gl.depthWrite,true);assert.equal(gl.enabled.size,0);
 sky.destroy();assert.equal(bridge.available,false);assert.equal(gl.deleted.length,2);
});

test('legacy sky utility has no HTML invalidation and the live world no longer renders it',()=>{
 const source=readFileSync(new URL('../js/scene/sky.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/constellation|qualifications|activities|uFlash|uAge/i);
 const model=readFileSync(new URL('../js/scene/sky-model.js',import.meta.url),'utf8');
 assert.doesNotMatch(model,/content\/quests|content\/badges|constellation/i);
 assert.doesNotMatch(source,/texImage|texElement|readPixels|createFramebuffer|document\.|dispatchEvent|bufferSubData/);
 const world=readFileSync(new URL('../js/scene/webgl.js',import.meta.url),'utf8');
 assert.equal((world.match(/htmlBoards\.uploadPending\(/g)||[]).length,1);
 assert.equal((world.match(/sky\?\.draw\(/g)||[]).length,0);
 assert.doesNotMatch(world,/createSkyRenderer|createPlanetarium/);
});
