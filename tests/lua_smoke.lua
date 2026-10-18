-- Validate the LuaJIT ABI against the real C rules without opening a window.
local ffi = require('ffi')
ffi.cdef[[
typedef struct {int owner,kind,x,y,hp,tx,ty,gather,cool,active;} Unit;
typedef struct {int tick,credits[2],winner,count;Unit units[120];} Game;
void rts_init(Game*);
int rts_order(Game*,int,int,int,int,int);
void rts_tick(Game*);
]]
local lib=ffi.load('./build/librts.so')
local g=ffi.new('Game[1]')
lib.rts_init(g)
assert(g[0].count==6 and g[0].units[3].owner==1)
assert(lib.rts_order(g,1,0,7,7,1)==1)
for _=1,60 do lib.rts_tick(g) end
assert(g[0].credits[0]>100)
print('LuaJIT smoke: native ABI, orders, movement and gathering passed')
