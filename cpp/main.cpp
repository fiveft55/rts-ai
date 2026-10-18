#include "../c/rts.h"
/* RAII releases the window on every normal scope exit. The C ABI reuses rules. */
class Window {
public:
 Window(){view_open();}
 ~Window(){view_close();}
 Window(const Window&)=delete;
 Window& operator=(const Window&)=delete;
 bool open() const{return !view_should_close();}
};
int main(){Game game{};rts_init(&game);Window window;while(window.open())view_frame(&game);}
