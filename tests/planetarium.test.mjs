import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlanetariumStars,PLANETARIUM_STAR_COUNT} from '../js/scene/planetarium-model.js';
import {createPlanetarium} from '../js/scene/planetarium.js';
import {createSkyBackdrop} from '../js/scene/sky-backdrop.js';
import {createSkyCamera,updateSkyCamera,updateCSSSkyCamera} from '../js/scene/sky-camera.js';
import {SKY_DOME_CENTER,SKY_DOME_RADIUS} from '../js/scene/sky-dome.js';
import {CAMERA_LIMITS,worldCameraPose} from '../js/ui/orbit-camera.js';
import {state as worldState} from '../js/state.js';
import {STAGES,STEP} from '../js/data/stages.js';

test('the deterministic 5,200-star sphere has faint, bright and differently colored stars in every direction',()=>{
 const stars=createPlanetariumStars();
 assert.equal(stars.length,5200);assert.equal(stars.length,PLANETARIUM_STAR_COUNT);
 assert.deepEqual(stars,createPlanetariumStars());
 for(const star of stars){
  assert.ok(Math.abs(Math.hypot(...star.direction)-1)<1e-12);
  assert.ok(star.radius>=.65&&star.radius<=2.3);
  assert.ok(star.brightness>=.24&&star.brightness<=1);
 }
 assert.ok(stars.filter(s=>s.brightness<.5).length>stars.length*.7);
 const bright=stars.filter(s=>s.brightness>=.88);
 assert.ok(bright.length>=60&&bright.length<=160);
 assert.equal(new Set(stars.map(s=>s.color.join(','))).size,3);
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const cap=stars.filter(s=>s.direction[axis]*sign>.8);
  assert.ok(cap.length>350);assert.ok(cap.some(s=>s.brightness>=.88));
 }
});

const visibleStars=(stars,camera)=>stars.filter(star=>{
 const p=star.direction.map((v,i)=>v-(camera.eye[i]-SKY_DOME_CENTER[i])/SKY_DOME_RADIUS),r=camera.rays;
 const dot=offset=>p.reduce((sum,v,i)=>sum+v*r[offset+i],0);
 const length2=offset=>[0,1,2].reduce((sum,i)=>sum+r[offset+i]**2,0);
 const depth=dot(6);
 return depth>.001&&Math.abs(dot(0)/length2(0))<depth&&Math.abs(dot(3)/length2(3))<depth;
}).length;

test('desktop and portrait views retain a populated star sky throughout the stage and orbit range',()=>{
 const stars=createPlanetariumStars(),camera=createSkyCamera(),prior={...worldState},limits=CAMERA_LIMITS;
 try{
  for(let stage=0;stage<STAGES.length;stage++)for(const yaw of [-limits.yaw,0,limits.yaw]){
   for(const pitch of [limits.minPitch,limits.maxPitch])for(const [width,height] of [[1440,900],[390,844]]){
    Object.assign(worldState,{orbitYaw:yaw,orbitPitch:pitch,orbitDistance:limits.maxDistance,orbitPanX:0,orbitPanY:0});
    const pose=worldCameraPose(stage*STEP);
    updateSkyCamera(camera,pose.eye,pose.target,(width<750?67:56)*Math.PI/180,width/height);
    assert.ok(visibleStars(stars,camera)>100);
    updateCSSSkyCamera(camera,{width,height,perspective:width<=800?880:1120,
     scale:Math.max(.30,Math.min(1.05,width/(width<680?1110:1330))),yaw:-yaw,pitch:pitch-9*Math.PI/180,
     x:0,y:0,z:35+(17.5-limits.maxDistance)*41,stageX:stage*800,units:800/STEP});
    assert.ok(visibleStars(stars,camera)>45);
   }
  }
 }finally{Object.assign(worldState,prior)}
});

