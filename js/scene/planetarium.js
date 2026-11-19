/** One static star batch shared by WebGL and CSS3D's background canvas.
 * The distant sphere surrounds every camera pose; stars never follow the screen.
 * Far-plane depth keeps them behind the world, without clipping at its near sky. */
import {createPlanetariumStars} from './planetarium-model.js';
import {SKY_DOME_GLSL} from './sky-dome.js';

const VERTEX=`
attribute vec3 aDirection;
attribute vec2 aCorner;
attribute vec3 aStyle;
attribute vec3 aColor;
uniform mat3 uRays;
uniform vec3 uEye;
uniform vec2 uViewport;
uniform float uPixelRatio;
uniform float uTime;
uniform float uFocus;
varying vec2 vPoint;
varying vec3 vColor;
varying float vAlpha;
varying float vBright;
${SKY_DOME_GLSL}
void main(){
 vec3 direction=aDirection-(uEye-SKY_CENTER)/SKY_RADIUS;
 // Invert the orthogonal ray basis. This also matches CSS perspective and orbit.
 float depth=dot(direction,uRays[2]);
 vec2 projected=vec2(dot(direction,uRays[0])/dot(uRays[0],uRays[0]),
                     dot(direction,uRays[1])/dot(uRays[1],uRays[1]));
 gl_Position=vec4(projected,depth,depth);
 gl_Position.xy+=aCorner*aStyle.x*6.*uPixelRatio/uViewport*depth;
 vPoint=aCorner*3.;vColor=aColor;
 vBright=smoothstep(.76,1.,aStyle.y);
 // At most 6% variation: stars stay visible rather than blinking on and off.
 float twinkle=.97+.03*sin(uTime*(.55+aStyle.z*.06)+aStyle.z);
 vAlpha=aStyle.y*twinkle*mix(1.,.58,uFocus);
 if(depth<=.001){gl_Position=vec4(2.,2.,1.,1.);vAlpha=0.;}
}`;

const FRAGMENT=`
precision mediump float;
varying vec2 vPoint;
varying vec3 vColor;
varying float vAlpha;
varying float vBright;
void main(){
 float radius2=dot(vPoint,vPoint);
 float core=exp2(-4.*radius2);
 float halo=exp2(-.8*radius2)*.12*vBright;
 vec2 p=abs(vPoint);
 float rays=exp2(-48.*min(p.x,p.y)*min(p.x,p.y)-2.4*max(p.x,p.y))*vBright*.10;
 float edge=1.-smoothstep(2.,3.,max(p.x,p.y));
 gl_FragColor=vec4(vColor,min(1.,(core+halo+rays)*vAlpha*edge));
}`;

const CORNERS=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];
const ATTRIBUTES=[['aDirection',3,0],['aCorner',2,12],['aStyle',3,20],['aColor',3,32]];

export function createPlanetarium(gl){
 const shaders=[],locations={};
 let program=null,buffer=null,count=0,elapsed=0;
 const destroy=()=>{
  if(buffer)gl.deleteBuffer(buffer);
  for(const shader of shaders)gl.deleteShader(shader);
  if(program)gl.deleteProgram(program);
 };
 try{
  program=gl.createProgram();
  for(const [type,source] of [[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,FRAGMENT]]){
   const shader=gl.createShader(type);shaders.push(shader);
   gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
   gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  for(const [name] of ATTRIBUTES)locations[name]=gl.getAttribLocation(program,name);
  for(const name of ['uRays','uEye','uViewport','uPixelRatio','uTime','uFocus'])locations[name]=gl.getUniformLocation(program,name);
  const stars=createPlanetariumStars(),data=new Float32Array(stars.length*6*11);
  let offset=0;
  for(const star of stars)for(const corner of CORNERS){
   data.set([...star.direction,...corner,star.radius,star.brightness,star.phase,...star.color],offset);offset+=11;
  }
  count=stars.length*6;buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
 }catch(error){destroy();throw error}
 return {destroy,draw(state,dt,width,height,camera,cssHeight=height){
  if(state.entered&&!state.reduceMotion)elapsed+=Math.max(0,Math.min(dt,.05));
  gl.useProgram(program);
  gl.uniformMatrix3fv(locations.uRays,false,camera.rays);gl.uniform3fv(locations.uEye,camera.eye);
  gl.uniform2f(locations.uViewport,width,height);gl.uniform1f(locations.uPixelRatio,height/Math.max(1,cssHeight));
  gl.uniform1f(locations.uTime,elapsed);gl.uniform1f(locations.uFocus,Math.max(0,Math.min(1,state.focusMix)));
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [name,size,offset] of ATTRIBUTES){
   gl.enableVertexAttribArray(locations[name]);gl.vertexAttribPointer(locations[name],size,gl.FLOAT,false,44,offset);
  }
  gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,count);gl.depthMask(true);
  for(const [name] of ATTRIBUTES)gl.disableVertexAttribArray(locations[name]);
 }};
}
