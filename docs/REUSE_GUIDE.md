# Build your own RTS from these files

## Start with the smallest complete loop

Read `javascript/core.mjs` first. Create a fresh state, submit one order, tick the
simulation, and inspect the changed coordinates. `tests/core.test.mjs` demonstrates
this without opening a window. Keep rules free of DOM, graphics and networking.
Then read `app.mjs`: mouse/keys turn into commands; rendering reads state.
Finally read `server.mjs`: HTTP only wraps the same rule functions.

Copy `core.mjs` and its tests into an experiment to learn in isolation. If you
change a rule, add a test that describes the intended player-visible behavior.
Do not copy the view and then bury economy or combat inside drawing callbacks.

## Learn each language's role

- **JavaScript:** ES modules let one rules file run in browser and Node. `Set`
  stores selected IDs; `Map` accumulates damage and paths; asynchronous requests
  serialize commands. DOM code belongs in `app.mjs`, never in `core.mjs`.
- **C:** `rts.h` is the public state/API contract, `rts.c` the pure rules,
  `view.c` the raylib adapter, and `main.c` the loop. Fixed arrays bound memory.
  Compile tests with address/undefined-behavior sanitizers when available.
- **C++:** `Window` in `cpp/main.cpp` demonstrates RAII and an `extern "C"`
  boundary. Extend with a command class or your own renderer while reusing the
  engine. A deleted copy constructor prevents double-closing the window.
- **Python:** `offline.py` mirrors C layouts with ctypes. Every field order and
  type must match the header. `lan_client.py` is a separate pure-standard-library
  client showing JSON, terminal input threading and server authority.
- **Lua:** LuaJIT FFI loads the same library. `Game[1]` owns memory that remains
  alive through the loop; `xpcall` ensures ordinary script errors release the
  window. Keep C declarations synchronized when editing the ABI.
- **Godot:** scene setup is in `main.tscn`; project settings are separate from
  `main.gd`. `_process` accumulates time, `_unhandled_input` emits intent, and
  `_draw` reads the current world. `HTTPRequest` speaks the same JSON LAN API.

## Extension exercises in a useful order

1. **Unit variety:** add an archer kind, cost, health, range and glyph in rules,
   renderer and purchase UI. Test insufficient funds and range boundaries.
2. **Production queue:** deduct costs when enqueuing, tick a build timer, spawn
   only on completion. Specify refunds, destroyed HQ behavior and population
   reservation. Never let the client decide completion time in LAN mode.
3. **Carry-and-return economy:** give workers cargo and a state machine:
   walking-to-ore → harvesting → returning-to-HQ → depositing. Test depleted ore
   and destroyed depots. Keep direct-credit harvesting until this is complete.
4. **Buildings:** introduce validated placement commands with cost, bounds,
   occupancy and ownership checks. Increment a terrain revision so path caches
   invalidate after walls/buildings change. Do not allow building over an HQ.
5. **Navigation:** add a shared A* module; compare its path length with BFS on
   fixed maps. Then cache paths and add spatial buckets for target acquisition.
6. **Fog of war:** compute visibility on the host. Filter snapshots by player;
   hiding glyphs on the client alone leaks the entire hidden world to cheaters.
7. **Save/replay:** add versioned serializable game state and record validated
   command envelopes with the tick applied. Verify replay hashes. Keep tokens
   and room codes out of saved game state.
8. **AI strategy:** add an economy target, scouting, attack waves and retreat
   logic. The planner should submit ordinary validated commands, not edit credits.
9. **Multiplayer recovery:** retain acknowledged command IDs and reply history,
   reconnect identities and snapshot versions. Add integration tests before
   replacing transport. See NETWORKING.md.

## Adding a renderer or client

A renderer needs only map size, walls, ore and entities. A command producer needs
selected owned IDs, a legal intent and the current session sequence. For LAN,
start with `/join`, then authenticated `/state`, then `/command`. Trust the host's
returned credits and positions. Never send a full game object as an update.

For a native LAN client, add JSON parsing and HTTP outside `rts.c`; render host
snapshots rather than calling `rts_tick` locally. A compatibility layer must map
stable server IDs to native slots and handle removals. Do not reuse C slot indices
as server IDs. This transport is intentionally not implemented in the native demo.

## Keep files and assets small

Split by responsibility rather than arbitrary line counts. Source and docs here
are individually checked below 1,000,000 bytes. Keep build products, downloaded
libraries, caches and screenshots ignored; they can exceed 1 MB. Built-in fonts
avoid binary assets entirely. If a new source module grows too large, separate
rules, UI, transport and data; do not minify learning code to hide its size.
