# Research before implementation

The following upstream pages/files were fetched and read before implementing the
prototype. These are architectural references; no upstream engine implementation
was copied. Live upstream branches can change. raylib is pinned to 5.5 in this kit.

| Source | What it establishes | Decision here |
| --- | --- | --- |
| [raylib README](https://github.com/raysan5/raylib/blob/master/README.md), [official site](https://www.raylib.com/) | Small C graphics library with language bindings and examples | Built-in text rendering, input polling, a separate simulation clock |
| [OpenRA README](https://github.com/OpenRA/OpenRA/blob/bleed/README.md) | A real RTS engine supports multiple games/mods and separates engine from content | Small rule layer independent of graphics and transport |
| [OpenRA OrderManager](https://github.com/OpenRA/OpenRA/blob/bleed/OpenRA.Game/Network/OrderManager.cs) | Per-client order queues, net frames, synchronization hashes and stalled ticks are explicit concerns | Compare deterministic lockstep with simpler server snapshots; use the latter for cross-language clients |
| [ENet features/design](https://github.com/lsalzman/enet/blob/master/docs/design.dox) | UDP needs connection handling, sequencing, reliability, fragmentation and bandwidth management | Do not invent raw UDP reliability for a learning project; document ENet as an upgrade path |
| [Godot high-level multiplayer](https://github.com/godotengine/godot-docs/blob/master/tutorials/networking/high_level_multiplayer.rst) | TCP/UDP tradeoffs, authority, peers and ENet-based high-level multiplayer | Godot HTTP client speaks our shared protocol; Godot RPC is not interchangeable with it |
| [Grid pathfinding example](https://github.com/mikolalysenko/l1-path-finder/blob/master/README.md) | Grid representation, obstacles and path queries belong in a separate navigation layer | Transparent four-neighbor BFS for a tiny map; cache paths or adopt A* at larger scale |

## What makes an RTS

An RTS lets multiple sides issue strategic orders while the world advances
continuously. The main systems form a loop:

- **Information:** show terrain, ownership, health and economy. Eventually add fog,
  scouting, visibility and accessible status panels.
- **Orders:** select entities, choose destinations/targets, validate actions, and
  preserve a clear separation between player intent and world state.
- **Economy:** workers convert a limited resource into credits. Credits pay for
  production, and population limits prevent unbounded growth.
- **Production:** headquarters create workers and soldiers. Later add build queues,
  construction, prerequisites and tech upgrades.
- **Navigation:** translate a destination into legal steps. Large armies also need
  local collision avoidance, formations, path caches and spatial indexing.
- **Combat:** acquire targets, apply cooldowns, resolve damage, remove dead entities
  and decide victory. Different weapons add range, projectiles and armor rules.
- **Opposition:** AI perceives the world and submits the same commands as humans.
- **Time:** fixed simulation ticks separate rules from variable rendering speed.
- **Multiplayer:** agree who owns truth, how orders arrive and how clients recover
  after packet loss, delay or disconnects.

This project implements a deliberately small slice of each required system. It
omits base placement, unit queues and fog so the full code remains readable.

## Architecture choices and tradeoffs

A deterministic lockstep RTS exchanges orders, waits for all participants, then
simulates the same tick on each machine. Bandwidth stays small, but identical
initial state, random streams, iteration order, math and game versions are
mandatory. A state hash detects divergence but does not repair it automatically.
Mixing C, Lua, JavaScript and GDScript implementations increases this burden.

An authoritative snapshot server accepts commands, validates them, simulates the
world, and sends state. Clients render that state; they cannot award themselves
credits or teleport units by sending a forged snapshot. More bandwidth is used,
but two players and at most 120 units are small enough for full JSON snapshots.
This project's LAN mode uses that design. It is an original small implementation,
not a claim to reproduce OpenRA's production architecture.

HTTP over TCP is easy to inspect and available in browsers, Python and Godot.
Ten polls per second are sufficient for a tile-based educational game. HTTP/TCP
has overhead and head-of-line blocking; it is not a universal recommendation for
large competitive RTS games. For those, profile before adopting persistent
WebSockets, unreliable snapshots over ENet or a carefully specified lockstep
transport. See NETWORKING.md for migration steps.
