-- LuaJIT FFI entry: the shared native rules and raylib view have a stable C ABI.
-- Run from repository root: luajit lua/main.lua
local ffi = require('ffi')
ffi.cdef[[
typedef struct {int owner,kind,x,y,hp,tx,ty,gather,cool,active;} Unit;
typedef struct {int tick,credits[2],winner,count;Unit units[120];} Game;
void rts_init(Game *g);
void view_open(void);
int view_should_close(void);
void view_frame(Game *g);
void view_close(void);
]]
local lib = ffi.load('./build/librts.so')
local game = ffi.new('Game[1]') -- Array owns storage; decays to Game pointer.
lib.rts_init(game)
lib.view_open()
-- xpcall preserves the diagnostic while ensuring normal Lua failures close GL.
local ok, err = xpcall(function()
    while lib.view_should_close() == 0 do lib.view_frame(game) end
end, debug.traceback)
lib.view_close()
if not ok then error(err) end
