import test from 'node:test';
import assert from 'node:assert/strict';
import {createHost} from '../javascript/server.mjs';
/** Real loopback HTTP tests use ephemeral ports and always close their host. */
test('LAN lifecycle, authority, replay rejection and request limits',async t=>{
 const {server,game,players}=createHost({code:'test-room'});server.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const url=`http://127.0.0.1:${server.address().port}`;
 const post=async(path,data,extra={})=>{const r=await fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
 assert.equal((await post('/join',{code:'wrong'})).status,403);
 assert.equal((await post('/state',{})).status,401);
 const a=(await post('/join',{code:'test-room'})).data,b=(await post('/join',{code:'test-room'})).data;
 assert.equal(a.player,0);assert.equal(b.player,1);assert.notEqual(a.token,b.token);
 assert.equal((await post('/join',{code:'test-room'})).status,409);
 assert.equal((await post('/command',{token:a.token,seq:1,command:{type:'train',kind:'soldier'}})).data.ok,true);
 assert.equal(game.credits[0],60);
 assert.equal((await post('/command',{token:a.token,seq:1,command:{type:'train',kind:'soldier'}})).status,409);
 assert.equal(game.credits[0],60);
 assert.equal((await post('/command',{token:a.token,seq:2,command:{type:'move',ids:[5],x:4,y:4}})).data.ok,false);
 assert.equal((await post('/state',{token:b.token})).data.player,1);
 assert.equal((await post('/state',{token:b.token},{Origin:'http://attacker.test'})).status,403);
 assert.equal((await post('/state',{token:b.token,padding:'x'.repeat(9000)})).status,413);
 assert.equal((await fetch(url+'/core.mjs')).status,200);
 assert.equal((await fetch(url+'/../package.json')).status,404);
 await new Promise(r=>setTimeout(r,220));assert(game.tick>=1);
 await post('/leave',{token:b.token});assert.equal(players.size,1);
 await new Promise(r=>setTimeout(r,120));const tick=game.tick;await new Promise(r=>setTimeout(r,120));assert.equal(game.tick,tick);
 const c=(await post('/join',{code:'test-room'})).data;assert.equal(c.player,1);
 for(let i=0;i<36;i++)await post('/state',{token:c.token});assert.equal((await post('/state',{token:c.token})).status,429);
});
test('bot host reserves second slot',async t=>{
 const {server}=createHost({bots:true});server.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const url=`http://127.0.0.1:${server.address().port}/join`;
 const join=()=>fetch(url,{method:'POST',body:JSON.stringify({code:'glyph'})});assert.equal((await join()).status,200);assert.equal((await join()).status,409);
});
