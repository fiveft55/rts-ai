# Multiplayer architecture and LAN operations

## Host and join

One machine hosts `javascript/server.mjs`. It serves the browser files and owns
one match. Start with a private room code:

```sh
ROOM_CODE='your-private-code' bash scripts/host-lan.sh
# For one human versus the server AI:
ROOM_CODE='your-private-code' bash scripts/host-lan.sh --bot
```

The script binds `0.0.0.0`, TCP 8080. Override `HOST`/`PORT` if necessary. Plain
`npm start` binds loopback and is intended for local offline play. Windows uses
`scripts/host-lan.ps1` with the same environment variables.

Find the host's private Wi-Fi/Ethernet IPv4 in the OS network settings (`ip -4
addr` on Linux, `ipconfig` on Windows). Both clients use the same URL, such as
`http://192.168.1.20:8080`, and room code. The host player also opens that URL or
loopback. Do not type `0.0.0.0` as the destination and do not use a guest Wi-Fi
network that isolates clients. Direct IP entry is deliberate; automatic discovery
is not implemented. No router port forwarding is required for same-subnet LAN.

Browser: Join LAN. Godot: enter host URL and code, Join LAN. Terminal:

```sh
python3 python/lan_client.py --host http://192.168.1.20:8080 --code your-private-code
# Terminal orders: train soldier / gather 2 7 7 / attack 3 36 12 / quit
```

## Authority, time and slots

The host advances at 10 ticks/s. A normal match pauses until both player slots
are occupied. `--bot` reserves slot 1 for AI and ticks even without a human.
The first authenticated join gets player 0; the next gets player 1. Clients never
choose their player number or submit replacement world state.

A session expires after 15 seconds without authenticated activity. Explicit leave
releases it immediately; browser tab closure may take 15 seconds. A replacement
player using the room code can take the vacant army and continue. There is no
identity-based reconnect, spectators or host migration. If a player disconnects,
the host pauses once the session expires, not immediately when their tab closes.
On match completion, stop and restart the host for a fresh match. Offline reset
does not reset the host. All state is in RAM; host shutdown ends the match.

## Protocol v1 (current code has no on-wire version negotiation)

Only the four static browser files are served. API endpoints use POST JSON.
Tokens are random 192-bit bearer capabilities, returned on join and sent in bodies.
They are never placed in URL query strings. Keep them out of logs.

| Endpoint | Request fields | Successful reply |
| --- | --- | --- |
| `/join` | `code` | `token`, `player` |
| `/state` | `token` | `game`, `player`, `seq` |
| `/command` | `token`, `seq`, `command` | `ok`, `seq` |
| `/leave` | `token` | `ok: true` |

The `game` schema is the object created by `createGame()` in `core.mjs`.
`winner` is null until completion, then 0/1 for a side or 2 for a draw. Unit
`p` is ownership, `kind` is `hq`/`worker`/`soldier`, and `id` is stable.

Command payloads:

```json
{"type":"train","kind":"soldier"}
{"type":"move","ids":[2,3],"x":10,"y":12}
{"type":"gather","ids":[2],"x":7,"y":7}
{"type":"attack","ids":[3],"x":36,"y":12}
```

`attack` is a destination order plus automatic nearby combat, not a target-ID
tracking command. `move` also allows automatic attacks. Gathering requires a
worker and a live deposit. Orders cannot move HQs or another side's units.

Sequence numbers start at 1 and must equal the session's last sequence + 1.
An accepted envelope consumes its sequence even if the game rejects the action
(`ok:false`, e.g. insufficient funds). Replays and gaps return 409 with the
current `seq`. Browser commands run through a Promise queue; Godot has one request
in flight; the terminal client serializes its requests. Clients must not blindly
retry an uncertain command with a new sequence, which could duplicate a purchase.
Current clients ask the user to rejoin on transport/sequence errors rather than
attempting automatic recovery. State replies include the current sequence for a
future recovery implementation. There is no command history for robust retries.

## Limits and failure handling

