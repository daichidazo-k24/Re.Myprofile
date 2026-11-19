/** One static triangle batch for the whole sky, plus one reusable meteor.
 * Shader-only glow/twinkle; no framebuffer, DOM or texture work. */
import {createSkyStars,projectMiningTargets,STAR_MIN_PIXELS,STAR_MAX_PIXELS} from './sky-model.js';
import {STEP} from '../data/stages.js';

// Extend only the light footprint; the core and mining targets keep their original size.
// View-depth attenuation shares the perspective sizing metric, so orbiting does not
// detach the halo or make it jump. These constants tune glow without moving stars.
const GLOW_EXTENT=1.6;
const GLOW_NEAR_DEPTH=12, GLOW_FAR_DEPTH=65, GLOW_FAR_GAIN=.55;

const VERTEX=`
attribute vec3 aFrom; attribute vec3 aTo; attribute vec2 aCorner;
attribute vec3 aStyle; attribute vec3 aColor;
uniform mat4 uVP; uniform vec2 uViewport; uniform float uPixelRatio;
uniform float uTime; uniform float uMotion;
uniform float uOpacity; uniform float uOffsetX;
varying vec2 vCorner; varying vec3 vColor; varying float vAlpha; varying float vType;
varying float vGlow;
void main(){
 vec3 offset=vec3(uOffsetX,0.,0.);
 vec4 start=uVP*vec4(aFrom+offset,1.);
 vec4 end=uVP*vec4(aTo+offset,1.);
 vCorner=aCorner; vColor=aColor; vType=aStyle.x; vGlow=0.;
 float twinkle=1.-uMotion*(.08+.08*sin(uTime*.9+aStyle.z));
 vAlpha=twinkle*uOpacity;
 if(aStyle.x<.5){
  // Reuse each star's stable phase as a seed: no new attributes or CPU updates.
  float energy=mix(.82,1.,fract(aStyle.z*2.417));
  float frequency=mix(.45,.85,fract(aStyle.z*1.618));
  float shimmer=1.-uMotion*(.04+.04*sin(uTime*frequency+aStyle.z));
  vAlpha=energy*shimmer*uOpacity;
  vGlow=mix(1.,${GLOW_FAR_GAIN.toFixed(2)},smoothstep(${GLOW_NEAR_DEPTH.toFixed(1)},${GLOW_FAR_DEPTH.toFixed(1)},start.w));
  float size=clamp(aStyle.y*uViewport.y/max(.1,start.w)/uPixelRatio,${STAR_MIN_PIXELS}.,${STAR_MAX_PIXELS}.)*uPixelRatio;
  gl_Position=start;
  gl_Position.xy+=aCorner*size*${GLOW_EXTENT.toFixed(2)}/uViewport*start.w;
 }else{
  vec2 direction=(end.xy/max(.1,end.w)-start.xy/max(.1,start.w))*uViewport;
  vec2 normal=vec2(-direction.y,direction.x)/max(.001,length(direction));
  float along=(aCorner.x+1.)*.5;
  gl_Position=mix(start,end,along);
  gl_Position.xy+=normal*aCorner.y*aStyle.y*uPixelRatio/uViewport*gl_Position.w;
  vAlpha*=.6;
 }
 if(start.w<=.1 || end.w<=.1)vAlpha=0.;
}`;

const FRAGMENT=`
precision mediump float;
varying vec2 vCorner; varying vec3 vColor; varying float vAlpha; varying float vType;
varying float vGlow;
void main(){
 float a;
 vec3 color=vColor;
 if(vType<.5){
  // Work in the original star's coordinates: enlarging the quad must not blur
  // or enlarge its pixel core. A narrow square edge preserves the 8-bit shape.
  vec2 p=vCorner*${GLOW_EXTENT.toFixed(2)},d=abs(p);
  float square=max(d.x,d.y);
  float core=1.-smoothstep(.24,.32,square);
  float hot=1.-smoothstep(.06,.26,square);
  // Exponential radial falloff, gently cut to zero before the quad boundary.
  // Short cross rays keep the faint halo from reading as a circular light blob.
  float halo=exp2(-3.5*dot(p,p))*(1.-smoothstep(1.1,${GLOW_EXTENT.toFixed(2)},square))*.24;
  float rays=(1.-smoothstep(.10,.23,min(d.x,d.y)))*(1.-smoothstep(.28,1.15,square))*.28;
  a=core*.86+(halo+rays)*vGlow;
  color=mix(vColor,vec3(1.,.98,.93),hot*.72);
 }else{
  a=1.-smoothstep(.15,1.,abs(vCorner.y));
  a*=pow((vCorner.x+1.)*.5,2.);
 }
 gl_FragColor=vec4(color,min(.95,a*vAlpha));
}`;

