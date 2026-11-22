/** The fishing event is independent of the HTML board stages. */
export const fishingState={phase:'idle',progress:0,opened:false,castingAt:0};
export function startCast(now){if(fishingState.phase==='reeling')return false;fishingState.phase='reeling';fishingState.progress=0;fishingState.castingAt=now;return true}
export function finishCast(){fishingState.phase='caught';fishingState.progress=1;fishingState.opened=true}
export function resetCast(){fishingState.phase='idle';fishingState.progress=0;fishingState.opened=false;fishingState.castingAt=0}