function fakeGL(failAt=''){
 const uploads=[],draws=[],deleted=[],sources=[],enabled=new Set(),attribs=new Map();
 let bound=null,program=null;
 return {ARRAY_BUFFER:1,STATIC_DRAW:2,FLOAT:3,TRIANGLES:4,VERTEX_SHADER:5,FRAGMENT_SHADER:6,COMPILE_STATUS:7,LINK_STATUS:8,
  DEPTH_TEST:9,LEQUAL:10,BLEND:11,SRC_ALPHA:12,ONE_MINUS_SRC_ALPHA:13,COLOR_BUFFER_BIT:16,DEPTH_BUFFER_BIT:32,
  uploads,draws,deleted,sources,enabled,depthWrite:true,
  createProgram:()=>({kind:'program',uniforms:{}}),createShader:type=>({kind:'shader',type}),
  shaderSource(shader,source){sources.push(source)},compileShader(){},
  getShaderParameter:()=>failAt!=='compile',getShaderInfoLog:()=> 'shader failure',
  attachShader(){},linkProgram(){},getProgramParameter:()=>failAt!=='link',getProgramInfoLog:()=> 'link failure',
  getAttribLocation:(_,name)=>['aPosition','aDirection','aCorner','aStyle','aColor'].indexOf(name),
  getUniformLocation:(_,name)=>name,createBuffer:()=>({kind:'buffer'}),
  bindBuffer(_,buffer){bound=buffer},bufferData(_,data){bound.data=data;uploads.push(data)},
  useProgram(value){program=value},uniform1f(name,value){program.uniforms[name]=value},
  uniform2f(name,x,y){program.uniforms[name]=[x,y]},uniform3fv(name,value){program.uniforms[name]=Array.from(value)},
  uniformMatrix3fv(name,transpose,value){assert.equal(transpose,false);program.uniforms[name]=Array.from(value)},
  enableVertexAttribArray(location){enabled.add(location)},disableVertexAttribArray(location){enabled.delete(location)},
  vertexAttribPointer(location,size,type,normalized,stride,offset){attribs.set(location,{buffer:bound,size,stride,offset})},
  depthMask(value){this.depthWrite=value},
  drawArrays(mode,first,count){
   assert.equal(mode,this.TRIANGLES);assert.equal(first,0);assert.equal(this.depthWrite,false);
   for(const n of enabled){const a=attribs.get(n);assert.ok((count-1)*a.stride+a.offset+a.size*4<=a.buffer.data.byteLength)}
   draws.push({count,...program.uniforms});
  },
  enable(){},depthFunc(){},blendFunc(src,dst){this.blend=[src,dst]},clearColor(){},clear(){},
  viewport(x,y,width,height){this.viewportSize=[width,height]},
  deleteBuffer(value){deleted.push(value)},deleteShader(value){deleted.push(value)},deleteProgram(value){deleted.push(value)},
 };
}
const camera=()=>updateSkyCamera(createSkyCamera(),[0,5,18],[0,2,-1.55],Math.PI/3,1.6);

test('stars use one static GPU batch and follow camera and pixel density without new uploads',()=>{
 const gl=fakeGL(),planetarium=createPlanetarium(gl),view=camera(),stars=createPlanetariumStars();
 const data=gl.uploads[0],state={entered:true,reduceMotion:false,focusMix:0};
 assert.equal(data.length,5200*6*11);
 for(const [i,star] of stars.entries())for(let corner=0;corner<6;corner++){
  const offset=(i*6+corner)*11;
  assert.deepEqual(Array.from(data.slice(offset,offset+3)),star.direction.map(Math.fround));
  assert.deepEqual(Array.from(data.slice(offset+5,offset+11)),[star.radius,star.brightness,star.phase,...star.color].map(Math.fround));
 }
 for(let frame=0;frame<120;frame++){
  updateSkyCamera(view,[frame/10,5,18],[frame/10,2,-1.55],Math.PI/3,1.6);
  planetarium.draw(state,1/60,1800,1100,view,900);
 }
 assert.equal(gl.draws.length,120);assert.equal(gl.uploads.length,1);
 assert.ok(gl.draws.every(d=>d.count===31200));
 assert.deepEqual(gl.draws.at(-1).uEye,Array.from(view.eye));
 assert.deepEqual(gl.draws.at(-1).uRays,Array.from(view.rays));
 assert.ok(Math.abs(gl.draws.at(-1).uTime-2)<1e-10);
 assert.equal(gl.draws.at(-1).uPixelRatio,1100/900);
 planetarium.draw(state,1/60,585,1266,view,844);
 assert.deepEqual(gl.draws.at(-1).uViewport,[585,1266]);assert.equal(gl.draws.at(-1).uPixelRatio,1.5);
 assert.equal(gl.uploads.length,1);assert.equal(gl.depthWrite,true);assert.equal(gl.enabled.size,0);
 planetarium.destroy();assert.deepEqual(gl.deleted.map(v=>v.kind).sort(),['buffer','program','shader','shader']);
});

