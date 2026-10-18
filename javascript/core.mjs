/** Pure fixed-tick RTS simulation. Browser and server use identical rules. */
export const W=40,H=24,TICK=100, CAP=60;
export const key=(x,y)=>`${x},${y}`;
/** Symmetric map, two HQs, starting squads, credits and stable entity IDs. */
export function createGame(){
 const g={tick:0,next:1,credits:[100,100],winner:null,units:[],walls:[],ore:[]};
 for(let y=3;y<H-3;y++) if(y!==10&&y!==11&&y!==12) g.walls.push(key(20,y));
 for(const [x,y] of [[7,7],[7,16],[32,7],[32,16]])g.ore.push({x,y,amount:500});
 for(let p=0;p<2;p++){spawn(g,p,'hq',p?36:3,12);spawn(g,p,'worker',p?34:5,11);spawn(g,p,'soldier',p?34:5,13);}
 return g;
}
/** Allocate an entity. HQs are stationary; workers harvest; soldiers fight. */
function spawn(g,p,kind,x,y){g.units.push({id:g.next++,p,kind,x,y,hp:kind==='hq'?180:kind==='worker'?35:60,order:null,cool:0});}
/** Shortest four-neighbor BFS; units may overlap to avoid formation deadlocks. */
export function nextStep(g,u,tx,ty){
 const queue=[[u.x,u.y]],seen=new Set([key(u.x,u.y)]),first=new Map(),walls=new Set(g.walls);
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i];if(x===tx&&y===ty)return first.get(key(x,y))||[x,y];
  for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){
   const nx=x+dx,ny=y+dy,k=key(nx,ny);
   if(nx<0||nx>=W||ny<0||ny>=H||walls.has(k)||seen.has(k))continue;
   seen.add(k);first.set(k,first.get(key(x,y))||[nx,ny]);queue.push([nx,ny]);
  }
 }return [u.x,u.y];
}
/** Validate ownership, coordinates, cost and population before mutating state. */
export function command(g,p,c){
 if(g.winner!==null||![0,1].includes(p)||!c||typeof c!=='object')return false;
 if(c.type==='train'){
  if(!['worker','soldier'].includes(c.kind))return false;
  const h=g.units.find(u=>u.p===p&&u.kind==='hq'),cost=c.kind==='worker'?30:40;
  if(!h||g.credits[p]<cost||g.units.filter(u=>u.p===p).length>=CAP)return false;
  g.credits[p]-=cost;spawn(g,p,c.kind,h.x+(p?-1:1),h.y);return true;
 }
 if(!['move','gather','attack'].includes(c.type)||!Array.isArray(c.ids)||c.ids.length>CAP)return false;
 if(!Number.isInteger(c.x)||!Number.isInteger(c.y)||c.x<0||c.x>=W||c.y<0||c.y>=H||g.walls.includes(key(c.x,c.y)))return false;
 const units=g.units.filter(u=>c.ids.includes(u.id)&&u.p===p&&u.kind!=='hq');
 for(const u of units)u.order={type:c.type,x:c.x,y:c.y};return units.length>0;
}
/** One 100 ms tick. Simultaneous damage avoids first-player combat advantage. */
export function step(g){
 if(g.winner!==null)return;g.tick++;const damage=new Map();
 for(const u of g.units){
  u.cool=Math.max(0,u.cool-1);if(u.kind==='hq')continue;
  const enemy=g.units.filter(v=>v.p!==u.p&&Math.abs(v.x-u.x)+Math.abs(v.y-u.y)<= (u.kind==='soldier'?3:1)).sort((a,b)=>a.id-b.id)[0];
  if(enemy&&u.cool===0){damage.set(enemy.id,(damage.get(enemy.id)||0)+(u.kind==='soldier'?9:2));u.cool=5;continue;}
  if(g.tick%3!==0||!u.order)continue;
  const o=u.order,dist=Math.abs(u.x-o.x)+Math.abs(u.y-o.y);
  if(o.type==='gather'&&u.kind==='worker'&&dist<=1){const r=g.ore.find(r=>r.x===o.x&&r.y===o.y&&r.amount>0);if(r){r.amount--;g.credits[u.p]++;}continue;}
  if(dist===0){if(o.type!=='gather')u.order=null;continue;}
  [u.x,u.y]=nextStep(g,u,o.x,o.y);
 }
 for(const u of g.units)u.hp-=damage.get(u.id)||0;
 g.units=g.units.filter(u=>u.hp>0);
 const alive=[0,1].map(p=>g.units.some(u=>u.p===p&&u.kind==='hq'));
 if(!alive[0]||!alive[1])g.winner=alive[0]?0:alive[1]?1:2;
}
/** Predictable, inexpensive opponent: harvest, recruit, then attack the HQ. */
export function ai(g,p=1){
 if(g.tick%20)return;const target=g.units.find(u=>u.p!==p&&u.kind==='hq');if(!target)return;
 command(g,p,{type:'train',kind:'soldier'});
 for(const u of g.units.filter(u=>u.p===p&&u.kind!=='hq')){
  const r=g.ore.filter(r=>r.amount>0).sort((a,b)=>(Math.abs(a.x-u.x)+Math.abs(a.y-u.y))-(Math.abs(b.x-u.x)+Math.abs(b.y-u.y)))[0];
  const t=u.kind==='worker'&&r?r:target;command(g,p,{type:u.kind==='worker'&&r?'gather':'attack',ids:[u.id],x:t.x,y:t.y});
 }
}
