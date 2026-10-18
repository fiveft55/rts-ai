# HTML / Canvas edition

A static-server edition of Glyph Command: offline AI, ASCII Canvas graphics,
recruitment, finite ore, navigation, combat, group selection, health bars, pause
and restart. No Node game server, npm packages, CDN, accounts or API calls needed.
It includes a generated local copy of the multiplayer rules. All files needed
to play are inside this folder, including `core.js`.

## VS Code Live Server

1. Check out branch `feat/glyph-command-rts` and open the repository or just its
   `html/` folder in VS Code.
2. Install the VS Code **Live Server** extension if needed.
3. Right-click `html/index.html` and choose **Open with Live Server**.
4. Play. Code changes reload the page and start a fresh match.

The HTML edition imports `./core.js` from this same folder. It no longer needs
access to a parent `javascript/` directory. You may copy the entire `html/` folder
to another location and serve it there. Keep `index.html`, `game.js`, `core.js`
and `style.css` together. Use a local HTTP server rather than `file://`.

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
| `game.js` | Input, fixed-tick loop, Canvas drawing and HUD updates |
| `core.js` | Generated local simulation, AI and validated commands |

Every function is commented; the full inventory is in
[`../docs/CODE_REFERENCE.md`](../docs/CODE_REFERENCE.md). Change rendering in
`render()`/`glyph()`, input in pointer/keyboard handlers, and rules in the shared
core. The editable source of truth remains `javascript/core.mjs`; after changing
it, run `npm run sync:html` from the repository root and commit `html/core.js`
together with the original change. The test suite checks they match. No build
step is required to play a checkout. All source files stay below 1 MB.

This static edition is **offline versus AI**. Static serving alone cannot provide
an authoritative multiplayer host. For LAN play, use the existing Node host and
browser/Godot/Python clients described in the repository README and networking
guide. No local multiplayer routes are called from this page.

## Browser check

With Python Playwright and Chromium installed:

```sh
python3 tests/html_smoke.py
```

The default test serves **only this folder**, so parent-directory imports cannot
accidentally hide a launch problem. To check a repository-root server too, run
`python3 tests/html_smoke.py --repo-root`.

The test uses a plain Python static server, checks real offline controls,
selection, recruitment, movement orders, income, pause, reset, local-only resource
loading and a narrow screen layout. It does not require or start Node.

## If you previously saw “failed to load core.mjs”

Update your checkout on `feat/glyph-command-rts` (or download its latest ZIP),
restart Live Server, then hard-refresh the browser. The page now loads local
`game.js` and `core.js`, with no `.mjs` dependency or parent-directory request.
If the browser still requests `core.mjs`, you are viewing an old file or cached
page. Make sure all four HTML edition files were updated together.
