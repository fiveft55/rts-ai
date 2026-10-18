"""Python native entry: ctypes owns a Game and calls the shared C/raylib bridge."""
import ctypes as C
from pathlib import Path

class Unit(C.Structure):
    """Exact c/rts.h Unit ABI; field order and C int widths must match."""
    _fields_ = [(name, C.c_int) for name in
                'owner kind x y hp tx ty gather cool active'.split()]

class Game(C.Structure):
    """Fixed-capacity native state, including economy and victory status."""
    _fields_ = [('tick', C.c_int), ('credits', C.c_int * 2),
                ('winner', C.c_int), ('count', C.c_int), ('units', Unit * 120)]

def main():
    """Load the built library, declare pointer arguments and run the view loop."""
    lib = C.CDLL(str(Path(__file__).resolve().parents[1] / 'build/librts.so'))
    lib.rts_init.argtypes = [C.POINTER(Game)]
    lib.view_frame.argtypes = [C.POINTER(Game)]
    lib.view_should_close.restype = C.c_int
    game = Game()
    lib.rts_init(C.byref(game))
    lib.view_open()
    try:
        while not lib.view_should_close():
            lib.view_frame(C.byref(game))
    finally:
        lib.view_close()

if __name__ == '__main__':
    main()
