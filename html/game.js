/** Static-server Canvas edition: shares rules with LAN, runs entirely offline. */
import {createGame,command,step,ai,W,H,TICK,CAP} from './core.js';

const $ = id => document.getElementById(id);
const canvas = $('map');
const ctx = canvas.getContext('2d');
const selected = new Set();
const colors = {background:'#0a101b',grid:'#203246',blue:'#65e1e4',enemy:'#ff9e62',gold:'#f4d374'};
let game = createGame();
let paused = false;
let drag = null;
let accumulator = 0;
let lastTime = performance.now();
let notice = '';
let noticeUntil = 0;

/** Temporary feedback uses textContent, never injected markup. */
function notify(text) {
  notice = text;
  noticeUntil = performance.now() + 3000;
}

/** All local actions still pass through the shared rules validator. */
function issue(order) {
  const accepted = command(game, 0, order);
  if (!accepted) notify(game.winner !== null ? 'Match finished. Start a new game.' : 'Order rejected: check selection, credits or destination.');
  return accepted;
}

/** Purchases take effect immediately, including while tactically paused. */
function recruit(kind) {
  if (issue({type:'train',kind})) notify(`${kind === 'worker' ? 'Worker' : 'Soldier'} recruited at your headquarters.`);
}

/** Select every owned soldier; stable IDs survive movement and array removals. */
function selectArmy() {
  selected.clear();
  for (const unit of game.units) if (unit.p === 0 && unit.kind === 'soldier') selected.add(unit.id);
}

/** Independently assign each worker to the nearest nonempty ore deposit. */
function harvest() {
  let count = 0;
  for (const unit of game.units.filter(u => u.p === 0 && u.kind === 'worker')) {
    const ore = game.ore.filter(r => r.amount > 0).sort((a,b) =>
      Math.abs(a.x-unit.x)+Math.abs(a.y-unit.y)-Math.abs(b.x-unit.x)-Math.abs(b.y-unit.y))[0];
    if (ore && issue({type:'gather',ids:[unit.id],x:ore.x,y:ore.y})) count++;
  }
  notify(count ? `${count} worker(s) sent to gather ore.` : 'No workers or ore available.');
}

/** Pause only time progression; orders can be planned while paused. */
function togglePause() {
  paused = !paused;
  accumulator = 0;
  $('pause').innerHTML = paused ? 'Resume <kbd>Space</kbd>' : 'Pause <kbd>Space</kbd>';
  $('pause').setAttribute('aria-pressed',String(paused));
}

/** Reset state without reloading the page or creating another animation loop. */
function restart() {
  game = createGame();
  selected.clear();
  drag = null;
  notice = '';
  if (paused) togglePause();
  accumulator = 0;
  lastTime = performance.now();
}

/** Convert CSS-scaled pointer coordinates to continuous grid coordinates. */
function position(event) {
  const rect = canvas.getBoundingClientRect();
  return {x:(event.clientX-rect.left)/rect.width*W,y:(event.clientY-rect.top)/rect.height*H};
}

/** Click selects one unit; dragging selects owned mobile units in a rectangle. */
function finishSelection(end) {
  if (!drag) return;
  if (!drag.additive) selected.clear();
  const wide = Math.abs(end.x-drag.start.x) > .3 || Math.abs(end.y-drag.start.y) > .3;
  const owned = game.units.filter(u => u.p === 0 && u.kind !== 'hq');
  if (wide) {
    const minX = Math.min(end.x,drag.start.x),maxX = Math.max(end.x,drag.start.x);
    const minY = Math.min(end.y,drag.start.y),maxY = Math.max(end.y,drag.start.y);
    for (const u of owned) if (u.x+.5 >= minX && u.x+.5 <= maxX && u.y+.5 >= minY && u.y+.5 <= maxY) selected.add(u.id);
  } else {
    const unit = owned.find(u => u.x === Math.floor(end.x) && u.y === Math.floor(end.y));
    if (unit) selected.add(unit.id);
  }
  drag = null;
}

/** Right-click contextual order: ore means gathering; all other tiles attack-move. */
function contextualOrder(point) {
  const x = Math.floor(point.x),y = Math.floor(point.y);
  if (!selected.size) { notify('Select blue units first, or press A for your soldiers.'); return; }
  const gather = game.ore.some(r => r.x === x && r.y === y && r.amount > 0);
  if (issue({type:gather?'gather':'attack',ids:[...selected],x,y})) notify(gather?'Gather order issued.':'Move / attack order issued.');
}

