# HTML / Canvas edition

A static-server edition of Glyph Command: offline AI, ASCII Canvas graphics,
recruitment, finite ore, navigation, combat, group selection, health bars, pause
and restart. No Node game server, npm packages, CDN, accounts or API calls needed.
It uses the same rules module as the multiplayer version.

## VS Code Live Server

1. Check out branch `feat/glyph-command-rts` and open the **repository root** in
   VS Code (the folder containing `html/` and `javascript/`).
2. Install the VS Code **Live Server** extension if needed.
3. Right-click `html/index.html` and choose **Open with Live Server**.
4. Play. Code changes reload the page and start a fresh match.

Keep the repository root as Live Server's serving root. The import
`../javascript/core.mjs` intentionally reuses the shared simulation. Serving only
`html/` as the document root prevents that import from resolving. Do not copy
just this folder or open the HTML through `file://`; serve the whole checkout.

Any standard static server works. For example, from the repository root:

```sh
python3 -m http.server 5500 --bind 127.0.0.1
```

Then open `/html/index.html` on that server in your local browser. This server is
only serving files; all gameplay runs locally in the browser. Internet access is
not needed once the repository and chosen server/editor are installed.

## Controls and rules

- **Left click** selects one blue mobile unit. **Drag** selects a group.
- **Shift** adds to the existing selection. **A** selects all your soldiers.
- **Right click** issues move/attack; clicking `$` issues a gather order.
- **W** buys a worker (30 credits); **S** buys a soldier (40 credits).
- **G** sends all workers to their nearest nonempty ore deposit.
- **Space** or the Pause button pauses time. You may still plan orders and buy
  units while paused. Background tabs stop advancing simulation time.
- **New game** resets the match, selection, economy and pause state.

Soldiers automatically attack nearby enemies. Destroy orange `H` to win. The
sidebar explains the ASCII glyphs, and the dashboard tracks economy, population,
HQ health and mission time. Keyboard shortcuts apply when focus is on the map or
page; focused buttons retain standard browser keyboard behavior.

## Files and reuse

| File | Role |
| --- | --- |
| `index.html` | Semantic page, Canvas, HUD, buttons and controls |
| `style.css` | Responsive layout and local monospace styling |
| `game.mjs` | Input, fixed-tick loop, Canvas drawing and HUD updates |
| `../javascript/core.mjs` | Shared pure simulation, AI and validated commands |

Every function is commented; the full inventory is in
[`../docs/CODE_REFERENCE.md`](../docs/CODE_REFERENCE.md). Change rendering in
`render()`/`glyph()`, input in pointer/keyboard handlers, and rules in the shared
core. No rules are duplicated in this edition. All source files stay below 1 MB.

This static edition is **offline versus AI**. Static serving alone cannot provide
an authoritative multiplayer host. For LAN play, use the existing Node host and
browser/Godot/Python clients described in the repository README and networking
guide. No local multiplayer routes are called from this page.

## Browser check

With Python Playwright and Chromium installed:

```sh
python3 tests/html_smoke.py
```

The test uses a plain Python static server, checks real offline controls,
selection, recruitment, movement orders, income, pause, reset, local-only resource
loading and a narrow screen layout. It does not require or start Node.
