#include "rts.h"
#include <stdlib.h>
#include <string.h>
/* kind 0=HQ, 1=worker, 2=soldier. Reuse inactive slots before appending. */
static int spawn(Game *g,int p,int k,int x,int y){
 int i;for(i=0;i<g->count&&g->units[i].active;i++);
 if(i==RTS_MAX)return 0;if(i==g->count)g->count++;
 Unit u={p,k,x,y,k==0?180:k==1?35:60,x,y,0,0,1};g->units[i]=u;return 1;
}
/* Reset deterministic state with the same initial economy as the browser. */
void rts_init(Game *g){memset(g,0,sizeof(*g));g->winner=-1;g->credits[0]=g->credits[1]=100;
 for(int p=0;p<2;p++){spawn(g,p,0,p?36:3,12);spawn(g,p,1,p?34:5,11);spawn(g,p,2,p?34:5,13);}}
/* Reject invalid purchases before charging; cap each army to 60 entities. */
int rts_train(Game *g,int p,int k){
 if(g->winner!=-1||p<0||p>1||k<1||k>2)return 0;
 int cost=k==1?30:40,n=0,h=-1;
 for(int i=0;i<g->count;i++)if(g->units[i].active&&g->units[i].owner==p){n++;if(!g->units[i].kind)h=i;}
 if(h<0||n>=60||g->credits[p]<cost)return 0;
 Unit *u=&g->units[h];if(!spawn(g,p,k,u->x+(p?-1:1),u->y))return 0;g->credits[p]-=cost;return 1;
}
/* Order only owned mobile units to legal grid coordinates. */
int rts_order(Game *g,int i,int p,int x,int y,int gather){
 if(g->winner!=-1||i<0||i>=g->count||x<0||x>=40||y<0||y>=24)return 0;
 Unit *u=&g->units[i];if(!u->active||u->owner!=p||!u->kind)return 0;
 u->tx=x;u->ty=y;u->gather=gather;return 1;
}
/* Native teaching variant has open terrain and unlimited ore at two deposits. */
void rts_tick(Game *g){
 if(g->winner!=-1)return;g->tick++;int damage[RTS_MAX]={0},alive[2]={0};
 if(g->tick%20==0){rts_train(g,1,2);for(int i=0;i<g->count;i++){
  Unit *u=&g->units[i];if(u->active&&u->owner==1&&u->kind)rts_order(g,i,1,u->kind==1?32:3,u->kind==1?7:12,u->kind==1);
 }}
 for(int i=0;i<g->count;i++){
  Unit *u=&g->units[i];if(!u->active||!u->kind)continue;if(u->cool>0)u->cool--;
  int target=-1;for(int j=0;j<g->count;j++){Unit *v=&g->units[j];if(v->active&&v->owner!=u->owner&&abs(v->x-u->x)+abs(v->y-u->y)<=(u->kind==2?3:1)){target=j;break;}}
  if(target>=0&&u->cool==0){damage[target]+=u->kind==2?9:2;u->cool=5;continue;}
  if(g->tick%3)continue;
  if(u->gather&&u->kind==1&&abs(u->x-u->tx)+abs(u->y-u->ty)<=1&&((u->tx==7||u->tx==32)&&u->ty==7)){g->credits[u->owner]++;continue;}
  if(u->x!=u->tx)u->x+=u->tx>u->x?1:-1;else if(u->y!=u->ty)u->y+=u->ty>u->y?1:-1;
 }
 for(int i=0;i<g->count;i++){Unit *u=&g->units[i];u->hp-=damage[i];if(u->hp<=0)u->active=0;if(u->active&&!u->kind)alive[u->owner]=1;}
 if(!alive[0]||!alive[1])g->winner=alive[0]?0:alive[1]?1:2;
}
