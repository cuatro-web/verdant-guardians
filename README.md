# Verdant Guardians

A fantasy tower defense game for the browser, built with plain HTML5 Canvas, CSS and vanilla JavaScript.
No frameworks, no backend, no external assets: all art is drawn in code and all sound and music is synthesized with the Web Audio API.

**Play:** `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/` (after you deploy, see below)

## How to play
Defend the Emerald Heart from 10 waves of raiders, ending with the Ogre Warlord boss.

- You start with 100 coins. Pick a tower from the bar (or press `1`, `2`, `3`) and click the grass. White dots mark open spots. Optional gold rings (Settings > Gameplay, off by default) also point out the spots that cover the most road.
- Click a tower you built to see its stats, upgrade it (3 levels) or sell it (70% back).
- Press **Start Wave** (or `N`) when ready. Nothing attacks until you do.
- `P` pauses. The 1x/2x button changes speed. `Esc` clears your selection.
- Touch: tap a spot to preview, tap the same spot again to build.

| Tower  | Role                                 |
|--------|--------------------------------------|
| Archer | Fast single-target damage            |
| Cannon | Slow, heavy splash damage            |
| Frost  | Low damage, slows enemies in an area |

## Run locally
The game uses ES modules, so it must be served over HTTP (opening `index.html` by double-click will not work).

- VS Code: install **Live Server**, right-click `index.html`, **Open with Live Server**, or
- Terminal: `python -m http.server 5500` in this folder, then open `http://127.0.0.1:5500/`.

Add `?debug` to the URL to expose `window.__vg` (the game object) in the browser console.

## Deploy to GitHub Pages
1. Create a new repository on GitHub (for example `verdant-guardians`) and push this folder to it:
   ```
   git init
   git add .
   git commit -m "Verdant Guardians"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY-NAME.git
   git push -u origin main
   ```
2. On GitHub open **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose branch `main` and folder `/ (root)`, then **Save**.
4. Wait a minute or two. Your game will be live at `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/`.

All paths in the project are relative, so it works under a repository sub-path. Progress and settings are saved in the visitor's own browser (LocalStorage) and are not shared between devices.

## Project structure
```
index.html          all screens and dialogs
css/style.css       base styles, buttons, dialogs
css/menu.css        main menu scene and records card
css/game.css        in-game HUD, side panels, phone layouts
assets/images/      the seven pictures shown in How to Play
js/main.js          wires everything together
js/game.js          game state, main loop (requestAnimationFrame + delta time), HUD updates
js/renderer.js      all canvas drawing (terrain is baked once)
js/input.js         mouse, touch and keyboard
js/towers.js        tower behavior and targeting
js/enemies.js       enemy movement, slows, armor
js/projectiles.js   arrows, cannonballs, frost bolts
js/waves.js         the 10 wave definitions
js/maps.js          level path, decorations, path math
js/ui.js            menus, tutorial, level select, settings
js/audio.js         sound effects and procedural music
js/storage.js       settings and progress in LocalStorage
js/config.js        every balance number (towers, enemies, coins, health)
```

## Music
The game has two built-in synthesized songs: a calm theme for the main menu and a driving battle track (the boss wave switches to a faster mix). The menu theme starts on your first click, tap or key press, because browsers do not allow sound before that.

To use your own music:
1. Copy your audio file(s) (mp3, ogg, wav or m4a) into `assets/audio/`.
2. Open `js/config.js` and list them in `MUSIC`:
   ```js
   export const MUSIC = {
     tracks: ['assets/audio/battle.mp3'],      // played during battles
     menuTracks: ['assets/audio/theme.mp3'],   // played on the main menu
     credit: 'Songs by Your Name',             // shown in Credits
   };
   ```
3. Reload. One track loops; several play in order and repeat. Either list can stay empty, and if a file is missing or cannot be played the built-in song is used instead (check the file name and extension carefully).

Keep files small (a few MB is plenty; GitHub rejects files over 100 MB) and only use music you own or have a licence for, because the repository and game are public. The Music toggle and Music volume in Settings control it, and it dips while the game is paused.

## Tuning the game
Edit `js/config.js` (tower costs, damage, range, enemy health and speed, starting coins, how fast enemies get stronger) and `js/waves.js` (what spawns in each wave). No game logic needs to change.

## Adding a level
1. Add a new entry to `LEVELS` in `js/maps.js` (waypoints, seed, path width).
2. Make `WAVES` in `js/waves.js` a list per level.
3. Set `available: true` for the level card in `js/ui.js`.

## Notes
- Records are local to each browser. A real online leaderboard would need a server, which GitHub Pages does not provide.
- Everything is original; there are no third-party assets.