/** Dark spherical backing beneath the hinged aurora panels.
 * One far-plane triangle fills only pixels not covered by opaque world geometry.
 * Ray/sphere intersection gives orbit, pan and zoom their natural perspective.
 * No extra canvas, textures, framebuffer or DOM updates. */
import {SKY_DOME_GLSL} from './sky-dome.js';
const VERTEX=`
attribute vec2 aPosition;
void main(){gl_Position=vec4(aPosition,1.,1.);}
`;

const FRAGMENT=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uViewport;
uniform float uFocus;
uniform mat3 uRays;
uniform vec3 uEye;
${SKY_DOME_GLSL}
void main(){
 vec2 ndc=gl_FragCoord.xy/uViewport*2.-1.;
 vec3 ray=normalize(uRays*vec3(ndc,1.));
 vec3 origin=(uEye-SKY_CENTER)/SKY_RADIUS;
 float along=dot(origin,ray);
 float distance=-along+sqrt(max(0.,along*along+1.-dot(origin,origin)));
 vec3 direction=normalize(origin+ray*distance);
 // Quiet night sky shows through the narrow joints and temporarily opened tiles.
 vec3 color=mix(vec3(.005,.009,.022),vec3(.012,.021,.043),direction.y*.5+.5);
 color*=mix(1.,.65,uFocus);
 gl_FragColor=vec4(color,1.);
}
`;

export function createSkyBackground(gl){
 const shaders=[];
 let program=null,buffer=null,position,viewport,focus,rays,eye;
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
  position=gl.getAttribLocation(program,'aPosition');
  viewport=gl.getUniformLocation(program,'uViewport');
  focus=gl.getUniformLocation(program,'uFocus');
  rays=gl.getUniformLocation(program,'uRays');eye=gl.getUniformLocation(program,'uEye');
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 }catch(error){destroy();throw error}
 return {destroy,draw(state,dt,width,height,camera){
  gl.useProgram(program);
  gl.uniform2f(viewport,width,height);
  gl.uniform1f(focus,Math.max(0,Math.min(1,state.focusMix)));
  gl.uniformMatrix3fv(rays,false,camera.rays);gl.uniform3fv(eye,camera.eye);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,8,0);
  // Keep DEPTH_TEST enabled: the far-plane fragment fails behind boards/terrain.
  // Panels render afterward, with their own depth ordering over this backdrop.
  gl.depthMask(false);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.depthMask(true);gl.disableVertexAttribArray(position);
 }};
}