test('star motion freezes during intro and reduced motion while focus and camera still update',()=>{
 const gl=fakeGL(),planetarium=createPlanetarium(gl),view=camera();
 const state={entered:false,reduceMotion:false,focusMix:0};
 planetarium.draw(state,1,1440,900,view);assert.equal(gl.draws.at(-1).uTime,0);
 state.entered=true;planetarium.draw(state,1,1440,900,view);assert.equal(gl.draws.at(-1).uTime,.05);
 state.reduceMotion=true;state.focusMix=.8;
 const prior={...state};
 updateSkyCamera(view,[35,9,12],[28,2,0],.7,1.6);
 for(let frame=0;frame<60;frame++)planetarium.draw(state,1/60,1440,900,view);
 assert.equal(gl.draws.at(-1).uTime,.05);assert.equal(gl.draws.at(-1).uFocus,.8);
 assert.deepEqual(gl.draws.at(-1).uEye,[35,9,12]);assert.deepEqual(state,prior);
 state.reduceMotion=false;planetarium.draw(state,.01,1440,900,view);
 assert.ok(Math.abs(gl.draws.at(-1).uTime-.06)<1e-10);planetarium.destroy();
});

for(const failAt of ['compile','link'])test(`planetarium releases partial GPU resources on ${failAt} failure`,()=>{
 const gl=fakeGL(failAt);
 assert.throws(()=>createPlanetarium(gl),new RegExp(failAt==='compile'?'shader failure':'link failure'));
 assert.equal(gl.deleted.filter(v=>v.kind==='program').length,1);
 assert.equal(gl.deleted.filter(v=>v.kind==='shader').length,failAt==='compile'?1:2);
 assert.equal(gl.draws.length,0);
});

test('CSS3D backdrop draws the aurora and transparent stars into the existing world canvas',()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');
 Object.defineProperty(globalThis,'devicePixelRatio',{value:2,configurable:true});
 try{
  const gl=fakeGL(),canvas={clientWidth:390,clientHeight:844,width:0,height:0,style:{display:'none'},getContext:()=>gl};
  const backdrop=createSkyBackdrop(canvas);
  assert.ok(backdrop);backdrop.draw({entered:true,reduceMotion:false,focusMix:0},1/60,camera());
  assert.deepEqual([canvas.width,canvas.height],[585,1266]);assert.equal(canvas.style.display,'');
  assert.deepEqual(gl.draws.map(d=>d.count),[3,31200]);
  assert.deepEqual(gl.blend,[gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA]);
  assert.equal(gl.draws[1].uPixelRatio,1.5);assert.equal(gl.enabled.size,0);assert.equal(gl.depthWrite,true);
  backdrop.destroy();assert.equal(gl.deleted.length,8);
 }finally{if(prior)Object.defineProperty(globalThis,'devicePixelRatio',prior);else delete globalThis.devicePixelRatio}
});

test('native sky order and the WebGL-free panorama keep stars on the same celestial sphere',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 const world=read('../js/scene/webgl.js'),css=read('../js/scene/css3d.js'),style=read('../css/scene.css');
 assert.ok(world.indexOf('background?.draw(')<world.indexOf('planetarium?.draw('));
 assert.ok(world.indexOf('planetarium?.draw(')<world.indexOf('sky?.draw('));
 assert.match(css,/skyDomeDirection\(skyCamera.eye,skyRay,skyDirection\)/);
 assert.doesNotMatch(css,/ambient-dot/);assert.match(css,/css3d-star-panorama/);
 assert.match(style,/background-position:var\(--sky-x,0px\) var\(--sky-y,0px\)/);
 const svg=read('../assets/planetarium-stars.svg');
 assert.ok((svg.match(/<ellipse /g)||[]).length>=5200);
 assert.doesNotMatch(svg,/<(?:script|image|foreignObject)\b/);
});
