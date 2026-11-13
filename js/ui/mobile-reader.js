/** A readable phone-sized version of the SAME continuous HTML stage. */
import {STAGES} from '../data/stages.js';
import {state} from '../state.js';
import {renderStageDocument} from './document.js';
import {registerBoard,scrollToSection} from './board-scroll.js';
import {onNavigate} from './navigation.js';
export function installMobileReader(){
 const container=document.createElement('div');container.id='mobileReaders';container.className='mobile-readers';
 const regions=[];
 STAGES.forEach((stage,i)=>{
  if(stage.id==='fishing')return;
  const root=document.createElement('div');root.className='mobile-reader';root.dataset.stage=stage.id;
  const html=renderStageDocument(i).replaceAll('id="','id="mobile-').replaceAll('href="#','href="#mobile-');
  root.innerHTML=`<div class="mobile-reader-head"><strong>▣ ${stage.short}</strong><span>SCROLL TO EXPLORE ↓</span></div><div class="mobile-reader-scroll" role="region" tabindex="0" aria-label="${stage.short} の資料">${html}</div>`;
  const area=root.querySelector('.mobile-reader-scroll');
  area.addEventListener('click',event=>{
   const anchor=event.target.closest?.('a[href^="#"]');
   if(!anchor)return;
   event.preventDefault();scrollToSection(i,anchor.getAttribute('href'));
  });
  container.appendChild(root);regions.push({root,area});
 });
 document.body.appendChild(container);
 const mq=window.matchMedia('(max-width:650px)');
 let wasMobile=false;
 function adapt(){
  if(mq.matches!==wasMobile){
   wasMobile=mq.matches;
   for(let i=0;i<STAGES.length;i++){
    const primary=document.querySelectorAll('.webgl-live-board,.css3d-stage .board-scroll-area')[i];
    if(regions[i])registerBoard(i,wasMobile?regions[i].area:primary);
   }
  }
  regions.forEach(({root},i)=>root.classList.toggle('is-current',state.active===i));
 }
 onNavigate(adapt);mq.addEventListener('change',adapt);adapt();
 return {regions};
}
