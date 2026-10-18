#include "rts.h"
#include "raylib.h"
static int selected[RTS_MAX];static double accumulator;
/* Built-in raylib font renders ASCII without external assets. */
void view_open(void){InitWindow(880,620,"Glyph Command / native offline");SetTargetFPS(60);accumulator=0;for(int i=0;i<RTS_MAX;i++)selected[i]=0;}
int view_should_close(void){return WindowShouldClose();}
void view_close(void){CloseWindow();}
/* Input emits validated orders; time accumulator separates simulation/render. */
void view_frame(Game *g){
 Vector2 mouse=GetMousePosition();int x=(int)(mouse.x/22),y=(int)(mouse.y/22);
 if(IsKeyPressed(KEY_R)){rts_init(g);for(int i=0;i<RTS_MAX;i++)selected[i]=0;}
 if(IsKeyPressed(KEY_W))rts_train(g,0,1);if(IsKeyPressed(KEY_S))rts_train(g,0,2);
 if(IsKeyPressed(KEY_A))for(int i=0;i<g->count;i++)selected[i]=g->units[i].active&&g->units[i].owner==0&&g->units[i].kind==2;
 if(IsMouseButtonPressed(MOUSE_BUTTON_LEFT)){
  if(!IsKeyDown(KEY_LEFT_SHIFT))for(int i=0;i<RTS_MAX;i++)selected[i]=0;
  for(int i=0;i<g->count;i++){Unit *u=&g->units[i];if(u->active&&!u->owner&&u->kind&&u->x==x&&u->y==y){selected[i]=1;break;}}
 }
 if(IsMouseButtonPressed(MOUSE_BUTTON_RIGHT))for(int i=0;i<g->count;i++)if(selected[i])rts_order(g,i,0,x,y,(x==7||x==32)&&y==7);
 accumulator+=GetFrameTime();if(accumulator>0.5)accumulator=0.5;while(accumulator>=0.1){rts_tick(g);accumulator-=0.1;}
 BeginDrawing();ClearBackground((Color){11,18,32,255});
 for(int yy=0;yy<24;yy++)for(int xx=0;xx<40;xx++)DrawText(".",xx*22+5,yy*22,20,(Color){32,51,72,255});
 DrawText("$",7*22,7*22,20,YELLOW);DrawText("$",32*22,7*22,20,YELLOW);
 for(int i=0;i<g->count;i++){Unit *u=&g->units[i];if(!u->active)continue;DrawText(u->kind==0?"H":u->kind==1?"w":"s",u->x*22,u->y*22,20,u->owner?ORANGE:SKYBLUE);if(selected[i])DrawRectangleLines(u->x*22,u->y*22,22,22,YELLOW);}
 DrawText(TextFormat("Credits %d | W worker 30 | S soldier 40 | A army | R restart",g->credits[0]),12,540,18,RAYWHITE);
 DrawText("Left select (+Shift) | Right move/gather | Destroy orange H",12,568,18,RAYWHITE);
 if(g->winner!=-1)DrawText(g->winner==0?"VICTORY":g->winner==1?"DEFEAT":"DRAW",350,280,32,YELLOW);
 EndDrawing();
}
