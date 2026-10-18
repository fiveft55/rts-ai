# Code reference

All source functions have nearby comments/docstrings. This inventory explains
inputs, state effects and reuse boundaries; tests show executable examples. Inline
callbacks are described with the module that owns them. No minified source or
external runtime dependencies are committed.

## JavaScript

### `core.mjs` — pure shared rules

| Export/helper | Purpose and behavior |
| --- | --- |
| `W`, `H`, `TICK`, `CAP` | Grid dimensions, milliseconds per tick and per-side cap |
| `key(x,y)` | Stable coordinate key for walls and visited cells |
| `createGame()` | Allocate independent deterministic map, economy and entities |
| `spawn(g,p,kind,x,y)` | Internal stable-ID entity allocation and health initialization |
| `nextStep(g,u,tx,ty)` | BFS over legal cells; return one step or original position if unreachable |
| `command(g,p,c)` | Validate intent and return acceptance; training charges credits; orders modify owned units |
| `step(g)` | Advance combat, harvesting, movement and victory; no-op after game over |
| `ai(g,p=1)` | Every 20 ticks, train and submit harvest/attack intents through `command` |

### `app.mjs` — browser adapter

| Function/callback | Role |
| --- | --- |
| `$` | Lookup an element by ID |
| `post` | Send JSON, parse response and throw on HTTP rejection |
| `order` | Apply offline order or serialize LAN envelopes with sequence acknowledgements |
| `leave` | Clear local session and request remote slot release |
| offline/leave buttons | Leave remote session, reset world, selection, ownership and errors |
| join button | Request slot, record token/player and initialize command sequence |
| worker/soldier buttons | Emit validated purchase intent |
| army button | Replace selection with owned soldier IDs |
| harvest button | Assign each worker to its closest nonempty deposit |
| `oncontextmenu` | Suppress browser context menu over battlefield |
| `onpointerdown` | Convert scaled screen coordinates, select units or issue contextual order |
| `onkeydown` | Map W/S/A to the same buttons; ignore room-code typing |
| interval callback | Step offline AI/world or fetch a LAN snapshot without overlapping polls |
| `draw` / inner `glyph` | Draw grid, terrain, entities, selection and status; schedule next animation frame |

### `server.mjs` — authoritative transport

`createHost({code,bots})` returns `{server,game,players}` without binding a port.
Tests can bind ephemeral ports and inspect real state. Its request handler routes
an explicit static-file allowlist or validates API requests. Inner `send` writes
JSON status responses. `timingSafeEqual` compares room-code bytes of equal length.
The listening callback owns the tick/expiry timer; the close callback releases it.
The executable entry binds HOST/PORT and handles SIGINT/SIGTERM shutdown. Clients
never get a state mutation endpoint other than validated `/command`.

## C and C++

| File / function/type | Contract |
| --- | --- |
| `rts.h: Unit` | Ten C ints: owner, kind, position, HP, destination, gather, cooldown, active |
| `rts.h: Game` | Tick, two credits, winner (-1 ongoing), used-slot count, 120 Units |
| `rts.c: spawn` | Internal allocate/reuse slot; returns failure at total capacity |
| `rts_init(Game*)` | Clear all memory and set starting state; pointer must be valid |
| `rts_train(Game*,player,kind)` | Validate owner/kind/HQ/cost/cap; charge only after successful spawn |
| `rts_order(Game*,index,player,x,y,gather)` | Bounds/ownership/mobile check; store destination intent |
| `rts_tick(Game*)` | One native tick including AI, movement, unlimited native ore, damage and victory |
| `view.c: view_open` | Initialize raylib window, target frame rate and adapter selection/timer |
| `view_should_close` | Read raylib close/Escape state |
| `view_frame(Game*)` | Poll input, accumulate fixed ticks and draw ASCII; requires open window |
| `view_close` | Release the raylib window |
| `c/main.c: main` | Own stack Game and explicit view lifecycle |
| `cpp/main.cpp: Window` | RAII constructor/destructor call open/close; copying prohibited |
| `Window::open` | Invert view close flag for readable loop condition |
| `cpp/main.cpp: main` | Value-initialize C state and run through RAII adapter |

The C pointer API assumes non-null, correctly sized storage. It is an in-process
API, not an untrusted wire protocol. Never cast arbitrary network bytes to Game.
The renderer has one static selection/timing context, so it supports one window.

## Python and Lua

| File / symbol | Contract |
| --- | --- |
| `python/offline.py: Unit`, `Game` | ctypes mirrors of the C ABI, including fixed array sizes |
| `python/offline.py: main` | Load built `.so`, declare pointer signatures, run and finally close view |
| `python/lan_client.py: post` | urllib JSON POST with three-second timeout; raises HTTP/network errors |
| `render` | Produce ANSI full-map text, economy, winner and owned IDs |
| `read_input` | Daemon input thread places commands into Queue; EOF enqueues quit |
| `parse_order` | Parse terminal grammar to JSON or raise ValueError |
| `main` | Parse CLI, join, poll, serialize command sequences and leave in finally |
| `lua/main.lua` | `ffi.cdef` describes ABI; `ffi.new` owns state; `ffi.load` loads bridge |
| Lua loop callback | Run native frames under `xpcall`; close view and rethrow ordinary Lua errors |

Python/Lua entry points keep all native game logic in C. To teach Python/Lua game
logic independently, port a single pure rule and compare it against the native
suite before replacing the bridge. Do not silently reinterpret struct layouts.

## Godot

