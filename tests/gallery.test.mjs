import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {graphicEntries} from '../js/graphic/data.js';
import {GRAPHIC_GROUPS} from '../js/content/graphic.js';
import {GRAPHIC_BOARD,GRAPHIC_STAGES,projectGraphicBoard,pointInGraphicBoard} from '../js/graphic/board.js';
import {createGallery,isGalleryOverlayActive} from '../js/ui/gallery.js';
import {FISH_IMAGES} from '../js/fishing/data.js';
import {M} from '../js/scene/math.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('art files support posters, headers, spaces and nested names within GraphicImage',()=>{
 const entries=graphicEntries([{file:'告知ポスター.jpg',title:'告知',kind:'poster'},
  {file:'headers/summer banner.png',title:'夏',kind:'header',description:'イベント告知',note:'配色を工夫しました。'}]);
 assert.equal(entries[0].src,'GraphicImage/'+encodeURIComponent('告知ポスター.jpg'));
 assert.equal(entries[1].src,'GraphicImage/headers/summer%20banner.png');
 assert.equal(entries[1].kind,'header');assert.match(entries[1].alt,/夏.*イベント告知/);
 assert.equal(entries[1].note,'配色を工夫しました。');assert.equal(entries[0].note,'');
 for(const file of ['../fish1.jpg','/absolute.jpg','https://example.com/file.jpg','a\\b.png'])assert.throws(()=>graphicEntries([{file,title:'test'}]));
 assert.deepEqual(graphicEntries([]),[],'empty collections need no placeholder artwork');
 for(const photo of FISH_IMAGES)assert.ok(existsSync(new URL('../'+photo.src,import.meta.url)),photo.src);
});

test('floating board hit-testing follows the real projected face through orbit and zoom',()=>{
 assert.deepEqual(GRAPHIC_STAGES,[2,3]);assert.equal(GRAPHIC_BOARD.x,32.5);
 assert.equal(GRAPHIC_BOARD.y,1.35);assert.equal(GRAPHIC_BOARD.z,3.35);
 assert.equal(GRAPHIC_BOARD.tilt,-.30);assert.equal(GRAPHIC_BOARD.scale,.78);
 for(const [width,height] of [[1440,900],[390,844]])for(const yaw of [-.8,.14,.8])for(const distance of [12,17.5,30]){
  const x=GRAPHIC_BOARD.x,eye=[x+distance*Math.sin(yaw),6.5,-1.55+distance*Math.cos(yaw)];
  const vp=M.mul(M.persp(56*Math.PI/180,width/height,.1,120),M.look(eye,[x,2.65,-1.55])),quad=new Float32Array(8);
  assert.equal(projectGraphicBoard(vp,width,height,quad),true);
  const cx=(quad[0]+quad[2]+quad[4]+quad[6])/4,cy=(quad[1]+quad[3]+quad[5]+quad[7])/4;
  assert.equal(pointInGraphicBoard(quad,cx,cy),true);
  assert.equal(pointInGraphicBoard(quad,-10000,-10000),false);
 }
 assert.equal(pointInGraphicBoard(new Float32Array(8),0,0),false);
 const behind=M.id();behind[15]=-1;
 assert.equal(projectGraphicBoard(behind,1440,900,new Float32Array(8)),false);
});

test('both galleries and enlarged images fill the viewport, with uncropped artwork and scroll isolation',()=>{
 const css=read('css/gallery.css'),gallery=read('js/ui/gallery.js'),controls=read('js/ui/controls.js');
 assert.match(css,/\.media-gallery-dialog\{[^}]*width:100vw;max-width:none;[^}]*height:100dvh;max-height:none/s);
 assert.match(css,/\.media-photo-viewer\{[^}]*width:100vw;max-width:none;[^}]*height:100dvh;max-height:none/s);
 assert.match(css,/object-fit:contain/);assert.match(css,/data-kind="poster"/);assert.match(css,/data-kind="header"/);
 assert.match(controls,/if\(isGalleryOverlayActive\(\)/);
 assert.match(gallery,/if\(event.key===' '&&event.target.closest\?\.\('button'\)\)return/);
 assert.match(read('js/scene/webgl.js'),/graphicTex=texFromCanvas\(createGraphicSign\(\)\)/);
 assert.match(read('js/scene/css3d.js'),/graphic.addEventListener\('click'/);
});

// Small DOM double: execute shared modal behavior without requiring a browser package.
class ElementStub {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.listeners={};this.open=false;this.scrollTop=0;this.clientHeight=500;this.scrollHeight=1800;this.isConnected=true;this.classes=new Set();this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n)}}
 setAttribute(k,v){this.attributes[k]=v}
 removeAttribute(k){delete this.attributes[k];delete this[k]}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node)}}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn)}
 fire(name,properties={}){const event={target:this,cancelable:true,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true},...properties};for(const fn of this.listeners[name]||[])fn(event);return event}
 matches(selector){return selector.startsWith('.')?this.className?.split(' ').includes(selector.slice(1)):selector.startsWith('[')?Object.hasOwn(this.attributes,selector.slice(1,-1)):this.tagName===selector}
 querySelector(selector){
  const [head,...tail]=selector.split(' ');if(tail.length)return this.querySelector(head)?.querySelector(tail.join(' '))??null;
  for(const child of this.children){if(child.matches(selector))return child;const found=child.querySelector(selector);if(found)return found}return null;
 }
 closest(selector){return this.matches(selector)?this:this.parent?.closest(selector)}
 contains(node){return node===this||this.children.some(child=>child.contains(node))}
 focus(){document.activeElement=this}
 showModal(){this.open=true}
 close(){if(!this.open)return;this.open=false;this.fire('close')}
 set innerHTML(html){
  const stack=[this];this.children=[];
  for(const match of html.matchAll(/<\/?([\w-]+)([^>]*)>/g)){
   if(match[0].startsWith('</')){stack.pop();continue}
   const node=new ElementStub(match[1]);
   for(const attr of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)){
    node.attributes[attr[1]]=attr[2]??'';if(attr[1]==='class')node.className=attr[2];
   }
   stack.at(-1).append(node);if(!['img','br','input'].includes(node.tagName))stack.push(node);
  }
 }
}

