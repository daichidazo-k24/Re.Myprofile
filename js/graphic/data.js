import {GRAPHIC_CONTENT} from '../content/graphic.js';
export function graphicEntries(works=GRAPHIC_CONTENT.works){
 return works.map((work,index)=>{
  const parts=work.file.split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'||/[\\:]/.test(p)))throw Error('Graphic image must be a relative path inside GraphicImage');
  return {id:index+1,title:work.title,group:parts.length>1?parts[0]:null,kind:work.kind==='header'?'header':'poster',
   note:work.note||'',
   alt:work.description?`${work.title} — ${work.description}`:work.title,
   src:`GraphicImage/${parts.map(encodeURIComponent).join('/')}`};
 });
}
export const GRAPHIC_IMAGES=graphicEntries();