| Function / file | Purpose |
| --- | --- |
| `project.godot` | Engine/project format, main scene, window and compatibility renderer |
| `main.tscn` | Root Node2D and main script reference |
| `_ready` | Reset, optional headless smoke branch, UI construction and HTTPRequest signal |
| `add_button` | Attach a labelled Button to a parent and connect a callable |
| `reset_game` | Allocate map/economy/unit dictionaries matching snapshot shape |
| `spawn` | Allocate stable IDs and health |
| `legal` | Test map bounds and walls |
| `next_cell` | Four-neighbor BFS returning first step |
| `apply_order` | Offline purchase/ownership validation and order assignment |
| `distance` | Manhattan distance helper |
| `tick` | Offline fixed tick, damage accumulation, harvesting and victory |
| `bot` | Periodic AI order submission |
| `issue` | Apply offline command or append to bounded LAN pending queue |
| `select_army` | Build selection from owned soldiers |
| `offline` | Refuse while request pending; otherwise leave and reset local game |
| `join_lan` | Guard against overlapping joins and request a slot |
| `send_request` | Start serialized JSON HTTP request and handle immediate API errors |
| `response` | Check result/status/data, then update token/sequence or authoritative game |
| `_process` | Fixed-tick accumulation offline or periodic serialized network requests |
| `_unhandled_input` | Emit purchase/selection/contextual orders from desktop events |
| `glyph` | Draw one ASCII character in a fixed grid cell |
| `_draw` | Render terrain, ore, owned/enemy glyphs and selection |
| `smoke_test` | Headless real rules assertions and successful process exit |
| `lan_smoke.gd: _initialize/start` | Deferred creation of real client and join |
| `lan_smoke.gd: _process` | Bounded test phases: join, buy, observe credits, leave, quit |

`apply_order` is for trusted local input, not the LAN security boundary; Node's
`command` revalidates all remote requests. Godot dictionaries are mutable shared
references; avoid copying them shallowly when you require independent worlds.

## Scripts and tests

| File | Behavior |
| --- | --- |
| `setup-native.sh`, `fetch` | Download pinned upstream raylib/LuaJIT over TLS, verify SHA-256, install outside checkout |
| `build-native.sh` | Compile C objects/shared ABI and C/C++ entries with warnings treated as errors |
| `host-lan.sh` / `.ps1` | Require ROOM_CODE, explicitly bind LAN and run host, forwarding CLI arguments |
| `check.sh` | Run rules/network/native/FFI/terminal/Godot checks and enforce per-file size bound; report optional missing runtimes |
| `core.test.mjs` | Fresh state, costs/cap, malicious intents, pathfinding, harvesting, simultaneous defeat and AI reproducibility |
| `network.test.mjs` | Real HTTP lifecycle, validation, sequencing, rate/body/origin limits and reserved bot slot |
| `native.c: main` | Sanitizer-enabled headless C ownership, movement, economy and victory assertions |
| `python_test.py: load` | Import source modules without package installation |
| `PythonTests.test_native_abi` | Mutate a real C Game through ctypes and verify economy |
| `PythonTests.test_protocol_grammar` | Accept documented commands and reject malformed syntax |
| `lua_smoke.lua` | Assert actual C ABI layout and gathering through LuaJIT FFI |
| `browser_smoke.py: main` | Own host/browser lifecycle; test offline income and two browser LAN sessions; capture ignored screenshot |
| `terminal_smoke.py: main` | Drive terminal process stdin, then inspect host state and released slot |

Test callback functions are assertions and cleanup handlers, not reusable game
rules. Browser screenshots and compiled artifacts live only in ignored `build/`.

## HTML / Live Server edition

`html/index.html` defines the Canvas, HUD and accessible controls. `style.css`
contains responsive CSS without external fonts/assets. `game.js` imports local `core.js`, generated from `javascript/core.mjs` by
`scripts/sync-html.mjs`. It performs no API requests or external resource loads.

| Function/callback | Contract |
| --- | --- |
| `$` | Look up a page element by ID |
| `notify` | Set time-bounded status feedback using safe text output |
| `issue` | Submit validated player-0 intent and report rejection |
| `recruit` | Emit a purchase and show the recruited kind |
| `selectArmy` | Replace selection with all owned living soldier IDs |
| `harvest` | Assign every worker its nearest nonempty ore deposit |
| `togglePause` | Toggle simulation time and update accessible button state |
| `restart` | Reset game, selection, pause, notices and accumulator without a new loop |
| `position` | Convert CSS-scaled pointer coordinates into continuous grid coordinates |
| `finishSelection` | Apply click/drag rectangle selection; preserve existing IDs with Shift |
| `contextualOrder` | Emit gather on ore or attack-move to another tile |
| Pointer callbacks | Capture drag, update rectangle, finish/cancel selection and focus map |
| Keyboard callback | W/S/A/G/Space actions; preserve standard focused-button behavior |
| Visibility callback | Clear elapsed time when tab visibility changes |
| `glyph` | Draw local monospace text at a fixed cell center |
| `render` | Draw grid, ore, walls, entities, health bars, selection and drag feedback |
| `updateHUD` | Remove dead selected IDs, update changed text and enforce purchase button availability |
| `frame` | Own one animation loop and bounded fixed-tick accumulator; stop time while paused/hidden |
| `tests/html_smoke.py: main` | Verify actual gameplay through a plain Python static server, without Node |
| `tests/html_smoke.py: point` | Convert test grid positions to scaled pointer coordinates |

The committed `html/core.js` copy makes the folder independently servable.
`npm run sync:html` refreshes it; the portability test rejects stale copies.
See `html/README.md` for static serving and reuse examples. The HTML
edition is offline; the existing authoritative Node host remains the LAN option.