test('graphic sections follow folder order and retain every artwork and its viewer',()=>{
 const originalDocument=globalThis.document;
 globalThis.document={body:new ElementStub('body'),createElement:tag=>new ElementStub(tag)};
 let gallery;
 try{
  const entries=graphicEntries();
  entries.forEach((entry,index)=>{entry.note=index%2?'  配色を工夫しました。 <3  ':''});
  for(const entry of entries)assert.ok(existsSync(new URL('../'+entry.src,import.meta.url)),entry.src);
  gallery=createGallery({id:'graphic',title:'Graphic',label:'Works',intro:'',itemLabel:'WORKS',entries:[...entries].reverse(),groups:GRAPHIC_GROUPS});
  assert.deepEqual(gallery.grid.children.map(section=>section.dataset.group),GRAPHIC_GROUPS.map(group=>group.id));
  assert.deepEqual(gallery.grid.children.map(section=>section.querySelector('.gallery-section-grid').children.length),[6,6,6]);
  for(const section of gallery.grid.children){
   const row=section.querySelector('.gallery-section-grid');
   for(const button of row.children){
    assert.ok(decodeURIComponent(button.querySelector('img').src).includes(section.dataset.group));
    button.fire('click');assert.equal(gallery.viewer.querySelector('img').src,button.querySelector('img').src);
    const expectedNote=button.querySelector('.gallery-photo-note')?.textContent||'';
    assert.equal(gallery.viewer.querySelector('.viewer-note').textContent,expectedNote);
    assert.equal(gallery.viewer.querySelector('.viewer-note').hidden,!expectedNote);
    gallery.viewer.close();
   }
  }
 }finally{gallery?.close();globalThis.document=originalDocument}
});

test('shared galleries open, enlarge, scroll, return focus, close and show an empty collection',()=>{
 const originalDocument=globalThis.document,originalRAF=globalThis.requestAnimationFrame;
 globalThis.document={body:new ElementStub('body'),activeElement:new ElementStub('button'),createElement:tag=>new ElementStub(tag)};
 globalThis.requestAnimationFrame=fn=>fn();
 let first,second,closeCount=0;
 try{
  const opener=document.activeElement;
  first=createGallery({id:'testFish',title:'Fishing',label:'Photos',intro:'Fish',itemLabel:'PHOTOS',
   entries:[{src:'FishingImage/fish1.jpg',alt:'魚',note:'  思い出の一匹 <3  '},{src:'FishingImage/missing.jpg',alt:'未登録',note:'  '}],onClose(){closeCount++}});
  second=createGallery({id:'testArt',title:'Graphic',label:'Works',intro:'Design',itemLabel:'WORKS',entries:[]});
  assert.equal(isGalleryOverlayActive(),false);
  first.open();assert.equal(first.dialog.open,true);assert.equal(isGalleryOverlayActive(),true);assert.equal(document.activeElement,first.grid);
  const photo=first.grid.children[0],img=photo.querySelector('img');
  const memo=photo.querySelector('.gallery-photo-note');
  assert.equal(memo.textContent,'思い出の一匹 <3');
  assert.equal(photo.attributes['aria-describedby'],memo.id);
  assert.equal(first.grid.children[1].querySelector('.gallery-photo-note'),null);
  assert.equal(img.loading,'lazy');photo.fire('click');assert.equal(first.viewer.open,true);
  assert.equal(first.viewer.querySelector('img').src,img.src);
  first.viewer.close();assert.equal(first.dialog.open,true);assert.equal(document.activeElement,photo);
  const wheel=first.dialog.fire('wheel',{target:first.dialog.querySelector('h2'),deltaMode:1,deltaY:3});
  assert.equal(first.grid.scrollTop,48);assert.equal(wheel.stopped,true);assert.equal(wheel.prevented,true);
  const nativeWheel=first.dialog.fire('wheel',{target:img,deltaMode:0,deltaY:100});assert.equal(nativeWheel.prevented,undefined);
  first.dialog.fire('keydown',{key:'End',target:first.grid});assert.equal(first.grid.scrollTop,1800);
  const space=first.dialog.fire('keydown',{key:' ',target:photo});assert.equal(space.prevented,undefined);
  first.grid.children[1].querySelector('img').fire('error');assert.equal(first.grid.children[1].disabled,true);
  first.close();assert.equal(closeCount,1);assert.equal(isGalleryOverlayActive(),false);assert.equal(document.activeElement,opener);
  first.open();photo.fire('click');second.open();assert.equal(first.dialog.open,false);assert.equal(first.viewer.open,false);
  assert.equal(second.dialog.open,true);assert.match(second.grid.querySelector('.gallery-empty').textContent,/準備中/);
  second.close();assert.equal(isGalleryOverlayActive(),false);
 }finally{first?.close();second?.close();globalThis.document=originalDocument;globalThis.requestAnimationFrame=originalRAF}
});
