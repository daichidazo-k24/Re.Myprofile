/** Native, length-independent scroll state. No fixed-height pagination or slide indices. */
import {STAGES} from '../data/stages.js';
import {state} from '../state.js';
const regions=new Map();
const subscribers=new Set();
export function onBoardScroll(fn){subscribers.add(fn);return ()=>subscribers.delete(fn)}
const publish=(i)=>{for(const fn of subscribers)fn(i,state.scrollY[i],boardProgress(i))};
export function registerBoard(i,el){
 if(!STAGES[i])throw Error('Unknown board');
 regions.set(i,el);
 el.scrollTop=state.scrollY[i];
 el.addEventListener('scroll',()=>{
  if(regions.get(i)!==el)return; // Old responsive scrollports must not overwrite the active one.
  const y=el.scrollTop;
  if(Math.abs(y-state.scrollY[i])>=.5){state.scrollY[i]=y;publish(i)}
 },{passive:true});
 publish(i);
}
export const maxBoardScroll=(i)=>{
 const area=regions.get(i);
 return area?Math.max(0,area.scrollHeight-area.clientHeight):0;
};
export const boardProgress=i=>{
 const max=maxBoardScroll(i);
 return max>0?Math.min(1,Math.max(0,state.scrollY[i]/max)):1;
};
export function setBoardScroll(i,y){
 const area=regions.get(i);
 if(!area)return false;
 const top=Math.max(0,Math.min(maxBoardScroll(i),Number.isFinite(y)?y:0));
 if(Math.abs(top-state.scrollY[i])<.5)return false;
 state.scrollY[i]=top;area.scrollTop=top;publish(i);return true;
}
export const scrollBoard=(delta,i=state.active)=>setBoardScroll(i,state.scrollY[i]+delta);
export const scrollToStart=i=>setBoardScroll(i,0);
export const scrollToEnd=i=>setBoardScroll(i,maxBoardScroll(i));
export const scrollToSection=(i,section)=>{
 const area=regions.get(i),anchor=area?.querySelector(section);
 if(!anchor)return false;
 const document=area.querySelector('.board-scroll-sheet');
 // The sheet is rendered at 0.674 of its layout pixels, including section offsets.
 return setBoardScroll(i,anchor.offsetTop*((area.classList.contains('mobile-reader-scroll')||area.classList.contains('hic-board-viewport'))?1:.674));
};
