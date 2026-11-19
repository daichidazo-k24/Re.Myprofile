/** Actual planar tiles rotate around local hinges; each face keeps one color
 * until it turns away. One static GPU batch, shared by both world renderers. */
import {SKY_DOME_GLSL} from './sky-dome.js';
import {createAuroraPanels,PANEL_FLIP_PERIOD,PANEL_FLIP_START,PANEL_FLIP_END,PANEL_COLOR_STEP} from './aurora-panel-model.js';

const VERTEX=`
attribute vec3 aCenter;attribute vec2 aLocal;attribute vec3 aAxis;
attribute vec2 aUv;attribute float aPhase;
uniform mat3 uRays;uniform vec3 uEye;uniform float uTime;uniform float uFocus;
varying vec2 vUv;varying vec3 vFront;varying vec3 vBack;varying float vShade;
${SKY_DOME_GLSL}
float falloff(float d,float width){return exp2(-d*d/(width*width));}
vec3 auroraColor(vec3 p,float t){
 // The same three curved ribbons now become a mosaic of flat face colors.
 float wave=.045*sin(dot(p,vec3(3.,2.,4.))+t*.22)
           +.025*sin(dot(p,vec3(-5.,1.,2.))-t*.16);
 float arc=dot(p,normalize(vec3(-.15,1.,-.22)))-.24+wave;
 float crossing=dot(p,normalize(vec3(-.40,.80,-.44)))-.36-wave*.8;
 float crown=dot(p,normalize(vec3(.16,.95,-.28)))-.68+wave*.6;
 // Fine tiles resolve narrow ribbons. Most of the dome remains dark night sky.
 float core=falloff(arc,.023)*.73+falloff(crossing,.026)*.46+falloff(crown,.022)*.38;
 float veil=falloff(arc-.036,.062)*.32+falloff(crossing-.03,.065)*.18+falloff(crown-.025,.05)*.14;
 float upper=smoothstep(-.32,.12,p.y);
 float hue=.5+.5*sin(dot(p,vec3(2.,1.3,-1.7))-t*.64-1.1);
 vec3 tint=mix(vec3(.98,.075,.19),vec3(.60,.12,.94),smoothstep(.08,.52,hue));
 tint=mix(tint,vec3(.08,.46,1.),smoothstep(.52,.94,hue));
 vec3 color=mix(vec3(.006,.011,.025),vec3(.015,.025,.048),p.y*.5+.5);
 color+=tint*(core+veil)*upper*.78;
 color+=vec3(.14,.20,.28)*pow(clamp(core,0.,1.),3.)*.16*upper;
 return color*mix(1.,.65,uFocus);
}
void main(){
 float clock=uTime/${PANEL_FLIP_PERIOD.toFixed(2)}+aPhase,cycle=floor(clock);
 float turn=smoothstep(${PANEL_FLIP_START.toFixed(2)},${PANEL_FLIP_END.toFixed(2)},fract(clock));
 float odd=mod(cycle,2.),angle=3.14159265*(odd+turn);
 vec3 up=cross(aCenter,aAxis);
 vec3 rotatedUp=up*cos(angle)+aCenter*sin(angle);
 vec3 normal=aCenter*cos(angle)-up*sin(angle);
 vec3 point=aCenter+aAxis*aLocal.x+rotatedUp*aLocal.y;
 vec3 direction=point-(uEye-SKY_CENTER)/SKY_RADIUS;
 float depth=dot(direction,uRays[2]);
 vec2 xy=vec2(dot(direction,uRays[0])/dot(uRays[0],uRays[0]),
              dot(direction,uRays[1])/dot(uRays[1],uRays[1]));
 // Reserve the last few depth values for the dome, retaining perspective order.
 // Let homogeneous clipping handle tiles crossing the eye plane; moving a
 // behind-camera vertex to a screen corner creates giant spurious triangles.
 gl_Position=vec4(xy,depth-.000004,depth);
 vUv=aUv;
 vFront=auroraColor(aCenter,(cycle-aPhase+odd)*${PANEL_COLOR_STEP.toFixed(2)});
 vBack=auroraColor(aCenter,(cycle-aPhase+1.-odd)*${PANEL_COLOR_STEP.toFixed(2)});
 // The changing normal makes the rotation readable even on very dark tiles.
 vShade=.78+.22*abs(dot(normal,normalize(direction)));
}`;

const FRAGMENT=`
precision mediump float;
varying vec2 vUv;varying vec3 vFront;varying vec3 vBack;varying float vShade;
void main(){
 vec3 color=gl_FrontFacing?vFront:vBack;
 float edge=min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y));
 float bevel=smoothstep(0.,.025,edge);
 color*=vShade*mix(.78,1.,bevel);
 color+=vec3(.008,.011,.018)*(1.-smoothstep(.0,.018,1.-vUv.y));
 gl_FragColor=vec4(color,1.);
}`;

const ATTRIBUTES=[['aCenter',3,0],['aLocal',2,12],['aAxis',3,20],['aUv',2,32],['aPhase',1,40]];
const CORNERS=[0,2,1,0,3,2]; // Inward-facing front surface.

export function createAuroraPanelRenderer(gl){
 const shaders=[],locations={};let program=null,buffer=null,count=0,elapsed=0;
 const destroy=()=>{if(buffer)gl.deleteBuffer(buffer);for(const shader of shaders)gl.deleteShader(shader);if(program)gl.deleteProgram(program)};
 try{
  program=gl.createProgram();
  for(const [type,source] of [[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,FRAGMENT]]){
   const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
   gl.attachShader(program,shader);
  }
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  for(const [name] of ATTRIBUTES)locations[name]=gl.getAttribLocation(program,name);
  for(const name of ['uRays','uEye','uTime','uFocus'])locations[name]=gl.getUniformLocation(program,name);
  const panels=createAuroraPanels(),data=new Float32Array(panels.length*6*11);let offset=0;
  for(const panel of panels)for(const index of CORNERS){
   const corner=panel.corners[index];
   data.set([...panel.center,...corner.local,...panel.axis,...corner.uv,panel.phase],offset);offset+=11;
  }
  count=panels.length*6;buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
 }catch(error){destroy();throw error}
 return {destroy,draw(state,dt,camera){
  if(state.entered&&!state.reduceMotion)elapsed+=Math.max(0,Math.min(dt,.05));
  gl.useProgram(program);gl.uniformMatrix3fv(locations.uRays,false,camera.rays);gl.uniform3fv(locations.uEye,camera.eye);
  gl.uniform1f(locations.uTime,elapsed);gl.uniform1f(locations.uFocus,Math.max(0,Math.min(1,state.focusMix)));
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [name,size,offset] of ATTRIBUTES){gl.enableVertexAttribArray(locations[name]);gl.vertexAttribPointer(locations[name],size,gl.FLOAT,false,44,offset)}
  // Depth writes resolve overlapping rotating panels independently of batch order.
  gl.depthMask(true);gl.drawArrays(gl.TRIANGLES,0,count);
  for(const [name] of ATTRIBUTES)gl.disableVertexAttribArray(locations[name]);
 }};
}
