/** The dome's light field: saturated ribbon edges, sparse ordered-dither veils.
 * The CPU sampler also generates the no-WebGL panorama from the same art settings. */
export const AURORA_GRID=384;
export const AURORA_CYCLE_SECONDS=80;
const WARM=[[.72,.15,1],[1,.32,.68]];
const COOL=[[.12,.52,1],[.26,1,.78]];
const GOLD=[1,.76,.58],ICE=[.68,.95,1];
const NORMALS=[[-.15,1,-.22],[-.40,.80,-.44],[.16,.95,-.28]].map(v=>{
 const length=Math.hypot(...v);return v.map(n=>n/length);
});
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const falloff=(d,w)=>2**(-((d/w)**2));
const vector=v=>`vec3(${v.map(n=>Number(n).toFixed(8)).join(',')})`;

export function sampleAurora(p,time=0){
 const wave=.065*Math.sin(dot(p,[4,2,5])+time*.13)+.028*Math.sin(dot(p,[-9,1,7])-time*.09);
 const arc=dot(p,NORMALS[0])-.43+wave;
 const crossing=dot(p,NORMALS[1])-.57-wave*.7+.035*Math.sin(p[0]*13+p[2]*8+time*.11);
 const crown=dot(p,NORMALS[2])-.82+wave*.55;
 const folds=.5+.5*Math.sin(dot(p,[54,5,-19])+Math.sin(p[0]*13+p[2]*9)*2+time*.22);
 const filaments=.5+.5*Math.sin(dot(p,[112,6,-38])+folds*3+time*.16);
 const ridge=Math.max(falloff(arc,.018),falloff(crossing,.019)*.95,falloff(crown,.016)*.88);
 const veil=falloff(arc-.08,.12)*(.26+.3*folds+.12*filaments)
  +falloff(crossing-.065,.095)*(.2+.22*folds)+falloff(crown-.05,.075)*.28;
 const upper=smooth(-.08,.18,p[1]);
 const density=clamp((ridge+veil*.84)*upper);
 const glow=(falloff(arc,.11)*.34+falloff(crossing,.10)*.24+falloff(crown,.09)*.2)*upper;
 const cycle=.5-.5*Math.cos(time*Math.PI*2/AURORA_CYCLE_SECONDS);
 const variation=.5+.5*Math.sin(dot(p,[3,1.5,-2.2])+time*.035);
 const tint=mix(mix(WARM[0],WARM[1],variation),mix(COOL[0],COOL[1],variation),cycle);
 const color=mix(tint,mix(GOLD,ICE,cycle),ridge**4*.62);
 return {density,ridge:ridge*upper,glow,color};
}

export const AURORA_STYLE_GLSL=`
float falloff(float d,float width){return exp2(-d*d/(width*width));}
// A cubed-sphere lattice avoids longitude pinching at the dome's crown.
// Its square emitters stay fixed to the sphere while the camera moves.
vec3 pixelDirection(vec3 d,out vec2 cell,out vec2 local){
 vec3 a=abs(d);vec2 uv;float face;
 if(a.x>=a.y&&a.x>=a.z){uv=d.zy/a.x;face=0.;}
 else if(a.y>=a.z){uv=d.xz/a.y;face=1.;}
 else{uv=d.xy/a.z;face=2.;}
 vec2 grid=(uv*.5+.5)*${AURORA_GRID.toFixed(1)};
 cell=floor(grid);local=fract(grid)-.5;
 vec2 center=(cell+.5)/${AURORA_GRID.toFixed(1)}*2.-1.;
 if(face<.5)return normalize(vec3(sign(d.x),center.y,center.x));
 if(face<1.5)return normalize(vec3(center.x,sign(d.y),center.y));
 return normalize(vec3(center,sign(d.z)));
}
float bayer2(vec2 p){p=mod(floor(p),2.);return 2.*p.x+3.*p.y-4.*p.x*p.y;}
float ditherThreshold(vec2 cell){return (4.*bayer2(cell)+bayer2(floor(cell*.5))+.5)/16.;}
vec3 auroraField(vec3 p,float t,out float density,out float ridge,out float glow){
 float wave=.065*sin(dot(p,vec3(4.,2.,5.))+t*.13)+.028*sin(dot(p,vec3(-9.,1.,7.))-t*.09);
 float arc=dot(p,${vector(NORMALS[0])})-.43+wave;
 float crossing=dot(p,${vector(NORMALS[1])})-.57-wave*.7+.035*sin(p.x*13.+p.z*8.+t*.11);
 float crown=dot(p,${vector(NORMALS[2])})-.82+wave*.55;
 float folds=.5+.5*sin(dot(p,vec3(54.,5.,-19.))+sin(p.x*13.+p.z*9.)*2.+t*.22);
 float filaments=.5+.5*sin(dot(p,vec3(112.,6.,-38.))+folds*3.+t*.16);
 ridge=max(falloff(arc,.018),max(falloff(crossing,.019)*.95,falloff(crown,.016)*.88));
 float veil=falloff(arc-.08,.12)*(.26+.3*folds+.12*filaments)
  +falloff(crossing-.065,.095)*(.2+.22*folds)+falloff(crown-.05,.075)*.28;
 float upper=smoothstep(-.08,.18,p.y);
 density=clamp((ridge+veil*.84)*upper,0.,1.);
 glow=(falloff(arc,.11)*.34+falloff(crossing,.10)*.24+falloff(crown,.09)*.2)*upper;
 float cycle=.5-.5*cos(t*${(Math.PI*2/AURORA_CYCLE_SECONDS).toFixed(10)});
 float variation=.5+.5*sin(dot(p,vec3(3.,1.5,-2.2))+t*.035);
 vec3 warm=mix(${vector(WARM[0])},${vector(WARM[1])},variation);
 vec3 cool=mix(${vector(COOL[0])},${vector(COOL[1])},variation);
 vec3 tint=mix(warm,cool,cycle);
 vec3 color=mix(tint,mix(${vector(GOLD)},${vector(ICE)},cycle),pow(ridge,4.)*.62);
 ridge*=upper;
 return color;
}
`;
