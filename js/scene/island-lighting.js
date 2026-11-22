import {STAGE_INDEX,STEP} from '../data/stages.js';
import {seeded} from './math.js';

// Local X and Z, then the floor height where the fruit rests.
export const fallenFruit = {
 profile: [[-3.96,1.76,.12],[2.85,2.39,.13],[5.89,3.06,.16]],
 projects: [[-4.61,2.58,.14],[1.68,1.7,.1],[3.68,2.98,.13]],
 quests: [[-4.68,2.1,.12],[.74,2.4,.13],[4.17,3.51,.16]],
 badges: [[-4.17,3.31,.13],[-2.86,1.89,.1],[4.78,2.53,.14]],
};

export const fruitLights=Object.entries(fallenFruit).flatMap(([id,fruit])=>
 fruit.map(([x,z,floor])=>[STAGE_INDEX[id]*STEP+x,floor+.23,z]));

export const FRUIT_GLOW={width:1.76,height:1.52,offsetZ:.255};
const reach=2.18;
const clamp01=n=>Math.max(0,Math.min(1,n));

// Keep the cast shadows local to each lamp. The fruit and its cap cannot shadow themselves.
export function collectFruitShadows(cuboids){
 return fruitLights.map(([lx,ly,lz])=>{
  const nearby=[];
  for(const [x,y,z,w,h,d,,emissive] of cuboids){
   const left=x-w/2,right=x+w/2,bottom=y-h/2,top=y+h/2,back=z-d/2,front=z+d/2;
   if(emissive||top<ly-.17||bottom>ly+reach)continue;
   if(left>lx+reach||right<lx-reach||back>lz+reach||front<lz-reach)continue;
   if(left<lx+.28&&right>lx-.28&&bottom<ly+.27&&back<lz+.25&&front>lz-.25)continue;
   nearby.push([left,bottom,back,right,top,front]);
  }
  return nearby;
 });
}

function isInFruitShadow(casters,x,y,z,dx,dy,dz,nx,ny,nz){
 if(!casters?.length)return false;
 // Start just off the lit surface and stop before reaching the fruit itself.
 const start=[x+nx*.012,y+ny*.012,z+nz*.012];
 const ray=[dx,dy,dz];
 for(const bounds of casters){
  let near=.022,far=.89;
  for(let axis=0;axis<3;axis++){
   const speed=ray[axis],from=start[axis],min=bounds[axis],max=bounds[axis+3];
   if(Math.abs(speed)<.0001){
    if(from<min||from>max){far=0;break}
    continue;
   }
   const a=(min-from)/speed,b=(max-from)/speed;
   near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
   if(near>=far)break;
  }
  if(near<far)return true;
 }
 return false;
}

export function islandFaceLight(rgb,x,y,z,nx,ny,nz,emissive=false,shadows){
 if(emissive)return rgb;
 const canopy=clamp01((y-.4)/8);
 const distanceBlue=clamp01((-z-1.35)/7);
 const rim=Math.pow(Math.max(0,-.26*nx+.60*ny-.76*nz),1.55);
 const ambient=.095+.072*canopy;
 const exposure=ambient+rim*(.15+.24*canopy+.18*distanceBlue);
 let warmth=0;
 for(const [index,[lx,ly,lz]] of fruitLights.entries()){
  const dx=lx-x,dy=ly-y,dz=lz-z;
  if(Math.abs(dx)>reach||Math.abs(dy)>reach||Math.abs(dz)>reach)continue;
  const distance=Math.hypot(dx,dy*1.12,dz);
  if(distance>=reach)continue;
  const facing=Math.max(0,(nx*dx+ny*dy+nz*dz)/Math.max(.1,Math.hypot(dx,dy,dz)));
  const falloff=1-distance/reach;
  const shadow=isInFruitShadow(shadows?.[index],x,y,z,dx,dy,dz,nx,ny,nz) ? .26 : 1;
  warmth+=falloff**1.65*(.46+.54*facing)*shadow;
 }
 // Dither the color steps in world space so the flecks don't move with the camera.
 const grain=warmth>0?seeded(Math.floor(x*9),Math.floor(y*9),Math.floor(z*9)):0;
 const amber=Math.floor(warmth*18+(warmth>.04?grain*.85:0))/18;
 const gold=clamp01((amber-.39)*2.8);
 const brightness=.70+.42*(.25*rgb[0]+.5*rgb[1]+.25*rgb[2]);
 return [
  clamp01(rgb[0]*exposure*.88+.043+.024*rim+amber*2.12*brightness+gold*.12),
  clamp01(rgb[1]*exposure*.70+.026+distanceBlue*(.061+.087*rim)+amber*1.16*brightness+gold*.18),
  clamp01(rgb[2]*exposure*.92+.078+distanceBlue*(.124+.23*rim)+amber*.26*brightness+gold*.17),
 ];
}

// The two renderers use the same baked color grid for nearby, partially lit faces.
// U points to the right and V points up on the face.
export function rasterIslandFace(rgb,center,u,v,normal,emissive,shadows){
 if(emissive)return null;
 const du=Math.hypot(...u),dv=Math.hypot(...v);
 const columns=Math.min(132,Math.ceil(du/.165)),rows=Math.min(52,Math.ceil(dv/.165));
 if(columns*rows<=1)return null;
 const halfExtent=u.map((axis,i)=>(Math.abs(axis)+Math.abs(v[i]))/2);
 const radiusSquared=reach*reach;
 const nearFruit=fruitLights.some(light=>{
  const dx=Math.max(0,Math.abs(light[0]-center[0])-halfExtent[0]);
  const dy=Math.max(0,Math.abs(light[1]-center[1])-halfExtent[1]);
  const dz=Math.max(0,Math.abs(light[2]-center[2])-halfExtent[2]);
  return dx*dx+dy*dy+dz*dz<radiusSquared;
 });
 if(!nearFruit)return null;
 const colors=new Uint8ClampedArray(columns*rows*3);
 const low=[255,255,255],high=[0,0,0];
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const a=(col+.5)/columns-.5,b=(row+.5)/rows-.5;
  const lit=islandFaceLight(rgb,center[0]+a*u[0]+b*v[0],center[1]+a*u[1]+b*v[1],center[2]+a*u[2]+b*v[2],
   normal[0],normal[1],normal[2],false,shadows);
  const offset=(row*columns+col)*3;
  for(let c=0;c<3;c++){
   const value=Math.round(lit[c]*255);
   colors[offset+c]=value;
   low[c]=Math.min(low[c],value);high[c]=Math.max(high[c],value);
  }
 }
 if(high.every((value,c)=>value-low[c]<5))return null;
 return {columns,rows,colors};
}

function paintGlow(width,height,tint,opacity){
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');
 const pixels=ctx.createImageData(width,height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const offset=(y*width+x)*4;
  pixels.data.set(tint,offset);
  pixels.data[offset+3]=Math.round(255*opacity((x+.5)/width,(y+.5)/height));
 }
 ctx.putImageData(pixels,0,0);
 return canvas;
}

export function createFruitGlow(){
 return paintGlow(24,24,[255,167,72],(x,y)=>{
  const distance=Math.hypot(2*x-1,2*y-1);
  const intensity=Math.max(0,1-distance);
  return Math.floor(12*intensity**1.8)/12*.48;
 });
}

