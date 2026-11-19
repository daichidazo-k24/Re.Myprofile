/** Screen-space night glow, in the world's existing WebGL context.
 * One far-plane triangle fills only pixels not covered by opaque world geometry.
 * No extra canvas, textures, framebuffer, camera transform or DOM updates. */
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
uniform float uTime;
uniform float uFocus;

float hash(vec2 p){
 vec3 q=fract(vec3(p.xyx)*.1031);
 q+=dot(q,q.yzx+33.33);
 return fract((q.x+q.y)*q.z);
}
float noise(vec2 p){
 vec2 cell=floor(p),f=fract(p);
 f=f*f*(3.-2.*f);
 return mix(mix(hash(cell),hash(cell+vec2(1.,0.)),f.x),
            mix(hash(cell+vec2(0.,1.)),hash(cell+vec2(1.)),f.x),f.y);
}
void main(){
 vec2 uv=gl_FragCoord.xy/uViewport;
 float aspect=uViewport.x/uViewport.y;
 vec2 p=vec2(uv.x*aspect,uv.y);
 vec2 drift=vec2(uTime*.018,-uTime*.009);
 // Low-frequency distortion gives the large color gradient a slow, organic drift.
 float broad=noise(p*1.7+drift);
 float detail=noise(p*4.1-drift*.7);
 vec2 warp=vec2(broad-.5,detail-.5)*.12;
 // Concentrate the color above the silhouettes, where the open sky is visible.
 vec2 left=(uv-vec2(.24,.88)+warp)*vec2(aspect,1.)/vec2(1.20,.50);
 vec2 right=(uv-vec2(.68,.98)-warp*.65)*vec2(aspect,1.)/vec2(.80,.23);
 float blue=exp2(-1.7*dot(left,left))*(.68+.32*detail);
 float pearl=exp2(-2.*dot(right,right))*(.72+.28*broad);
 float crest=.79+.12*sin(uv.x*3.+uTime*.035)+warp.y*.4;
 float bandDistance=(uv.y-crest)/.13;
 float ribbon=exp2(-1.6*bandDistance*bandDistance)*(.62+.38*detail);
 float breath=.95+.05*sin(uTime*.12);
 // A full-sky gradient remains legible even between the moving light bands:
 // midnight at the bottom, cobalt above, then teal-blue into indigo across the sky.
 vec3 midnight=mix(vec3(.014,.025,.065),vec3(.065,.12,.27),smoothstep(.05,.88,uv.y));
 vec3 upper=mix(vec3(.055,.20,.28),vec3(.075,.09,.23),smoothstep(-.15,1.05,uv.x+warp.x));
 vec3 color=mix(midnight,upper,smoothstep(.45,1.,uv.y));
 color+=breath*(blue*vec3(.06,.22,.32)+pearl*vec3(.13,.23,.28));
 color+=ribbon*vec3(.04,.09,.13);
 color*=mix(1.,.85,smoothstep(.35,.85,length(uv-.5)));
 color*=mix(1.,.65,uFocus);
 // Fixed, very faint grain prevents broad gradients from banding or flickering.
 color+=(hash(floor(gl_FragCoord.xy*.5))-.5)/255.;
 gl_FragColor=vec4(color,1.);
}
`;

export function createSkyBackground(gl){
 const shaders=[];
 let program=null,buffer=null,position,viewport,time,focus,elapsed=0;
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
  time=gl.getUniformLocation(program,'uTime');
  focus=gl.getUniformLocation(program,'uFocus');
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 }catch(error){destroy();throw error}
 return {destroy,draw(state,dt,width,height){
  // Freeze the current image in reduced motion, including preference changes.
  if(state.entered&&!state.reduceMotion)elapsed+=Math.max(0,Math.min(dt,.05));
  gl.useProgram(program);
  gl.uniform2f(viewport,width,height);gl.uniform1f(time,elapsed);
  gl.uniform1f(focus,Math.max(0,Math.min(1,state.focusMix)));
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,8,0);
  // Keep DEPTH_TEST enabled: the far-plane fragment fails behind boards/terrain.
  // Do not write depth, so the existing 3D stars still render above this backdrop.
  gl.depthMask(false);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.depthMask(true);gl.disableVertexAttribArray(position);
 }};
}
