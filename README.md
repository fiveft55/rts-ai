# Glyph Command — a small ASCII RTS workshop

A playable foundation for building your own real-time strategy game. Gather ore,
recruit workers and soldiers, move squads, and destroy the enemy headquarters.
Every source file is below 1 MB; visuals use built-in fonts and ASCII glyphs.
There are no asset downloads or JavaScript package dependencies.

## Play now: browser offline

Requires Node.js 18+ and a modern desktop browser:

```sh
npm start
```

Open `http://127.0.0.1:8080` **on your own machine** and choose **Offline vs AI**.
The local server only serves files in this mode; simulation runs in the browser.
No internet connection is needed after checkout. ES modules require this local
server rather than opening `index.html` as a file. A cloud onboarding session
validates internally and does not provide a public game preview.

Select with left click (Shift adds units); right click to move/attack or gather
when clicking `$`. Press **W** to buy a worker (30), **S** for a soldier (40),
**A** to select soldiers. The browser also has a one-click worker harvest button.
Workers must receive a gathering order before your income grows. Blue is player 1;
orange is player 2. `H` HQ, `w` worker, `s` soldier, `$` ore, `#` wall.
Units automatically attack nearby enemies. Attack orders move toward a tile;
they do not track a moving target. Destroy the enemy `H` to win.

## HTML edition with VS Code Live Server

Open this repository root in VS Code, right-click `html/index.html`, and choose
**Open with Live Server**. This Canvas edition runs offline versus AI using only
static files. It includes group drag selection, health bars, pause and restart;
no Node backend or npm install is required. Keep the repository root as the
server root so the shared `javascript/core.mjs` import resolves.
See [HTML setup and controls](html/README.md).

Alternatively, from the repository root, run
`python3 -m http.server 5500 --bind 127.0.0.1` and open `/html/index.html` on it.
The static edition has no LAN backend; use the host instructions below for LAN.

## Separate language directories

| Directory | Role | Offline | Shared LAN host |
| --- | --- | --- | --- |
| `html/` | Static HTML/Canvas page for Live Server | AI opponent | Use the Node edition for LAN |
| `javascript/` | Complete browser game, pure rules, Node authoritative host | AI opponent | Two browser players |
| `c/` | Portable native rules and raylib 5.5 view | AI opponent | No native network transport |
| `cpp/` | C++17 RAII entry using the C rules/view | Same native game | No native network transport |
| `python/` | ctypes native entry and independent terminal LAN client | Same native game | Terminal client |
| `lua/` | LuaJIT FFI native entry | Same native game | No native network transport |
| `godot/` | Godot 4 GDScript implementation and HTTP client | AI opponent | Cross-play with browser/Python |
| `docs/` | Research, architecture, networking and code reuse guides | — | — |

C/C++/Python/Lua deliberately share one C engine through its ABI rather than
maintaining four copies of the same rules. Their files and entry points remain
separate. Godot uses its own renderer and offline rules. Browser JavaScript uses
Canvas because browsers cannot directly load the native raylib library.

The native teaching variant has open terrain and two unlimited ore deposits.
Browser/Godot have walls, BFS navigation and four finite deposits. **Independent
offline implementations are not deterministic lockstep peers.** LAN clients all
use Node's snapshots, so browser/Godot/Python see the same authoritative world.

## LAN: two players on the same trusted network

On Linux/macOS, from the checkout:

```sh
ROOM_CODE='choose-a-private-code' bash scripts/host-lan.sh
```

On Windows PowerShell:

```powershell
$env:ROOM_CODE = 'choose-a-private-code'
.\scripts\host-lan.ps1
```

Both players open `http://HOST_LAN_IP:8080`, enter the same room code and click
**Join LAN match**. The first joins player 1; the second joins player 2. The match
pauses until both slots are occupied. Add `--bot` to the host command for one
human versus a server-side AI. Restart the host to start a new LAN match.

Python terminal: `python3 python/lan_client.py --host http://HOST_LAN_IP:8080 --code YOUR_CODE`.
Godot: open `godot/project.godot`, run, enter that host URL and room code, then Join.
Allow inbound TCP 8080 on the host's **private network** firewall if necessary.
No port forwarding, internet account or automatic discovery is needed.
See [the complete networking guide](docs/NETWORKING.md) for protocol, limits,
disconnects, security, troubleshooting and an ENet migration design.

## Native raylib and Godot

On Linux x86-64 with GCC/G++, make, curl and tar:

```sh
bash scripts/setup-native.sh
bash scripts/build-native.sh
./build/rts-c
./build/rts-cpp
python3 python/offline.py
/workspace/deps/luajit/bin/luajit lua/main.lua
```

For a local computer, set `DEPS_ROOT="$HOME/.local/share/glyph-deps"` when running
setup, and `RAYLIB_DIR="$HOME/.local/share/glyph-deps/raylib-5.5_linux_amd64"`
when building. Use that dependency directory's `luajit/bin/luajit` executable.
Lua requires **LuaJIT**, not ordinary Lua. Native windows require a graphical
desktop/OpenGL 3.3; the rule tests run without a display. Native controls match
the browser; **R** resets. Native build scripts currently target Linux x86-64.
Use raylib's platform instructions to port the build to macOS/Windows.

Godot 4.3+ (validated with 4.6.3): `godot --path godot`. No plugins needed.
For restricted cloud home directories, use writable XDG directories as shown in
[the development guide](docs/DEVELOPMENT.md).

## Learn, reuse and verify

Read in order:

1. [Research and genre design](docs/RESEARCH.md): upstream sources and design decisions.
2. [Architecture and rules](docs/ARCHITECTURE.md): simulation, movement, economy and AI.
3. [Code reference](docs/CODE_REFERENCE.md): every source module/function and its role.
4. [Build your own RTS](docs/REUSE_GUIDE.md): incremental exercises and extension points.
5. [Networking](docs/NETWORKING.md): LAN operations and multiplayer architecture.
6. [Development and validation](docs/DEVELOPMENT.md): setup, tests and current limitations.

```sh
npm test
bash scripts/check.sh
```

This is a small playable prototype and learning kit. It has no fog of war,
construction placement, formations, tech tree, save/load, matchmaking or replay
persistence yet. The guides explain where those systems belong. LAN is for a
trusted network, not a public internet competitive service. Test results and
remaining platform limitations are recorded in `docs/DEVELOPMENT.md`.
