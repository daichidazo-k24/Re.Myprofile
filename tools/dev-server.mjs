/** No-dependency local static server. Run from any CWD: npm run dev */
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {dirname,resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PORT=Number(process.env.PORT||8000);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png',
 '.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
  const requested=decodeURIComponent(url.pathname).replace(/\\/g,'/');
  const file=resolve(ROOT,`.`+(requested.endsWith('/')?`${requested}index.html`:requested));
  if(file!==ROOT&&!file.startsWith(ROOT+sep)){res.writeHead(403);res.end('Forbidden');return;}
  const info=await stat(file);
  if(!info.isFile())throw new Error('not a file');
  res.writeHead(200,{'Content-Type':MIME[extname(file).toLowerCase()]||'application/octet-stream',
   'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  createReadStream(file).pipe(res);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not Found');}
}).listen(PORT,'127.0.0.1',()=>console.log(`DAICHI PORTFOLIO WORLD → http://127.0.0.1:${PORT}/`));