$('worker').onclick = () => recruit('worker');
$('soldier').onclick = () => recruit('soldier');
$('army').onclick = selectArmy;
$('harvest').onclick = harvest;
$('pause').onclick = togglePause;
$('pause').setAttribute('aria-pressed','false');
$('restart').onclick = restart;
canvas.oncontextmenu = event => event.preventDefault();
canvas.onpointerdown = event => {
  canvas.focus({preventScroll:true});
  const point = position(event);
  if (event.button === 2) contextualOrder(point);
  if (event.button === 0) {
    canvas.setPointerCapture(event.pointerId);
    drag = {start:point,end:point,additive:event.shiftKey};
  }
};
canvas.onpointermove = event => { if (drag) drag.end = position(event); };
canvas.onpointerup = event => { if (event.button === 0) finishSelection(position(event)); };
canvas.onpointercancel = () => { drag = null; };
canvas.onlostpointercapture = () => { drag = null; };
document.addEventListener('keydown',event => {
  if (event.repeat || event.target.closest('button,input,select,textarea')) return;
  const action = {w:()=>recruit('worker'),s:()=>recruit('soldier'),a:selectArmy,g:harvest,' ':togglePause}[event.key.toLowerCase()];
  if (action) { event.preventDefault(); action(); }
});
// Hidden tabs pause simulation time instead of accumulating minutes of catch-up.
document.addEventListener('visibilitychange',() => { accumulator = 0; lastTime = performance.now(); });

/** Draw one glyph in a fixed-size tile using the browser's local monospace font. */
function glyph(x,y,text,color) {
  ctx.fillStyle = color;
  ctx.fillText(text,(x+.5)*canvas.width/W,(y+.55)*canvas.height/H);
}

/** Render the current world and selection, with HP bars and drag feedback. */
function render() {
  const cw = canvas.width/W,ch = canvas.height/H;
  ctx.fillStyle = colors.background;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) glyph(x,y,'.',colors.grid);
  for (const wall of game.walls) { const [x,y] = wall.split(',').map(Number); glyph(x,y,'#','#63768b'); }
  for (const ore of game.ore) if (ore.amount > 0) glyph(ore.x,ore.y,'$',colors.gold);
  for (const u of game.units) {
    glyph(u.x,u.y,{hq:'H',worker:'w',soldier:'s'}[u.kind],u.p?colors.enemy:colors.blue);
    const maxHP = u.kind === 'hq' ? 180 : u.kind === 'worker' ? 35 : 60;
    if (u.hp < maxHP) {
      ctx.fillStyle = '#263649'; ctx.fillRect(u.x*cw+3,u.y*ch+1,cw-6,2);
      ctx.fillStyle = u.p ? colors.enemy : colors.blue; ctx.fillRect(u.x*cw+3,u.y*ch+1,(cw-6)*u.hp/maxHP,2);
    }
    if (selected.has(u.id)) { ctx.strokeStyle = colors.gold; ctx.strokeRect(u.x*cw+1,u.y*ch+1,cw-2,ch-2); }
  }
  if (drag) {
    const x = Math.min(drag.start.x,drag.end.x)*cw,y = Math.min(drag.start.y,drag.end.y)*ch;
    const w = Math.abs(drag.end.x-drag.start.x)*cw,h = Math.abs(drag.end.y-drag.start.y)*ch;
    ctx.fillStyle = '#65e1e41a'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle = colors.blue; ctx.strokeRect(x,y,w,h);
  }
}

/** Update textual HUD only when values change to keep assistive output calm. */
function updateHUD() {
  const owned = game.units.filter(u => u.p === 0);
  const alive = new Set(owned.map(u => u.id));
  for (const id of selected) if (!alive.has(id)) selected.delete(id);
  const seconds = Math.floor(game.tick*TICK/1000);
  let text = 'Gather ore, grow your army, destroy the orange H.';
  if (notice && performance.now() < noticeUntil) text = notice;
  if (paused) text = 'PAUSED · Plan orders, then resume the battle.';
  if (game.winner !== null) text = game.winner === 2 ? 'DRAW · Both headquarters destroyed.' : game.winner === 0 ? 'VICTORY · Enemy headquarters destroyed.' : 'DEFEAT · Your headquarters was destroyed.';
  const values = {credits:String(game.credits[0]),population:`${owned.length} / ${CAP}`,hq:`${owned.find(u=>u.kind==='hq')?.hp||0} HP`,clock:`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`,selection:`${selected.size} SELECTED`,status:text};
  for (const [id,value] of Object.entries(values)) if ($(id).textContent !== value) $(id).textContent = value;
  for (const [kind,cost] of [['worker',30],['soldier',40]]) $(kind).disabled = game.winner !== null || game.credits[0] < cost || owned.length >= CAP;
}

/** One animation owner; bounded fixed ticks avoid tab-resume catch-up bursts. */
function frame(now) {
  const elapsed = Math.min(250,now-lastTime);
  lastTime = now;
  if (!paused && !document.hidden && game.winner === null) {
    accumulator += elapsed;
    while (accumulator >= TICK) { ai(game); step(game); accumulator -= TICK; }
  }
  updateHUD();
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
