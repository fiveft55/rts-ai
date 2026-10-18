#!/usr/bin/env bash
# Linux x86-64: point RAYLIB_DIR at the official extracted raylib 5.5 directory.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${RAYLIB_DIR:=/workspace/deps/raylib-5.5_linux_amd64}"
mkdir -p build
flags=(-std=c11 -O2 -Wall -Wextra -Werror -Wno-misleading-indentation -fPIC)
cc "${flags[@]}" -I"$RAYLIB_DIR/include" -c c/rts.c -o build/rts.o
cc "${flags[@]}" -I"$RAYLIB_DIR/include" -c c/view.c -o build/view.o
libs=(-L"$RAYLIB_DIR/lib" -Wl,-rpath,"$RAYLIB_DIR/lib" -lraylib -lm -lpthread -ldl)
cc -shared build/rts.o build/view.o "${libs[@]}" -o build/librts.so
cc "${flags[@]}" c/main.c build/rts.o build/view.o "${libs[@]}" -o build/rts-c
c++ -std=c++17 -O2 -Wall -Wextra -Werror cpp/main.cpp build/rts.o build/view.o "${libs[@]}" -o build/rts-cpp
printf 'Built C, C++, and shared Python/Lua native library.\n'
