# Development, setup and verification

## Toolchains

Browser/host: Node 18+ (tested with 24.19), no `npm install` required.
Native: GCC/G++, make, curl, tar, Linux x86-64, raylib 5.5; LuaJIT 2.1 for Lua;
Python 3.10+ standard library. Godot 4.3+ (tested 4.6.3). Native graphics require
OpenGL 3.3 and an X11/Wayland desktop supported by raylib.

`scripts/setup-native.sh` installs pinned dependencies in `/workspace/deps`, outside
Git. `DEPS_ROOT` overrides this destination. LuaJIT source is pinned to commit
`dd3b24369ddfaa83c78cd6fdd91d157c8968ec8d`. Raylib/LuaJIT archives have committed
SHA-256 expectations. These hashes pin the TLS-downloaded upstream artifacts;
they are not a claim of an independent upstream signature. Never bypass checksum
or TLS failures; investigate the source and artifact instead.

For native builds set `RAYLIB_DIR` if using another location. The executable and
shared library record that absolute raylib library path in their runtime search
path. Rebuild if the dependency directory moves. Python/Lua load the generated
`build/librts.so`; no Python raylib package or Lua module download is required.

## Common checks

```sh
bash scripts/setup-native.sh
bash scripts/check.sh
python3 tests/browser_smoke.py
```

The browser test additionally needs Python Playwright and a Chromium executable.
Install Playwright in your own virtualenv if missing; the script currently uses
`/usr/bin/chromium`. Change that test-only executable selector for other systems.
It launches a temporary host on a free loopback port and closes owned processes.
The screenshot in `build/browser.png` is a local test artifact, not a published
preview. No test downloads packages at runtime.

Godot in a cloud machine with an unwritable home:

```sh
mkdir -p /tmp/glyph-data /tmp/glyph-cache
XDG_DATA_HOME=/tmp/glyph-data XDG_CACHE_HOME=/tmp/glyph-cache godot --headless --path godot -- --smoke
```

The same XDG variables can be used when starting the editor. They change only
cache/user-data locations; the real HOME is preserved. A first run without these
overrides failed because Godot could not create its user-data directory. The
writable XDG configuration resolved it, and the game smoke check then passed.

LAN Godot integration: start `node javascript/server.mjs --bot` on default port
8080 in another terminal, then:

```sh
XDG_DATA_HOME=/tmp/glyph-data XDG_CACHE_HOME=/tmp/glyph-cache godot --headless --path godot --script res://lan_smoke.gd
```

Use a disposable host: this test recruits a soldier and leaves that match. A
10-second deadline fails the process if the integration stalls.

## Validation performed in the cloud environment

- 12 Node tests passed (10 simulation tests, 2 real HTTP integration tests).
- C and C++ entries and shared library compiled with warnings treated as errors.
- Native rule test passed under AddressSanitizer and UndefinedBehaviorSanitizer.
- 2 Python tests passed, including actual C ABI mutations and command parsing.
- LuaJIT executed native ownership/layout, movement and harvesting assertions.
- Godot headless smoke passed movement, economy, invalid purchases/orders and victory.
- Godot joined a live bot host, recruited through HTTP, observed authoritative
  credit changes and left successfully.
- Chromium exercised offline recruitment/harvesting and two separate browser
  sessions joining the same LAN game, issuing orders and leaving; no page errors.
- Python terminal joined a live host, recruited, quit and released its slot.
- All tracked/new source, configuration and documentation files were checked below
  1,000,000 bytes each. Dependency archives/build outputs are excluded from Git.

Native window interaction has not been manually verified on a physical graphical
desktop in this headless environment. Native rules/ABI and builds were verified;
this is distinct from a raylib GPU/window smoke test. Godot logic and HTTP were
verified headless; its desktop input/rendering have not been manually playtested.
Loopback tests do not establish that two physical computers can connect through
your firewall or Wi-Fi. Run the documented two-device LAN check locally.
Windows host script is provided but has not been run in PowerShell here. Native
build scripts support Linux x86-64; other native OS builds remain a porting task.

## Troubleshooting

- `lib raylib not found`: re-run setup/build, verify RAYLIB_DIR and keep the
  extracted library directory in place. Do not copy libraries into system paths.
- `ffi` unavailable in Lua: use LuaJIT, not stock Lua.
- Native GLFW display error: run on a graphical desktop; use headless rule tests
  in CI rather than treating missing display access as a gameplay failure.
- Browser module import errors: serve through `npm start`, not `file://`.
- Port conflict: set PORT for host; update all client URLs consistently.
- A skipped Lua/Godot check in `check.sh` means the runtime was absent, not that
  the check passed. Install it and rerun before claiming that capability.

## Repository hygiene

Keep generated binaries, caches and downloaded dependencies out of commits.
There is no submodule, third-party vendored code, package lock or package install
step. Scripts do not modify dependency declarations or source during setup.
Source edits here implement the requested game as a coding task; they are not
onboarding workarounds. Future cloud tasks should use the existing checkout;
the cloud task is already isolated and does not need a separate Git worktree.

## Static HTML/Canvas validation

`python3 tests/html_smoke.py` starts only a Python static file server and Chromium,
with no Node backend. It verifies module loading, real recruitment/credits,
drag-selection, contextual orders, worker income, pause, reset, keyboard controls
and a narrow responsive layout. It rejects external resource requests and API
writes. The runtime requires a modern browser with ES modules and Canvas; VS Code
Live Server may serve either the repository or the self-contained `html/` folder
(see `html/README.md`). The default browser check serves only `html/`; add
`--repo-root` to verify full-repository serving. Run `npm run sync:html` whenever
`javascript/core.mjs` changes; a Node test checks the committed copy is current. Screenshots
are ignored artifacts in `build/html-desktop.png` and `build/html-mobile.png`.
