/** Dependency-free authoritative HTTP LAN host. Never trusts client state. */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createGame,command,step,ai,TICK} from './core.mjs';
const files={'/':'index.html','/app.mjs':'app.mjs','/core.mjs':'core.mjs','/style.css':'style.css'};
/** Factory exposes lifecycle for integration tests; one match, two player slots. */
export function createHost({code='glyph',bots=false}={}){
 const game=createGame(),players=new Map();let timer;
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  try{
   const path=new URL(req.url,'http://local').pathname;
   if(req.method==='GET'&&files[path]){const f=files[path];res.setHeader('Content-Type',f.endsWith('.mjs')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(await readFile(new URL(f,import.meta.url)));return;}
   if(req.method!=='POST')return send(404,{error:'Not found'});
   // Reject cross-origin browser submissions and oversized/slow request bodies.
   if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return send(403,{error:'Origin rejected'});
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return send(413,{error:'Body too large'});}
   let data;try{data=JSON.parse(body);}catch{return send(400,{error:'Invalid JSON'});}
   if(!data||typeof data!=='object'||Array.isArray(data))return send(400,{error:'Expected object'});
   if(path==='/join'){
    const a=Buffer.from(String(data.code||'')),b=Buffer.from(code);
    if(a.length!==b.length||!timingSafeEqual(a,b))return send(403,{error:'Wrong room code'});
    const occupied=new Set([...players.values()].map(p=>p.slot));const slot=[0,1].find(p=>!occupied.has(p)&&!(bots&&p===1));
    if(slot===undefined)return send(409,{error:'Room full'});
    const token=randomBytes(24).toString('hex');players.set(token,{slot,seq:0,last:Date.now(),window:Date.now(),count:0});return send(200,{token,player:slot});
   }
   const p=players.get(data.token);if(!p)return send(401,{error:'Join first'});p.last=Date.now();
   if(Date.now()-p.window>=1000){p.window=Date.now();p.count=0;}
   if(++p.count>35)return send(429,{error:'Rate limit'});
   if(path==='/state')return send(200,{game,player:p.slot,seq:p.seq});
   if(path==='/leave'){players.delete(data.token);return send(200,{ok:true});}
   if(path==='/command'){
    if(!Number.isSafeInteger(data.seq)||data.seq!==p.seq+1)return send(409,{error:'Sequence mismatch',seq:p.seq});
    p.seq=data.seq;return send(200,{ok:command(game,p.slot,data.command),seq:p.seq});
   }return send(404,{error:'Not found'});
  }catch(e){if(!res.headersSent)send(500,{error:'Request failed'});else res.end();}
 });
 server.requestTimeout=5000;server.headersTimeout=5000;server.maxConnections=32;
 server.on('listening',()=>{timer=setInterval(()=>{
  for(const [token,p]of players)if(Date.now()-p.last>15000)players.delete(token);
  // Pause a human match until both slots are occupied; disconnect pauses play.
  if(bots||players.size===2){if(bots)ai(game);step(game);}
 },TICK);});server.on('close',()=>clearInterval(timer));return {server,game,players};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const {server}=createHost({code:process.env.ROOM_CODE||'glyph',bots:process.argv.includes('--bot')});
 server.listen(Number(process.env.PORT||8080),process.env.HOST||'127.0.0.1',()=>console.log('Glyph Command host listening; default room code: glyph (override ROOM_CODE).'));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