const CORNERS=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];
function appendQuad(out,from,to,type,size,phase,color){
 for(const corner of CORNERS)out.push(...from,...to,...corner,type,size,phase,...color);
}

export function createSkyRenderer(gl,bridge){
 const shaders=[],buffers=[],program=gl.createProgram();
 let loc,sky,meteor;
 const stars=createSkyStars();
 const attributes=[['aFrom',3,0],['aTo',3,12],['aCorner',2,24],['aStyle',3,32],['aColor',3,44]];
 const uniforms=['uVP','uViewport','uPixelRatio','uTime','uMotion','uOpacity','uOffsetX'];
 const destroy=()=>{
  bridge.available=false;
  for(const b of buffers)gl.deleteBuffer(b);
  for(const s of shaders)gl.deleteShader(s);
  gl.deleteProgram(program);
 };
 function batch(data){
  const buffer=gl.createBuffer();buffers.push(buffer);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  return {buffer,count:data.length/14};
 }
 try{
  for(const [type,source] of [[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,FRAGMENT]]){
   const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
   gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  loc=Object.fromEntries(attributes.map(([name])=>[name,gl.getAttribLocation(program,name)]));
  for(const name of uniforms)loc[name]=gl.getUniformLocation(program,name);
  const data=[];
  stars.forEach(p=>appendQuad(data,p.position,p.position,0,p.size,p.phase,p.color));
  sky=batch(data);
  const streak=[];
  appendQuad(streak,[-7,12,-16],[7,8.8,-19],1,1.8,0,[.78,.88,1]);
  meteor=batch(streak);
  bridge.available=true;
 }catch(error){destroy();throw error}

 function draw(batch_){
  if(!batch_.count)return;
  gl.bindBuffer(gl.ARRAY_BUFFER,batch_.buffer);
  for(const [name,size,offset] of attributes){gl.enableVertexAttribArray(loc[name]);gl.vertexAttribPointer(loc[name],size,gl.FLOAT,false,56,offset)}
  gl.drawArrays(gl.TRIANGLES,0,batch_.count);
 }
 let meteorCycle=-1,meteorX=0;
 return {destroy,draw(vp,state,t,dt,width,height,cssHeight){
  const reduced=state.reduceMotion,pixelRatio=height/cssHeight;
  if(bridge.active)projectMiningTargets(bridge,stars,vp,width,height,pixelRatio);
  gl.useProgram(program);gl.depthMask(false);
  gl.uniformMatrix4fv(loc.uVP,false,vp);gl.uniform2f(loc.uViewport,width,height);
  gl.uniform1f(loc.uPixelRatio,pixelRatio);gl.uniform1f(loc.uTime,reduced?0:t);
  // Intro sprites have a constant alpha so the crossfade does not change their brightness.
  gl.uniform1f(loc.uMotion,reduced||!state.entered?0:1);gl.uniform1f(loc.uOpacity,1);
  gl.uniform1f(loc.uOffsetX,0);
  draw(sky);
  // One reusable distant streak, for 1.25 s every 14 s. Never animates in reduced motion.
  const cycle=Math.floor(t/14),phase=t%14-9;
  if(cycle!==meteorCycle){meteorCycle=cycle;meteorX=state.active*STEP}
  if(state.entered&&!reduced&&phase>=0&&phase<1.25){
   const p=phase/1.25;
   gl.uniform1f(loc.uOffsetX,meteorX+p*12);
   gl.uniform1f(loc.uOpacity,Math.sin(p*Math.PI));
   draw(meteor);
  }
  // Attribute arrays also need restoring: a later terrain batch can be much larger.
  for(const [name] of attributes)gl.disableVertexAttribArray(loc[name]);
  gl.depthMask(true);
 }};
}
