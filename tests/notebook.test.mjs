import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNotebookParts,createNotebookMesh,notebookLabelPixels,NOTEBOOK_WIDTH,NOTEBOOK_HEIGHT,NOTEBOOK_LABEL} from '../js/graphic/notebook.js';
import {createGraphicSign} from '../js/graphic/board.js';

test('notebook is deterministic 3D geometry with eight rings, paper thickness and a bounded static mesh',()=>{
 const parts=createNotebookParts(),mesh=createNotebookMesh();
 assert.deepEqual(createNotebookParts(),parts);
 assert.equal(parts.filter(p=>p.color==='#e89c28').length,8,'eight ring eyelets');
 assert.ok(parts.some(p=>p.color==='#6f391d'&&p.z<0),'brown back cover');
 assert.ok(parts.some(p=>p.color==='#f8e8ce'&&p.d>0),'paper has real thickness');
 assert.ok(parts.some(p=>p.color==='#bfc2bf'&&p.z>.2),'metal protrudes from the paper');
 assert.ok(parts.every(p=>p.w>0&&p.h>0&&p.d>0));
 assert.ok(parts.every(p=>Math.abs(p.x)+p.w/2<NOTEBOOK_WIDTH/2+.08));
 assert.ok(parts.every(p=>Math.abs(p.y)+p.h/2<NOTEBOOK_HEIGHT/2));
 assert.ok(mesh.every(Number.isFinite));assert.equal(mesh.length%33,0);
 assert.ok(mesh.byteLength<512*1024,'static vertex data stays under 512 KiB');
 for(let i=0;i<mesh.length;i+=11){
  assert.ok(Math.abs(Math.hypot(mesh[i+3],mesh[i+4],mesh[i+5])-1)<1e-6);
  assert.ok(mesh.slice(i+8,i+11).every(c=>c>=0&&c<=1));
 }
 const scene=readFileSync(new URL('../js/scene/webgl.js',import.meta.url),'utf8');
 assert.equal((scene.match(/mesh\(createNotebookMesh\(\)\)/g)||[]).length,1);
 assert.match(scene,/draw\(graphicMesh,graphicModel/);
 assert.match(scene,/gl\.deleteBuffer\(graphicMesh\.buffer\)/);
});

test('Japanese pixel lettering needs no fonts or downloaded image and fits the transparent texture',()=>{
 const pixels=notebookLabelPixels(),rects=[];
 assert.equal(new Set(pixels.map(([x])=>Math.floor(x/9))).size,9);
 assert.ok(pixels.every(([x,y])=>x*NOTEBOOK_LABEL.pixel+NOTEBOOK_LABEL.stroke<=NOTEBOOK_LABEL.width&&y*NOTEBOOK_LABEL.pixel+NOTEBOOK_LABEL.stroke<=NOTEBOOK_LABEL.height));
 const original=globalThis.document;
 const ctx={fillRect(...args){rects.push(args)}};
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 try{
  const texture=createGraphicSign();assert.equal(texture.width,NOTEBOOK_LABEL.width);assert.equal(texture.height,NOTEBOOK_LABEL.height);
  assert.equal(rects.length,pixels.length);assert.equal(ctx.imageSmoothingEnabled,false);
 }finally{globalThis.document=original}
});
