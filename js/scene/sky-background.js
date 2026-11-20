/** Aurora ribbons projected onto the inside of a round planetarium dome.
 * One far-plane triangle fills only pixels not covered by opaque world geometry.
 * Ray/sphere intersection gives orbit, pan and zoom their natural perspective.
 * No extra canvas, textures, framebuffer or DOM updates. */
import {SKY_DOME_GLSL} from './sky-dome.js';
import {AURORA_STYLE_GLSL} from './aurora-style.js';
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
uniform mat3 uRays;
uniform vec3 uEye;
${SKY_DOME_GLSL}
${AURORA_STYLE_GLSL}
float meteorRandom(float n){return fract(sin(n*127.1+311.7)*43758.5453);}
vec3 auroraMeteorDirection(vec3 normal,vec3 tangent,vec3 bitangent,float angle,float level){
 float radius=sqrt(max(0.,1.-level*level));
 return normal*level+radius*(tangent*cos(angle)+bitangent*sin(angle));
}
float auroraMeteorField(vec3 p,float t,out float head){
 vec3 normal=normalize(vec3(-.15,1.,-.22));
 vec3 tangent=normalize(vec3(-normal.z,0.,normal.x));
 vec3 bitangent=normalize(cross(normal,tangent));
 vec2 point=vec2(dot(p,tangent),dot(p,bitangent));
 float density=0.;head=0.;
 float current=floor(t/1.6);
 for(int back=0;back<3;back++){
  float slot=current-float(back);
  if(slot<0.)continue;
  float seed=slot*37.;
  if(meteorRandom(seed+20.)<.28)continue;
  float pick=meteorRandom(seed+21.);
  float count=pick<.18?1.:pick<.56?2.:pick<.84?3.:4.;
  float burstAt=slot*1.6+.08+meteorRandom(seed+22.)*1.1;
  for(int i=0;i<4;i++){
   float index=float(i),member=seed+index*11.;
   if(index>=count)continue;
   float launch=burstAt+(i==0?0.:.06+meteorRandom(member+23.)*.58);
   float duration=.72+meteorRandom(member+24.)*.62;
   float progress=(t-launch)/duration;
   if(progress<0.||progress>=1.)continue;
   float angle=meteorRandom(member+1.)*6.2831853;
   float sign=meteorRandom(member+4.)<.5?-1.:1.;
   float span=.10+meteorRandom(member+5.)*.14;
   float level=.43+(meteorRandom(member+2.)-.5)*.16;
   float drop=.055+meteorRandom(member+6.)*.08;
   float trailStart=max(0.,progress-.48);
   float a0=angle+sign*span*trailStart,a1=angle+sign*span*progress;
   float l0=level-drop*trailStart,l1=level-drop*progress;
   vec3 start=auroraMeteorDirection(normal,tangent,bitangent,a0,l0);
   vec3 end=auroraMeteorDirection(normal,tangent,bitangent,a1,l1);
   vec2 from=vec2(dot(start,tangent),dot(start,bitangent));
   vec2 to=vec2(dot(end,tangent),dot(end,bitangent));
   vec2 segment=to-from;
   float along=clamp(dot(point-from,segment)/max(dot(segment,segment),.000001),0.,1.);
   vec2 nearest=from+segment*along;
   float targetLevel=mix(l0,l1,along);
   float distance=sqrt(dot(point-nearest,point-nearest)+pow(dot(p,normal)-targetLevel,2.));
   float width=.0045+meteorRandom(member+7.)*.0035;
   float streak=(1.-smoothstep(width*.35,width,distance))*mix(.28,1.,along);
   float headSpot=1.-smoothstep(.004,.014,length(point-to)+abs(dot(p,normal)-l1));
   float fade=sin(progress*3.14159265);
   density=max(density,max(streak,headSpot*.92)*fade);
   head=max(head,headSpot*fade);
  }
 }
 return density;
}
void main(){
 vec2 ndc=gl_FragCoord.xy/uViewport*2.-1.;
 vec3 ray=normalize(uRays*vec3(ndc,1.));
 // A sphere with equal X/Y/Z radii, centered on the island, shared with the stars.
 vec3 origin=(uEye-SKY_CENTER)/SKY_RADIUS;
 float along=dot(origin,ray);
 float distance=-along+sqrt(max(0.,along*along+1.-dot(origin,origin)));
 vec3 direction=normalize(origin+ray*distance);
 vec2 cell,local;
 vec3 p=pixelDirection(direction,cell,local);
 float density,ridge,glow;
 vec3 tint=auroraField(p,uTime,density,ridge,glow);
 // Ordered density, not animated noise: sparse square light dissolves into black.
 float threshold=ditherThreshold(cell);
 float ink=smoothstep(threshold-.035,threshold+.035,density);
 float halfSize=mix(.14,.48,smoothstep(.05,.94,density));
 float square=1.-smoothstep(halfSize-.025,halfSize+.025,max(abs(local.x),abs(local.y)));
 vec3 color=vec3(.001,.002,.006);
 color+=tint*square*ink*(.7+.5*sqrt(density));
 // Soft light around the curtains keeps the pixel cores crisp and stars visible.
 color+=tint*(glow*.28+ridge*ridge*.12);
 float meteorHead;
 float meteor=auroraMeteorField(p,uTime,meteorHead);
 float meteorThreshold=ditherThreshold(cell);
 float meteorInk=smoothstep(meteorThreshold-.035,meteorThreshold+.035,meteor);
 float meteorSize=mix(.16,.48,smoothstep(.08,.92,meteor));
 float meteorSquare=1.-smoothstep(meteorSize-.025,meteorSize+.025,max(abs(local.x),abs(local.y)));
 color+=mix(tint,vec3(.88,.96,1.),meteorHead*.8)*meteorSquare*meteorInk*(.52+.62*sqrt(meteor));
 color*=mix(1.,.65,uFocus);
 gl_FragColor=vec4(color,1.);
}
`;

export function createSkyBackground(gl){
 const shaders=[];
 let program=null,buffer=null,position,viewport,time,focus,rays,eye,elapsed=0;
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
  rays=gl.getUniformLocation(program,'uRays');
  eye=gl.getUniformLocation(program,'uEye');
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 }catch(error){destroy();throw error}
 return {destroy,draw(state,dt,width,height,camera){
  // Freeze the current image in reduced motion, including preference changes.
  if(state.entered&&!state.reduceMotion)elapsed+=Math.max(0,Math.min(dt,.05));
  gl.useProgram(program);
  gl.uniform2f(viewport,width,height);gl.uniform1f(time,elapsed);
  gl.uniform1f(focus,Math.max(0,Math.min(1,state.focusMix)));
  gl.uniformMatrix3fv(rays,false,camera.rays);gl.uniform3fv(eye,camera.eye);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,8,0);
  // Keep DEPTH_TEST enabled: the far-plane fragment fails behind boards/terrain.
  // Do not write depth, so the existing 3D stars still render above this backdrop.
  gl.depthMask(false);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.depthMask(true);gl.disableVertexAttribArray(position);
 }};
}
