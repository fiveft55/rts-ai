#ifndef GLYPH_RTS_H
#define GLYPH_RTS_H
#ifdef __cplusplus
extern "C" {
#endif
/* Native offline rules: 40x24 map, 10 Hz, up to 120 living units. */
#define RTS_MAX 120
typedef struct { int owner,kind,x,y,hp,tx,ty,gather,cool,active; } Unit;
typedef struct { int tick,credits[2],winner,count; Unit units[RTS_MAX]; } Game;
void rts_init(Game *g);
int rts_train(Game *g,int player,int kind);
int rts_order(Game *g,int index,int player,int x,int y,int gather);
void rts_tick(Game *g);
/* Raylib view bridge shared by C/C++, Python ctypes and LuaJIT FFI. */
void view_open(void);
int view_should_close(void);
void view_frame(Game *g);
void view_close(void);
#ifdef __cplusplus
}
#endif
#endif
