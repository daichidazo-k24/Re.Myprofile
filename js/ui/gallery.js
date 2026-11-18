/** Shared full-viewport photo/art collection and modal image viewer. */
const galleries=new Set();
export function isGalleryOverlayActive(){for(const gallery of galleries)if(gallery.isOpen())return true;return false}
export function createGallery({id,title,label,intro,entries,groups=[],itemLabel,emptyText='作品は準備中です。',resolveSource=entry=>entry.src,onClose=()=>{}}){
 const dialog=document.createElement('dialog');dialog.id=`${id}Gallery`;
 dialog.className=`fishing-gallery-dialog media-gallery-dialog ${id}-gallery`;
 dialog.setAttribute('aria-label',title);
 dialog.innerHTML='<div class="fishing-gallery-shell"><header class="gallery-masthead"><div><span class="gallery-mini-label"></span><h2></h2><p></p></div><button class="gallery-close" type="button">×</button></header><div class="gallery-photogrid"></div><footer class="gallery-footer"><span></span><button type="button">↶ WORLDへ戻る</button></footer></div>';
 dialog.querySelector('.gallery-mini-label').textContent=label;
 dialog.querySelector('h2').textContent=title;
 dialog.querySelector('.gallery-masthead p').textContent=intro;
 dialog.querySelector('.gallery-footer span').textContent=`${entries.length} ${itemLabel}`;
 dialog.querySelector('.gallery-close').setAttribute('aria-label',`${title}を閉じる`);
 const grid=dialog.querySelector('.gallery-photogrid');grid.id=`${id}Photogrid`;grid.tabIndex=0;
 grid.setAttribute('role','region');grid.setAttribute('aria-label',`${title}、${entries.length}点。スクロールして閲覧できます`);
 const viewer=document.createElement('dialog');viewer.id=`${id}PhotoViewer`;viewer.className='fishing-photo-viewer media-photo-viewer';
 viewer.setAttribute('aria-label','画像の拡大表示');
 viewer.innerHTML='<button type="button" aria-label="画像を閉じる" class="viewer-close">×</button><div class="viewer-image-wrap"><img alt=""></div><p data-caption></p>';
 const viewImg=viewer.querySelector('img');viewImg.decoding='async';
 const viewerNote=id==='graphic'?document.createElement('p'):null;
 if(viewerNote){viewerNote.className='viewer-note';viewerNote.hidden=true;viewer.append(viewerNote)}
 let photoButton=null,opener=null;
 const groupGrids=new Map();
 for(const group of groups){
  if(!entries.some(entry=>entry.group===group.id))continue;
  const section=document.createElement('section');section.className='gallery-section';section.dataset.group=group.id;
  const heading=document.createElement('h3');heading.id=`${id}-group-${groupGrids.size}`;
  heading.textContent=`${group.label} · ${group.format}`;section.setAttribute('aria-labelledby',heading.id);
  const row=document.createElement('div');row.className='gallery-section-grid';
  section.append(heading,row);grid.append(section);groupGrids.set(group.id,row);
 }
 for(const [index,entry] of entries.entries()){
  const button=document.createElement('button');button.className='gallery-photo';button.type='button';
  button.dataset.kind=entry.kind||'photo';button.setAttribute('aria-label',`${entry.alt}を拡大表示`);
  const img=document.createElement('img');img.src=resolveSource(entry);img.alt=entry.alt;img.loading='lazy';img.decoding='async';
  img.addEventListener('error',()=>{button.classList.add('is-missing-photo');button.disabled=true});
  const caption=document.createElement('span');caption.className='gallery-photo-number';
  caption.textContent=entry.title||`${itemLabel==='PHOTOS'?'FISH':'WORK'} ${String(index+1).padStart(2,'0')}`;
  button.append(img,caption);
  const note=typeof entry.note==='string'?entry.note.trim():'';
  if(note){
   const memo=document.createElement('span');memo.className='gallery-photo-note';memo.id=`${id}-note-${index}`;
   memo.textContent=note;button.append(memo);button.setAttribute('aria-describedby',memo.id);
  }
  (groupGrids.get(entry.group)||grid).append(button);
  button.addEventListener('click',()=>{
   photoButton=button;viewImg.src=img.src;viewImg.alt=entry.alt;
   viewer.querySelector('[data-caption]').textContent=`${index+1} / ${entries.length} · ${entry.alt}`;
   if(viewerNote){viewerNote.textContent=note;viewerNote.hidden=!note}
   if(!viewer.open)viewer.showModal();
  });
 }
 if(!entries.length){const empty=document.createElement('p');empty.className='gallery-empty';empty.textContent=emptyText;grid.append(empty)}
 const close=()=>{if(viewer.open)viewer.close();if(dialog.open)dialog.close()};
 dialog.querySelector('.gallery-close').addEventListener('click',close);
 dialog.querySelector('.gallery-footer button').addEventListener('click',close);
 viewer.querySelector('.viewer-close').addEventListener('click',()=>viewer.close());
 viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close()});
 viewer.addEventListener('close',()=>{viewImg.removeAttribute('src');if(dialog.open)photoButton?.focus({preventScroll:true})});
 dialog.addEventListener('close',()=>{
  if(viewer.open)viewer.close();dialog.classList.remove('is-caught');onClose();
  if(opener?.isConnected&&!opener.hidden)opener.focus({preventScroll:true});
 });
 // Escape is handled by native modal dialogs, one layer at a time.
 dialog.addEventListener('wheel',event=>{
  if(!dialog.open)return;event.stopPropagation();
  if(!grid.contains(event.target)){
   const unit=event.deltaMode===1?16:event.deltaMode===2?grid.clientHeight:1;
   grid.scrollTop+=event.deltaY*unit;if(event.cancelable)event.preventDefault();
  }
 },{capture:true,passive:false});
 viewer.addEventListener('wheel',event=>{event.stopPropagation();if(event.cancelable)event.preventDefault()},{capture:true,passive:false});
 dialog.addEventListener('keydown',event=>{
  if(!dialog.open||viewer.open)return;
  // Preserve native Space/Enter activation on the focused close/photo button.
  if(event.key===' '&&event.target.closest?.('button'))return;
  const d={ArrowDown:80,ArrowUp:-80,PageDown:grid.clientHeight*.8,PageUp:-grid.clientHeight*.8,' ':grid.clientHeight*.8};
  if(Object.hasOwn(d,event.key)){event.preventDefault();event.stopPropagation();grid.scrollTop+=d[event.key]}
  else if(event.key==='Home'||event.key==='End'){event.preventDefault();event.stopPropagation();grid.scrollTop=event.key==='Home'?0:grid.scrollHeight}
 },{capture:true});
 document.body.append(dialog,viewer);
 const gallery={dialog,viewer,grid,close,isOpen:()=>dialog.open||viewer.open,open(){
  if(dialog.open)return;
  for(const other of galleries)if(other!==gallery)other.close();
  opener=document.activeElement;dialog.showModal();
  requestAnimationFrame(()=>{if(dialog.open){dialog.classList.add('is-caught');grid.focus({preventScroll:true})}});
 }};
 galleries.add(gallery);return gallery;
}
