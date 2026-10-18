import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,command,step,nextStep,ai,CAP} from '../javascript/core.mjs';

test('fresh state is reproducible and independent',()=>{const a=createGame(),b=createGame();assert.deepEqual(a,b);a.credits[0]--;assert.equal(b.credits[0],100);assert.equal(a.units.length,6);});
test('purchases charge exactly once and enforce funds/kinds',()=>{const g=createGame();assert(command(g,0,{type:'train',kind:'soldier'}));assert.equal(g.credits[0],60);assert(!command(g,0,{type:'train',kind:'dragon'}));g.credits[0]=0;assert(!command(g,0,{type:'train',kind:'worker'}));});
test('population cap cannot be exceeded',()=>{const g=createGame();g.credits[0]=100000;for(let n=0;n<100;n++)command(g,0,{type:'train',kind:'soldier'});assert.equal(g.units.filter(u=>u.p===0).length,CAP);});
test('forged ownership, HQ movement, bad coordinates and walls rejected',()=>{const g=createGame();for(const c of [{ids:[5],x:1,y:1},{ids:[1],x:1,y:1},{ids:[2],x:NaN,y:1},{ids:[2],x:40,y:1},{ids:[2],x:20,y:4},{ids:[2],x:1.1,y:1}])assert(!command(g,0,{type:'move',...c}));});
test('path goes through gap instead of crossing a wall',()=>{const g=createGame();const u={x:19,y:4};for(let i=0;i<40;i++){const old={...u};[u.x,u.y]=nextStep(g,u,22,4);assert(!g.walls.includes(`${u.x},${u.y}`));assert(Math.abs(u.x-old.x)+Math.abs(u.y-old.y)<=1);if(u.x===22&&u.y===4)return;}assert.fail('path never reached goal');});
test('unreachable goals keep units in place',()=>{const g=createGame();g.walls.push('0,1','1,0');assert.deepEqual(nextStep(g,{x:0,y:0},2,2),[0,0]);});
test('worker follows gather order and depletes ore into credits',()=>{const g=createGame();assert(command(g,0,{type:'gather',ids:[2],x:7,y:7}));for(let n=0;n<60;n++)step(g);assert(g.credits[0]>100);assert.equal(500-g.ore[0].amount,g.credits[0]-100);});
test('soldiers cannot harvest credits',()=>{const g=createGame();command(g,0,{type:'gather',ids:[3],x:7,y:7});for(let n=0;n<60;n++)step(g);assert.equal(g.credits[0],100);});
test('simultaneous lethal attacks can produce a draw',()=>{const g=createGame();g.units=g.units.filter(u=>u.kind==='hq'||u.kind==='soldier');const h=g.units.filter(u=>u.kind==='hq'),s=g.units.filter(u=>u.kind==='soldier');h[0].hp=h[1].hp=9;s[0].x=h[1].x;s[0].y=h[1].y;s[1].x=h[0].x;s[1].y=h[0].y;step(g);assert.equal(g.winner,2);const tick=g.tick;step(g);assert.equal(g.tick,tick);assert(!command(g,0,{type:'train',kind:'soldier'}));});
test('AI gathers, trains and attacks; seeded play repeats exactly',()=>{const a=createGame(),b=createGame();for(let i=0;i<100;i++){ai(a);step(a);ai(b);step(b);}assert.deepEqual(a,b);assert(a.credits[1]<100);assert(a.units.some(u=>u.p===1&&u.kind==='soldier'&&u.order));});
