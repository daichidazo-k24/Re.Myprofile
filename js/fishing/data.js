/** 釣果画像はすべてこのサイト内のファイル。旧釣果ページへの依存はない。 */
import {FISHING_CONTENT} from '../content/fishing.js';
export const FISH_COUNT = FISHING_CONTENT.imageCount;
export const FISH_IMAGES = Array.from({length:FISH_COUNT},(_,i)=>({
 id:i+1,
 alt:`${FISHING_CONTENT.photoLabel} ${i+1}`,
 src:`image/fish${i+1}.jpg`,
}));