- 8,192-byte request body; 5-second request/header timeouts; 32 TCP connections.
- 35 authenticated API requests per session per second; clients normally poll at
  10 Hz (browser/Godot) or 2 Hz (terminal). Excess returns 429.
- 60 entities per side; at most 60 IDs in an order; integer bounded coordinates.
- 400 malformed JSON; 401 invalid token; 403 incorrect room code/origin;
  404 unknown route; 409 full room/sequence conflict; 413 oversized body.
- Browser cross-origin writes are rejected by Origin checking. There is no
  permissive CORS header. Non-browser clients may omit Origin.
- Random tokens and ownership checks prevent a normal client from commanding
  the other side. They do not defend against a compromised host or network.

Room-code failures are not globally rate limited; join attempts and total traffic
are not hardened against an internet-scale attacker. TCP connection limits are
resource bounds, not a full denial-of-service defense. The code is intentionally
for trusted LANs. HTTP exposes room codes and tokens to on-path observers. For
internet deployment, add HTTPS/WSS, identity, room isolation, strict Host/origin
allowlists, global/IP quotas, command queues, telemetry and recovery first.
Do not expose this development host through router forwarding as-is.

## Why snapshots rather than lockstep

Clients cannot be assumed to execute equivalent C/JS/Lua/GDScript math and entity
ordering. Full authoritative snapshots avoid desynchronization at this scale.
Approximate bandwidth is `snapshot bytes × polls/sec × clients`; measure JSON
sizes with representative populations. There is no interpolation or delta
compression, so movement is visibly tile based. The server timer is event-loop
based; under load the game slows rather than performing a burst of missed ticks.

A larger design should queue commands and drain a bounded number at tick
boundaries, tag snapshots with a protocol/rules version and tick, retain bounded
acknowledgement history, and interpolate visual positions between snapshots.
Add spatial targeting and cached navigation before increasing populations.

## Roadmap: persistent transport and ENet

1. Keep `command()` as the authority boundary and `step()` as the only tick owner.
2. Add protocol/version negotiation, match IDs and a per-tick command budget.
3. For browsers, move HTTP polling to WebSockets with backpressure and bounded
   outbound queues. Reconnect using last ack and a complete snapshot.
4. For native clients, use ENet for reliable ordered join/orders and a separate
   unreliable sequenced snapshot channel; discard snapshots older than the last
   applied tick. Reliable delivery alone does not prevent duplicate game actions.
5. Retain periodic full snapshots while adding delta compression; a delta needs
   a known base and a repair path. Do not retransmit stale position snapshots.
6. Add host verification/secure transport and authenticated reconnect identities.
7. Test packet loss, jitter, disconnect during recruitment, simultaneous orders,
   slow consumers and old client versions. Compare state hashes in replay tests.

Godot's high-level ENet/RPC protocol is not a drop-in client for an arbitrary
ENet server. Either use Godot on both ends with matching RPCs or implement a
specified lower-level protocol on both ends. The current Godot HTTP client
avoids that compatibility problem.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Host unreachable | Server running; correct private IP/port; bind HOST=0.0.0.0; OS private-network TCP rule; no AP/client isolation |
| Browser works on host only | Loopback binding, firewall or guest Wi-Fi isolation |
| Wrong code | Exact ROOM_CODE, including case; don't send credentials in support logs |
| Full room | Old tabs still connected; Leave or wait 15 seconds; bot reserves one slot |
| Game not advancing | Normal human match needs two active sessions; check heartbeat and console |
| Sequence conflict | Return offline then rejoin; do not repeatedly resend uncertain purchases |
| Godot joins but cannot move | Use shared host URL; correct player owns selected units; don't use Godot ENet RPC against HTTP |
| Cloud machine cannot reach your home LAN | It is a separate network; run the host locally, or configure an authorized VPN through environment settings |

Loopback integration tests prove protocol behavior on one machine. They do not
prove physical Wi-Fi reachability, your OS firewall settings or router behavior;
perform the two-device test on the intended LAN before a play session.
