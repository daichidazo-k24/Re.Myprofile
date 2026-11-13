/** Developer opt-in (?perf=1); no overhead for ordinary visitors. */
export function installPerformanceDiagnostics(getRenderer){
 if(typeof location==='undefined'||new URLSearchParams(location.search).get('perf')!=='1')return;
 const panel=document.createElement('aside');panel.id='questPerf';panel.setAttribute('aria-label','描画性能のデバッグ情報');
 Object.assign(panel.style,{position:'fixed',top:'84px',right:'12px',zIndex:'70',background:'#101b34ed',
  color:'#f5cf78',border:'1px solid #7390b8',padding:'9px 12px',font:'12px monospace',
  whiteSpace:'pre',pointerEvents:'none',boxShadow:'0 5px 0 #050a17'});
 document.body.appendChild(panel);
 let previousFrames=0,previousTime=performance.now(),previousUploads=0;
 const timer=setInterval(()=>{
  const engine=getRenderer(),now=performance.now();
  if(!engine.stats){panel.textContent='CSS3D fallback\nNative HTML-in-Canvas: unsupported';return}
  const stats=engine.stats,seconds=(now-previousTime)/1000;
  const fps=Math.round((stats.frames-previousFrames)/Math.max(.01,seconds));
  panel.textContent=`NATIVE HTML-in-CANVAS\nFPS: ${fps}\nTexture uploads/s: ${stats.uploads-previousUploads}\nTotal uploads: ${stats.uploads}\nGPU bytes sent: ${(stats.uploadedBytes/1048576).toFixed(1)} MiB\nLast upload: ${stats.lastUploadMs.toFixed(2)} ms\nErrors: ${stats.uploadErrors}`;
  previousFrames=stats.frames;previousUploads=stats.uploads;previousTime=now;
 },1000);
 window.addEventListener('pagehide',()=>{clearInterval(timer);panel.remove()},{once:true});
}
