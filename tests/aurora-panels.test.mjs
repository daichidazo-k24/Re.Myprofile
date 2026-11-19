import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAuroraPanels,panelFlipState,PANEL_SEGMENTS,PANEL_FLIP_PERIOD,PANEL_FLIP_START,PANEL_FLIP_END} from '../js/scene/aurora-panel-model.js';
import {createAuroraPanelRenderer} from '../js/scene/aurora-panels.js';
import {createSkyCamera,updateSkyCamera} from '../js/scene/sky-camera.js';
import {createSkyBackdrop} from '../js/scene/sky-backdrop.js';

const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('fine panels have about one eighth the former area and cover the spherical dome',()=>{
 const panels=createAuroraPanels();
 assert.equal(panels.length,6*PANEL_SEGMENTS**2);assert.deepEqual(panels,createAuroraPanels());
 assert.ok(Math.abs((16/PANEL_SEGMENTS)**2-1/8)<.002,'approximately 1/8 area, retaining square proportions');
 for(const panel of panels){
  close(Math.hypot(...panel.center),1);close(Math.hypot(...panel.axis),1);close(dot(panel.center,panel.axis),0);
  const [a,b,c]=panel.corners.map(v=>v.local);
  assert.ok((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>0,'reversed triangle order faces the inside');
  const width=Math.hypot(b[0]-a[0],b[1]-a[1]);
  assert.ok(width>.018&&width<.045,'small, bounded tiles also cover the cube-face edges');
  for(const corner of panel.corners)assert.ok(corner.local.every(Number.isFinite));
 }
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1])assert.ok(panels.some(p=>p.center[axis]*sign>.99));
});

test('a tile holds its face color, turns edge-on, then shows the next color without a reset jump',()=>{
 for(const phase of [-.31,.22,1.8])for(const cycle of [1,2,3]){
  const time=fraction=>(cycle+fraction-phase)*PANEL_FLIP_PERIOD;
  const rest=panelFlipState(time(.1),phase),still=panelFlipState(time(.5),phase);
  close(rest.angle,still.angle);close(rest.frontTime,still.frontTime);close(rest.backTime,still.backTime);
  const half=panelFlipState(time((PANEL_FLIP_START+PANEL_FLIP_END)/2),phase);
  close(Math.cos(half.angle),0);close(half.turn,.5);
  const end=panelFlipState(time(.99999999),phase),next=panelFlipState(time(1),phase);
  close(Math.sin(end.angle),Math.sin(next.angle));close(Math.cos(end.angle),Math.cos(next.angle));
  close(Math.cos(end.angle)>0?end.frontTime:end.backTime,Math.cos(next.angle)>0?next.frontTime:next.backTime);
 }
});

test('tiles retain their pivot and dimensions during an actual 3D half-turn; wave phases are staggered',()=>{
 const panels=createAuroraPanels(),panel=panels[300],up=cross(panel.center,panel.axis);
 const posed=(local,angle)=>panel.center.map((v,i)=>v+panel.axis[i]*local[0]+(up[i]*Math.cos(angle)+panel.center[i]*Math.sin(angle))*local[1]);
 const a=panel.corners[0].local,b=panel.corners[2].local,diagonal=Math.hypot(a[0]-b[0],a[1]-b[1]);
 for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI]){
  const p=posed(a,angle),q=posed(b,angle);
  close(Math.hypot(...p.map((v,i)=>v-q[i])),diagonal);
  assert.deepEqual(posed([0,0],angle),panel.center);
 }
 const states=panels.map(p=>panelFlipState(2,p.phase));
 assert.ok(states.some(s=>s.turn===0)&&states.some(s=>s.turn>0&&s.turn<1)&&states.some(s=>s.turn===1));
});

function fakeGL(failure=''){
 let bound,next=0;const uniforms={},uploads=[],draws=[],deleted=[],attributes=new Map(),enabled=new Set();
 return {ARRAY_BUFFER:1,STATIC_DRAW:2,FLOAT:3,TRIANGLES:4,VERTEX_SHADER:5,FRAGMENT_SHADER:6,COMPILE_STATUS:7,LINK_STATUS:8,
  DEPTH_TEST:9,BLEND:10,LEQUAL:11,SRC_ALPHA:12,ONE_MINUS_SRC_ALPHA:13,COLOR_BUFFER_BIT:16,DEPTH_BUFFER_BIT:32,
  uniforms,uploads,draws,deleted,enabled,depthWrite:true,
  createProgram:()=>({kind:'program'}),createShader:()=>({kind:'shader'}),shaderSource(){},compileShader(){},
  getShaderParameter:()=>failure!=='compile',getShaderInfoLog:()=> 'compile failed',attachShader(){},linkProgram(){},
  getProgramParameter:()=>failure!=='link',getProgramInfoLog:()=> 'link failed',
  getAttribLocation:()=>next++,getUniformLocation:(_,name)=>name,
  createBuffer:()=>({kind:'buffer'}),bindBuffer(_,b){bound=b},bufferData(_,data){bound.data=data;uploads.push(data)},useProgram(){},
  uniformMatrix3fv(name,transpose,value){assert.equal(transpose,false);uniforms[name]=Array.from(value)},
  uniform3fv(name,value){uniforms[name]=Array.from(value)},uniform1f(name,value){uniforms[name]=value},
  uniform2f(name,x,y){uniforms[name]=[x,y]},
  enableVertexAttribArray(n){enabled.add(n)},disableVertexAttribArray(n){enabled.delete(n)},
  vertexAttribPointer(n,size,type,normalized,stride,offset){attributes.set(n,{size,stride,offset,buffer:bound})},
  depthMask(value){this.depthWrite=value},
  drawArrays(mode,first,count){
   assert.equal(this.depthWrite,count!==3,'only the rotating tile batch writes depth');
   for(const n of enabled){const a=attributes.get(n);assert.ok((count-1)*a.stride+a.offset+a.size*4<=a.buffer.data.byteLength)}
   draws.push({count,depthWrite:this.depthWrite,...uniforms});
  },
  enable(){},depthFunc(){},blendFunc(){},clearColor(){},viewport(){},clear(){},
  deleteBuffer(value){deleted.push(value)},deleteShader(value){deleted.push(value)},deleteProgram(value){deleted.push(value)},
 };
}

