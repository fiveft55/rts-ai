#include "rts.h"
/* C entry point: own state, create view, run frames, release graphics. */
int main(void){Game game;rts_init(&game);view_open();while(!view_should_close())view_frame(&game);view_close();return 0;}
