/** Original pixel silhouettes for the woodland, apart from the treehouse. */
import {seeded} from './math.js';

const palettes={
 near:['#11121e','#1b2030','#232b3e'],
 middle:['#191f31','#222c42','#2f3b51'],
 far:['#242c41','#2d384e','#394760'],
};
const dimensions={crown:[72,45],pine:[43,63],grove:[110,67]};

function paintCrown(put,variant){
 const groups=[
  [[12,27,11,8],[25,18,15,11],[41,18,15,12],[56,24,13,10],[33,29,25,11]],
  [[15,29,13,8],[30,23,17,14],[46,16,13,12],[58,24,13,10],[46,31,21,10]],
  [[12,29,10,8],[23,21,11,12],[38,16,15,12],[55,22,15,11],[40,31,26,10]],
 ][variant];
 for(let y=0;y<45;y++)for(let x=0;x<72;x++){
  const edge=seeded(x>>1,y>>1,variant+21)*.21-.09;
  let shape=Infinity;
  for(const [cx,cy,rx,ry] of groups){
   shape=Math.min(shape,((x-cx)/rx)**2+((y-cy)/ry)**2);
  }
  if(shape<1+edge)put(x,y,0);
 }
}

function paintPine(put,x,top,base,halfWidth,variant,tone){
 const height=base-top;
 for(let y=top;y<=base;y++){
  const t=(y-top)/height;
  const lean=Math.round(t*(variant-1)*3);
  const phase=(t*(5+variant))%1;
  const edge=seeded(y,variant,77);
  const width=t<.87?Math.floor((.15+.85*t)*halfWidth*(.34+.66*phase)+edge*1.37):1;
  const offset=Math.round((edge-.44)*2);
  for(let u=-width;u<=width;u++)put(x+lean+offset+u,y,tone);
 }
}

function paintGrove(put,variant){
 const back=[[8,25,63,7],[21,14,64,9],[40,19,64,11],[56,7,64,14],[74,19,64,10],[100,21,63,8]];
 const front=[[6,34,66,8],[18,25,66,10],[33,32,66,8],[48,22,66,12],[67,28,66,12],[83,17,66,13],[102,28,66,10]];
 for(const [i,[x,top,base,w]] of back.entries())paintPine(put,x,top,base,w,(i+variant)%3,2);
 for(const [i,[x,top,base,w]] of front.entries())paintPine(put,x,top,base,w,(i+variant)%3,0);
}

const key=({kind,tone,variant})=>`${kind}:${tone}:${variant}`;
export function rasterIslandTree(kind,tone,variant){
 const [width,height]=dimensions[kind];
 const rgb=palettes[tone].map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
 const pixels=new Uint8ClampedArray(width*height*4);
 const put=(x,y,shade)=>{
  if(x<0||x>=width||y<0||y>=height)return;
  const at=(y*width+x)*4;
  pixels.set(rgb[shade],at);pixels[at+3]=255;
 };
 if(kind==='crown')paintCrown(put,variant);
 if(kind==='pine')paintPine(put,21,2,62,20,variant,1);
 if(kind==='grove')paintGrove(put,variant);
 return {width,height,pixels};
}

export function createIslandTreeAtlas(trees){
 const width=512,frames=new Map();
 let x=1,y=1,row=0;
 for(const tree of trees){
  const id=key(tree);
  if(frames.has(id))continue;
  const frame=rasterIslandTree(tree.kind,tree.tone,tree.variant);
  if(x+frame.width+1>width){x=1;y+=row;row=0}
  frames.set(id,{...frame,x,y});
  x+=frame.width+2;row=Math.max(row,frame.height+2);
 }
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=y+row;
 const ctx=canvas.getContext('2d');
 for(const frame of frames.values()){
  const image=ctx.createImageData(frame.width,frame.height);
  image.data.set(frame.pixels);
  ctx.putImageData(image,frame.x,frame.y);
 }
 return {canvas,frame:tree=>frames.get(key(tree))};
}
