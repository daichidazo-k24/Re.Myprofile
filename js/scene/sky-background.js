/** Aurora ribbons projected onto the inside of a round planetarium dome.
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
uniform float uTime;
uniform float uFocus;
uniform mat3 uRays;
uniform vec3 uEye;
${SKY_DOME_GLSL}

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
float falloff(float distance,float width){
 float d=distance/width;
 return exp2(-d*d);
}
float skyNoise(vec3 p){
 return .5*(noise(p.xy+p.z*.37)+noise(p.zy-p.x*.53));
}
void main(){
 vec2 ndc=gl_FragCoord.xy/uViewport*2.-1.;
 vec3 ray=normalize(uRays*vec3(ndc,1.));
 // A sphere with equal X/Y/Z radii, centered on the island, shared with the stars.
 vec3 origin=(uEye-SKY_CENTER)/SKY_RADIUS;
 float along=dot(origin,ray);
 float distance=-along+sqrt(max(0.,along*along+1.-dot(origin,origin)));
 vec3 direction=normalize(origin+ray*distance);
 // Sample in 3D, not a tall longitude/latitude strip. Small facets preserve the
 // voxel world's texture without stretching meridians or pinching the ceiling.
 vec3 panel=floor(direction*190.+.5),p=normalize(panel);
 float t=uTime;
 float drift=skyNoise(p*4.+vec3(t*.035,0.,-t*.025))-.5;
 float wave=.045*sin(dot(p,vec3(3.,2.,4.))+t*.22)
           +.025*sin(dot(p,vec3(-5.,1.,2.))-t*.16)+drift*.045;
 // Intersections of tilted planes with the sphere form closed, curved ribbons.
 // Three different inclinations carry the light from the sides over the crown.
 float arc=dot(p,normalize(vec3(-.15,1.,-.22)))-.24+wave;
 float crossing=dot(p,normalize(vec3(-.40,.80,-.44)))-.36-wave*.8;
 float crown=dot(p,normalize(vec3(.16,.95,-.28)))-.68+wave*.6;
 float folds=.5+.5*sin(dot(p,vec3(46.,8.,-17.))+skyNoise(p*11.)*3.+t*.36);
 float core=falloff(arc,.018)*.90+falloff(crossing,.023)*.55+falloff(crown,.02)*.40;
 float veil=falloff(arc-.055,.075)*(.25+.28*folds)
           +falloff(crossing-.04,.08)*.24+falloff(crown-.03,.065)*.15;
 float upper=smoothstep(-.32,.12,p.y);
 float light=(core+veil)*upper;
 light*=mix(.82,1.05,hash(panel.xy+panel.z*.37));
 light*=.91+.09*sin(t*.54+dot(p,vec3(5.,3.,2.)));
 // Preserve the flowing red/violet/blue cycle across the spherical surface.
 float hue=.5+.5*sin(dot(p,vec3(2.,1.3,-1.7))-t*.64-1.1);
 vec3 red=vec3(.98,.075,.19),violet=vec3(.60,.12,.94),blue=vec3(.08,.46,1.);
 vec3 tint=mix(red,violet,smoothstep(.08,.52,hue));
 tint=mix(tint,blue,smoothstep(.52,.94,hue));
 vec3 color=mix(vec3(.006,.010,.025),vec3(.013,.026,.060),direction.y*.5+.5);
 color+=tint*light*.72;
 color+=vec3(.19,.28,.36)*pow(clamp(core,0.,1.),3.)*.14*upper;
 // A very faint crown and horizon make the enclosure readable between ribbons.
 color+=vec3(.025,.04,.085)*pow(max(0.,p.y),3.);
 color+=vec3(.035,.055,.10)*falloff(p.y+.10,.16)*.28;
 color*=mix(1.,.65,uFocus);
 color+=(hash(panel.xy+panel.z*.37+31.)-.5)/255.;
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
