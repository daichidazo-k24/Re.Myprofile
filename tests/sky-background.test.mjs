import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSkyBackground} from '../js/scene/sky-background.js';
import {createSkyCamera,updateSkyCamera} from '../js/scene/sky-camera.js';

const camera=updateSkyCamera(createSkyCamera(),[0,5,18],[0,2,-1.55],Math.PI/3,1.6);

function fakeGL(failAt=''){
 const uniforms={},draws=[],uploads=[],deleted=[],sources=[],enabled=new Set();
 let buffer=null;
 return {ARRAY_BUFFER:1,STATIC_DRAW:2,FLOAT:3,TRIANGLES:4,VERTEX_SHADER:5,FRAGMENT_SHADER:6,COMPILE_STATUS:7,LINK_STATUS:8,
  depthWrite:true,draws,uploads,deleted,sources,enabled,
  createProgram:()=>({kind:'program'}),createShader:type=>({kind:'shader',type}),
  shaderSource(shader,source){sources.push(source)},compileShader(){},
  getShaderParameter:()=>failAt!=='compile',getShaderInfoLog:()=> 'shader failure',
  attachShader(){},linkProgram(){},getProgramParameter:()=>failAt!=='link',getProgramInfoLog:()=> 'link failure',
  getAttribLocation:()=>0,getUniformLocation:(_,name)=>name,
  createBuffer:()=>({kind:'buffer'}),bindBuffer(_,value){buffer=value},
  bufferData(_,data){buffer.data=data;uploads.push(data)},useProgram(){},
  uniform2f(name,x,y){uniforms[name]=[x,y]},uniform1f(name,value){uniforms[name]=value},
  uniform3fv(name,value){uniforms[name]=Array.from(value)},
  uniformMatrix3fv(name,transpose,value){assert.equal(transpose,false);uniforms[name]=Array.from(value)},
  enableVertexAttribArray(location){enabled.add(location)},disableVertexAttribArray(location){enabled.delete(location)},
  vertexAttribPointer(location,size,type,normalized,stride,offset){
   assert.equal(size,2);assert.equal(stride,8);assert.equal(offset,0);
  },
  depthMask(value){this.depthWrite=value},
  drawArrays(mode,first,count){
   assert.equal(this.depthWrite,false,'background must not occlude subsequent stars');
   assert.equal(mode,this.TRIANGLES);assert.equal(first,0);assert.equal(count,3);
   assert.equal(buffer.data.length,6);draws.push({...uniforms});
  },
  deleteBuffer(value){deleted.push(value)},deleteShader(value){deleted.push(value)},deleteProgram(value){deleted.push(value)},
 };
}

test('background has one static triangle, no per-frame uploads, and restores depth writes',()=>{
 const gl=fakeGL(),background=createSkyBackground(gl);
 const state={entered:true,reduceMotion:false,focusMix:0};
 assert.deepEqual(Array.from(gl.uploads[0]),[-1,-1,3,-1,-1,3]);
 for(let frame=0;frame<120;frame++)background.draw(state,1/60,1800,1100,camera);
 assert.equal(gl.draws.length,120);assert.equal(gl.uploads.length,1);
 assert.deepEqual(gl.draws.at(-1).uViewport,[1800,1100]);
 assert.ok(Math.abs(gl.draws.at(-1).uTime-2)<1e-10);
 assert.equal(gl.depthWrite,true);assert.equal(gl.enabled.size,0);
 background.draw(state,1/60,390,844,camera);
 assert.deepEqual(gl.draws.at(-1).uViewport,[390,844],'portrait resizes without rebuilding geometry');
 assert.equal(gl.uploads.length,1);
 background.destroy();
 assert.deepEqual(gl.deleted.map(value=>value.kind).sort(),['buffer','program','shader','shader']);
});

test('intro and reduced motion freeze the background; focus dims it without touching camera state',()=>{
 const gl=fakeGL(),background=createSkyBackground(gl);
 const state={entered:false,reduceMotion:false,focusMix:0,cameraX:24,orbitYaw:.7};
 background.draw(state,1,1440,900,camera);assert.equal(gl.draws.at(-1).uTime,0);
 state.entered=true;background.draw(state,1,1440,900,camera);
 assert.equal(gl.draws.at(-1).uTime,.05,'large time gaps cannot jump the light');
 state.reduceMotion=true;state.focusMix=.8;
 const previous={...state};
 for(let frame=0;frame<60;frame++)background.draw(state,1/60,1440,900,camera);
 assert.equal(gl.draws.at(-1).uTime,.05,'freeze current image instead of resetting animation');
 assert.equal(gl.draws.at(-1).uFocus,.8);assert.deepEqual(state,previous);
 state.reduceMotion=false;background.draw(state,.01,1440,900,camera);
 assert.ok(Math.abs(gl.draws.at(-1).uTime-.06)<1e-10,'resume without a jump');
 background.destroy();
});

test('camera movement updates the dome projection even when animation is frozen',()=>{
 const gl=fakeGL(),background=createSkyBackground(gl),view=createSkyCamera();
 const state={entered:true,reduceMotion:true,focusMix:0};
 updateSkyCamera(view,[0,4,18],[0,2,0],1,1.6);
 background.draw(state,.016,1440,900,view);
 const initial=gl.draws.at(-1);
 updateSkyCamera(view,[35,9,12],[28,2,0],.7,1.6);
 background.draw(state,.016,1440,900,view);
 assert.notDeepEqual(gl.draws.at(-1).uRays,initial.uRays);
 assert.deepEqual(gl.draws.at(-1).uEye,[35,9,12]);
 assert.equal(gl.draws.at(-1).uTime,initial.uTime);assert.equal(gl.uploads.length,1);
 background.destroy();
});

for(const failAt of ['compile','link'])test(`background releases partial GPU resources on ${failAt} failure`,()=>{
 const gl=fakeGL(failAt);
 assert.throws(()=>createSkyBackground(gl),new RegExp(failAt==='compile'?'shader failure':'link failure'));
 assert.equal(gl.deleted.filter(value=>value.kind==='program').length,1);
 assert.equal(gl.deleted.filter(value=>value.kind==='shader').length,failAt==='compile'?1:2);
 assert.equal(gl.draws.length,0);
});

test('background shares the world canvas, keeps depth testing, and precedes the transparent stars',()=>{
 const source=readFileSync(new URL('../js/scene/sky-background.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/document\.|getContext|createTexture|createFramebuffer|readPixels|\.disable\(/);
 const gl=fakeGL(),background=createSkyBackground(gl);
 assert.match(gl.sources[0],/gl_Position=vec4\(aPosition,1\.,1\.\)/,'fixed far-plane depth');
 const world=readFileSync(new URL('../js/scene/webgl.js',import.meta.url),'utf8');
 const bg=world.indexOf('background?.draw(');
 assert.ok(bg>world.indexOf('draw(terrainMesh'));
 assert.ok(bg<world.indexOf('sky?.draw('),'stars must not be painted over by the opaque background');
 assert.match(world,/try\{background=createSkyBackground\(gl\)\}catch/,'decoration failure retains the world');
 background.destroy();
});
