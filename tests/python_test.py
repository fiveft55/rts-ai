"""Test the Python ABI against the real native library and LAN command grammar."""
import ctypes as C
import importlib.util
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def load(name, path):
    """Import a repository module without requiring an installed package."""
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module

offline = load('offline', 'python/offline.py')
lan = load('lan', 'python/lan_client.py')

class PythonTests(unittest.TestCase):
    """Verify meaningful state changes through the foreign-function boundary."""
    def test_native_abi(self):
        lib = C.CDLL(str(ROOT / 'build/librts.so'))
        lib.rts_init.argtypes = [C.POINTER(offline.Game)]
        lib.rts_tick.argtypes = [C.POINTER(offline.Game)]
        lib.rts_order.argtypes = [C.POINTER(offline.Game)] + [C.c_int] * 5
        game = offline.Game(); lib.rts_init(C.byref(game))
        self.assertEqual(game.count, 6)
        self.assertEqual(game.units[3].owner, 1)
        self.assertEqual(lib.rts_order(C.byref(game), 1, 0, 7, 7, 1), 1)
        for _ in range(60): lib.rts_tick(C.byref(game))
        self.assertGreater(game.credits[0], 100)

    def test_protocol_grammar(self):
        self.assertEqual(lan.parse_order('move 2 7 7')['ids'], [2])
        self.assertEqual(lan.parse_order('train worker')['kind'], 'worker')
        with self.assertRaises(ValueError): lan.parse_order('teleport 2 7 7')

if __name__ == '__main__': unittest.main()
