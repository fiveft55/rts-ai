#include "../c/rts.h"
#include <assert.h>
#include <stdio.h>
/* Exercise actual native rules without an OpenGL display. */
int main(void){
 Game g;rts_init(&g);assert(g.count==6&&g.credits[0]==100);
 assert(!rts_order(&g,4,0,7,7,1));assert(!rts_order(&g,1,0,-1,7,1));
 assert(rts_order(&g,1,0,7,7,1));for(int i=0;i<60;i++)rts_tick(&g);assert(g.credits[0]>100);
 assert(rts_train(&g,0,2));assert(!rts_train(&g,0,9));g.credits[0]=0;assert(!rts_train(&g,0,1));
 rts_init(&g);g.units[3].hp=9;g.units[2].x=35;g.units[2].y=12;rts_tick(&g);assert(g.winner==0);
 puts("Native smoke: ownership, movement, harvest, purchases and victory passed");return 0;
}
