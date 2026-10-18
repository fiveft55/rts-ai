#!/usr/bin/env bash
# Core and native checks; installed Godot/LuaJIT checks are required when available.
set -euo pipefail
cd "$(dirname "$0")/.."
npm test
bash scripts/build-native.sh
cc -std=c11 -Wall -Wextra -Werror -Wno-misleading-indentation -fsanitize=address,undefined tests/native.c c/rts.c -o build/native-test
./build/native-test
python3 tests/python_test.py
python3 tests/terminal_smoke.py
lua_runner="${LUAJIT_BIN:-/workspace/deps/luajit/bin/luajit}"
if [[ -x "$lua_runner" ]]; then "$lua_runner" tests/lua_smoke.lua; else echo 'SKIPPED Lua: set LUAJIT_BIN to an installed LuaJIT.'; fi
if command -v godot >/dev/null; then
 mkdir -p /tmp/glyph-data /tmp/glyph-cache
 XDG_DATA_HOME=/tmp/glyph-data XDG_CACHE_HOME=/tmp/glyph-cache godot --headless --path godot -- --smoke
else echo 'SKIPPED Godot: install Godot 4.3+.'; fi
python3 - <<'CODE'
from pathlib import Path
import subprocess
files=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z']).decode().split('\0')
files=[Path(f) for f in files if f and Path(f).is_file()]
big=[str(p) for p in files if p.stat().st_size>=1_000_000]
assert not big, big
print(f'Size check: {len(files)} source/config/documentation files all below 1 MB')
CODE