test('flipping uses a static GPU batch and freezes/resumes the current pose for reduced motion',()=>{
 const gl=fakeGL(),renderer=createAuroraPanelRenderer(gl),camera=updateSkyCamera(createSkyCamera(),[0,5,18],[0,2,0],1,1.6);
 const state={entered:false,reduceMotion:false,focusMix:0};
 renderer.draw(state,1,camera);assert.equal(gl.draws.at(-1).uTime,0);
 state.entered=true;
 for(let frame=0;frame<120;frame++)renderer.draw(state,1/60,camera);
 close(gl.draws.at(-1).uTime,2);
 assert.equal(gl.uploads.length,1);assert.equal(gl.draws.length,121);
 assert.equal(gl.draws.at(-1).count,6*PANEL_SEGMENTS**2*6);
 state.reduceMotion=true;state.focusMix=.7;const prior={...state};
 updateSkyCamera(camera,[65,25,35],[65,2,0],1,.5);
 renderer.draw(state,1,camera);
 close(gl.draws.at(-1).uTime,2);assert.equal(gl.draws.at(-1).uFocus,.7);
 assert.deepEqual(gl.draws.at(-1).uRays,Array.from(camera.rays));assert.deepEqual(gl.draws.at(-1).uEye,[65,25,35]);
 assert.deepEqual(state,prior);
 state.reduceMotion=false;renderer.draw(state,1,camera);close(gl.draws.at(-1).uTime,2.05);
 assert.equal(gl.enabled.size,0);assert.equal(gl.depthWrite,true);assert.equal(gl.uploads.length,1);
 renderer.destroy();assert.deepEqual(gl.deleted.map(v=>v.kind).sort(),['buffer','program','shader','shader']);
});

for(const failure of ['compile','link'])test(`partial panel resources are released on ${failure} failure`,()=>{
 const gl=fakeGL(failure);assert.throws(()=>createAuroraPanelRenderer(gl),new RegExp(`${failure} failed`));
 assert.equal(gl.deleted.filter(v=>v.kind==='program').length,1);
 assert.equal(gl.deleted.filter(v=>v.kind==='shader').length,failure==='compile'?1:2);
 assert.equal(gl.draws.length,0);
});

test('the CSS3D backdrop renders just the night backing and fine panels, with correct depth and cleanup',()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');
 Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,value:1.5});
 try{
  const gl=fakeGL(),canvas={clientWidth:390,clientHeight:844,style:{},getContext:()=>gl};
  const backdrop=createSkyBackdrop(canvas),camera=updateSkyCamera(createSkyCamera(),[0,5,18],[0,2,0],1,.5);
  backdrop.draw({entered:true,reduceMotion:false,focusMix:0},.016,camera);
  assert.deepEqual(gl.draws.map(d=>[d.count,d.depthWrite]),[[3,false],[6*PANEL_SEGMENTS**2*6,true]]);
  assert.equal(gl.uploads.length,2);assert.equal(gl.enabled.size,0);
  assert.equal(canvas.width,585);assert.equal(canvas.height,1266);
  backdrop.destroy();assert.equal(gl.deleted.length,8);
 }finally{
  if(prior)Object.defineProperty(globalThis,'devicePixelRatio',prior);else delete globalThis.devicePixelRatio;
 }
});

test('live sky paths contain no stars or meteors and do not snap behind-camera panel vertices onto the screen',()=>{
 const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
 for(const file of ['../js/scene/webgl.js','../js/scene/sky-backdrop.js']){
  assert.doesNotMatch(read(file),/createSkyRenderer|createPlanetarium|planetarium\?\.draw|sky\?\.draw/);
 }
 assert.doesNotMatch(read('../js/scene/css3d.js'),/css3d-star-panorama|fish-pixel-stars|ambient-dot/);
 assert.doesNotMatch(read('../css/scene.css'),/planetarium-stars/);
 const panels=read('../js/scene/aurora-panels.js');
 assert.doesNotMatch(panels,/if\(depth<=|vec4\(2\.,2\.,1\.,1\.\)/);
 assert.match(panels,/gl_Position=vec4\(xy,depth-\.000004,depth\)/);
});
