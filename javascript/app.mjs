import {createGame,command,step,ai,W,H,TICK} from './core.mjs';
const $=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d');
let game=createGame(),selected=new Set(),player=0,session=null,busy=false,message='',queue=Promise.resolve();
/** POST helper keeps auth in request bodies, never URL history. */
async function post(path,data){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const v=await r.json();if(!r.ok)throw Error(v.error);return v;}
/** Serialize commands so network reordering cannot duplicate or skip orders. */
function order(c){if(!session){command(game,player,c);return;}const s=session;queue=queue.then(async()=>{if(s!==session)return;const r=await post('/command',{token:s.token,seq:s.seq+1,command:c});s.seq=r.seq;}).catch(e=>{message=e.message+'; rejoin to resynchronize';});}
/** Leave explicitly releases the slot; offline mode never sends game orders. */
async function leave(){const s=session;session=null;if(s)await post('/leave',{token:s.token}).catch(()=>{});}
$('offline').onclick=async()=>{await leave();game=createGame();player=0;selected.clear();message='';};
$('leave').onclick=()=>{$('offline').click();};
$('join').onclick=async()=>{await leave();try{session={...await post('/join',{code:$('code').value}),seq:0};player=session.player;selected.clear();message='';}catch(e){message=e.message;}};
for(const kind of ['worker','soldier'])$(kind).onclick=()=>order({type:'train',kind});
$('all').onclick=()=>{selected=new Set(game.units.filter(u=>u.p===player&&u.kind==='soldier').map(u=>u.id));};
$('harvest').onclick=()=>{for(const u of game.units.filter(u=>u.p===player&&u.kind==='worker')){const r=game.ore.filter(r=>r.amount>0).sort((a,b)=>Math.abs(a.x-u.x)+Math.abs(a.y-u.y)-Math.abs(b.x-u.x)-Math.abs(b.y-u.y))[0];if(r)order({type:'gather',ids:[u.id],x:r.x,y:r.y});}};
/** Canvas coordinates account for CSS scaling; right click emits contextual order. */
canvas.oncontextmenu=e=>e.preventDefault();canvas.onpointerdown=e=>{
 const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*W),y=Math.floor((e.clientY-r.top)/r.height*H);
 if(e.button===0){if(!e.shiftKey)selected.clear();const u=game.units.find(u=>u.p===player&&u.kind!=='hq'&&u.x===x&&u.y===y);if(u)selected.add(u.id);}
 if(e.button===2)order({type:game.ore.some(r=>r.x===x&&r.y===y&&r.amount)?'gather':'attack',ids:[...selected],x,y});
};
document.onkeydown=e=>{if(e.target.tagName==='INPUT')return;const button={w:'worker',s:'soldier',a:'all'}[e.key.toLowerCase()];if(button)$(button).click();};
/** Tick offline locally, or fetch authoritative snapshots at 10 Hz. */
setInterval(async()=>{
 if(!session){ai(game);step(game);}else if(!busy){busy=true;const s=session;try{const r=await post('/state',{token:s.token});if(s===session)game=r.game;}catch(e){message=e.message;}finally{busy=false;}}
},TICK);
/** Render using installed monospace fonts; no downloaded assets or font license. */
function draw(){
 const cw=canvas.width/W,ch=canvas.height/H;ctx.fillStyle='#0b1220';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font='18px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
 const glyph=(x,y,s,color)=>{ctx.fillStyle=color;ctx.fillText(s,(x+.5)*cw,(y+.5)*ch);};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)glyph(x,y,'.','#203348');
 for(const wall of game.walls){const [x,y]=wall.split(',').map(Number);glyph(x,y,'#','#65758b');}
 for(const r of game.ore)if(r.amount)glyph(r.x,r.y,'$','#facc15');
 for(const u of game.units){glyph(u.x,u.y,{hq:'H',worker:'w',soldier:'s'}[u.kind],u.p?'#fb923c':'#67e8f9');if(selected.has(u.id)){ctx.strokeStyle='#facc15';ctx.strokeRect(u.x*cw,u.y*ch,cw,ch);}}
 $('status').textContent=message||`${session?'LAN':'OFFLINE'} · Player ${player+1} · Credits ${game.credits[player]} · Units ${game.units.filter(u=>u.p===player).length} · Tick ${game.tick}${game.winner!==null?' · '+(game.winner===2?'DRAW':game.winner===player?'VICTORY':'DEFEAT'):''}`;
 requestAnimationFrame(draw);
}draw();
