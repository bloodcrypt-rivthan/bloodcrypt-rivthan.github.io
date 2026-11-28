# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Blood Crypt is a browser survival game (auto-attacking hero vs. waves of enemies) hosted on GitHub Pages at `bloodcrypt-rivthan.github.io`. `index.html` holds only the HTML (overlays, HUD, debug panel). The styles are in `css/estilos.css`, and the code is in 22 plain `<script src>` files in `js/`, about 6,400 lines in total. They are classic scripts, not ES modules: they share globals and also work over `file://`. The sprite sheets are separate PNG files (see below). There is no build step, package manager, linter, or test suite, and there are no external dependencies.

- **Run:** serve the folder (e.g. `python -m http.server` or `npx serve`) and open `http://localhost:8000`. Opening `index.html` directly (`file://`) also works, but the browser blocks `getImageData` there, so the green thrall tint falls back to a simple overlay.
- **Deploy:** push to `main`. GitHub Pages serves `index.html` and the `css/`, `js/`, `sprites/` and `suave/` folders from the root.
- **Language:** UI text, identifiers in the UI, and most code comments are in **Spanish**. Keep new UI strings and comments in Spanish to match.

## Files

- `index.html`: the HTML, the `<link>` to the CSS, and the `<script src>` tags **in load order** (see below).
- `css/estilos.css`: all the styles.
- `js/*.js`: the code, one file per area. In load order: `config` (canvas, constants, tuning), `caballero-suave`, `datos` (`CHARS`, `ETYPES`, `G`), `entrada`, `menu`, `guardado`, `combate`, `arquero`, `esclavitud`, `yoko`, `habilidades` (spectral hand, lightning, skeletons, thralls), `mejoras-heroes` (`buildPool`, `HEROES`), `audio`, `sprites` (`loadSprites`, `SPRITE_CFG`), `bucle` (`loop`, `update`, the per-system functions), `render` (`draw`, lighting), `escenario`, `dibujo-personajes`, `dibujo-enemigos`, `hud`, `debug`, `arranque` (BOOT).
- `sprites/*.png`: the sprite sheets the game loads. Each file is named after its `SPRITES` key (`knight.png` → `SPRITES.knight`, `coin.png` → `COIN_SRC`).
- `suave/`: the knight's "SUAVE" animation sheets (loaded as files), their `.ora` sources, and `normalizar_hojas.py`, which only computes their config.
- `sprites-fuente/`: source art. The game does not load it.

## Working with the files

- Find things with Grep over `js/` first, then read narrow line ranges.
- Sections are marked with banner comments like `// ─── COMBAT ───`. Run `grep -n '^// ─── ' js/*.js` for a table of contents.
- **Load order matters.** A function declaration is hoisted only inside its own file, and a top-level `const`/`let` exists only from its own line on. Code that runs while the page loads (top-level calls, `const X = f()`, IIFEs) can therefore use only its own file and files loaded before it. Functions that run later (events, the game loop, `onclick`) can use anything. A new file goes in `index.html` in the right place, and `js/arranque.js` stays last.
- To add or replace a sprite, put the PNG in `sprites/`, point the `xxxImg.src = 'sprites/....png'` line in `loadSprites()` at it, and update its matching `SPRITE_CFG` entry. Don't embed images as base64 `data:` URIs.

## Architecture (across the `js/` files)

**Global state.** Everything is plain globals. `G` is the current run: `G.p` is the player, plus arrays `enemies`, `projs`, `orbs`, `parts`, `skeletons`, `thralls`, `bossProjs`, `eProjs`, and others. Boss and Lilith state also lives on `G`. `initG()` rebuilds `G` from `CHARS[selChar]`.

Every run array is declared in **`freshRunLists()`**, the single list. Both `initG()` and the boot `G` (the menu before the first run) spread it, so `G` always has every array, even outside a run. A new array goes in `freshRunLists()`. Don't create it lazily (`if(!G.x) G.x=[]`) and don't guard reads (`if(G.x)`, `G.x&&…`). `G.boss` and `G.lilith` can be `null`, so their checks stay. The boot `G` has `p:null`, and `draw()` stops at `if(!G.p) return;` before drawing entities. The menu preview, however, calls the hero draw functions with whatever `G` is current: the boot `G` before the first run, or the finished run's `G` after `goMenu()`. So a hero draw function must not assume either state (`drawNecro`, for example, reads `G.skeletons`).

**Load order.** `js/arranque.js` (the `// ─── BOOT` block) is the last file loaded and the only top-level code that starts the game (`buildCharDots`, `updateCharCard`, `startPreview`, `loop`). Top-level `const`s such as `CHARS`, `HEROES`, and `SPRITE_CFG` are not usable before their own line (temporal dead zone). Code that runs at load time and touches them, directly or through functions like `startPreview`, `drawPlayer`, or `buildPool`, must be in their file (below them) or in a later file. In practice: keep `arranque.js` last.

Other globals: `keys` (input), `paused`, `selChar`, `raf`, `lastT`. There are no modules or classes.

**Loop.** `loop()` → `update(dt)` + `draw()` on `requestAnimationFrame`. `dt` is clamped to 0–0.05 s. While `!G.run`, `paused`, or `G.lvlPending` (level-up screen) is true, only `draw()` runs.

`update(dt)` is a short orchestrator. It handles time, regen, movement, camera, shake, and the hero's attack and systems itself, then calls one function per system in a fixed order: `updateProjectiles`, `updateEnemies`, `updateEnemyProjectiles`, `updateOrbs`, `updateEffects`, `updateSpawner` (waves, boss and Lilith triggers), `updateBoss`, `updateLilith`, `updateBossProjectiles`. A function that can kill the hero calls `endGame()` and **returns `true`**, and `update()` does `if(updateX(dt)) return;` so the rest of the frame doesn't run. Keep that convention for any new damage source.

**Death.** `update()` stops running once `endGame()` sets `G.run=false`, so `endGame()` clears the hero's frozen state (`hp` floored at 0, `invT` and `dmgF` set to 0) and starts the death animation by hand. The SUAVE knight uses `kDeathT0` and its own sheet. Every other hero with a loaded sprite gets `deathT0`, and `drawPlayer()` advances `sprFrame` from the clock and keeps requesting `draw()` until the last frame. The game-over screen waits for the animation plus `KN2_DEATH_EXTRA`. Sheets with no death frames (the ORIGINAL knight and the archer) use `drawSpriteFall`, a falling rotation drawn in code.

When a hero projectile hits something, `projAfterHit(pr,t)` applies poison, the mage split, and pierce. The boss has its own hit function, `projHitBoss`, with different effects. On purpose, an enemy dies *before* `projAfterHit` and the boss dies *after* it.

The menu, pause, level-up, game-over, and records screens are HTML `.scrim` overlays that are shown or hidden with `style.display`. The game itself is drawn on `<canvas id="c">`.

**Heroes.** A hero is made of three parts:
- **An entry in `CHARS`**: stats, `id`, menu text (`role`, `desc`), colors, and a boolean flag (`melee`, `mage`, `necro`, `yoko`, `archer`). `id` is the hero's key in `HEROES`, `SPRITES`, and `SPRITE_CFG` (`knight`, `mage`, `necro`, `yoko`, `archer`). `name` is the key the save file uses, so don't rename it. The menu card reads from `CHARS`, the stat-bar maxima come from `CHAR_STAT_MAX`, and `buildCharDots()` generates the carousel dots.
- **An entry in `HEROES[id]`**, which decides what the hero does: `attack()` (the basic attack, called from `update()`), an optional `update(dt)` (necro: skeletons and thralls; Yoko: bloodlust, charge, bones), `draw(x,y,p)` (used by both `drawPlayer()` and the menu preview), and `upgrades(p)` (the hero-only upgrades that `buildPool()` appends to the shared ones).
- **Its sprite**: `sprites/<id>.png` plus `SPRITE_CFG[id]`. The sprite-animation code and the HP-bar offset look these up by `G.p.id`.

`initG()` copies `id` and the flags onto `G.p` one by one. If a new hero needs a new flag, add it to that copy too. The flags are only for one-off checks of a single mechanic, such as necro enslaving, Yoko's bone panel, the knight's SUAVE death, and parts of the HUD (`SKILLBAR_DEFS`/`skillState`, the upgrades panel). The archer's systems (`updateArrowQueue`, `updateShurikens`, `updateRain`, `updateTraps`, `updateStealth`, `updatePoison`) run every frame for every hero, are gated by upgrade level, and also initialize `G` fields that the renderer reads.

**Enemies.** Enemy types are in `ETYPES`. `spawnEnemy()` uses them, and `drawEnemy()` sends each type to a per-type `drawBat`/`drawZombie`/etc. The wave number is time-based: `G.wave = 1 + floor(G.time/25)`. The boss (Rey Liche) spawns at wave 10. Lilith, who is immortal and has a damage indicator instead of an HP bar, spawns at `G.time >= 480`. Both triggers are in `updateSpawner()`.

**Upgrades.** `buildPool()` returns upgrade objects `{title, desc, t, apply(), hide()}` built from the current `G.p`. Upgrade levels are stored in `p.up.*`. `pickUpgrades()` filters out hidden ones and picks 3. Caps and tuning values are named constants, mostly in `js/config.js` (`RANGE_MAX`, `ARMOR_MAX`, `PICKUP_MAX`, `MULTISHOT_MAX`, …). The rest sit next to the code that uses them, for example `PIERCE_MAX`/`RAIN_*`/`TRAP_*` in `js/arquero.js`, `BLOODLUST_*` in `js/datos.js`, `GOLD_*` in `js/guardado.js`, `LIGHT_*` in `js/render.js`, and `LIGHTNING_*` in `js/habilidades.js`. List them all with `grep -n '^const [A-Z_]' js/*.js`. Each has a Spanish comment explaining it, and some say what the old value was. Balance changes should usually change these constants, not inline numbers.

**Rendering.** `draw()` does the camera and shake, then calls `drawTiles`, `drawLibraryWalls`, `drawTorches`, and `drawAmbientFog`, then draws entities and effects. Sprites use `SPRITES[key]` (each loaded asynchronously from `sprites/*.png`) and `SPRITE_CFG[key]` (animation frame ranges, source rect, draw height, optional `seq`). Both go through `drawSpriteFrame()`. Most draw functions fall back to procedural drawing while the sprite isn't loaded (for example `drawBossProcedural`, and `knightOld` as a backup for the knight). The hit flash comes from `getFlashSheet()`, a tinted copy of the sheet that is cached in a WeakMap.

**Audio.** Everything is synthesized with WebAudio, and there are no audio files. `playTone`/`playNoise` produce sound effects (`snd*` functions, many of them throttled through `last*SndT` timestamps). The procedural music engine (`MUSIC`, `scheduleBar`, `startMusic('dungeon'|'boss')`, `stopMusic`) uses its own context. The master volume is `_volPct`, which feeds `MASTER_VOL_FN` and `musicTarget`.

**Persistence.** Saves go to `localStorage` key `bloodcrypt_save_v1` (`SAVE_KEY`). The save stores run history (`MAX_RUNS`), totals, per-hero bests, the gold `wallet`, and `unlocked` heroes. All loads and imports pass through `sanitizeSave()`. Any new save field needs a default in `emptySave()` and a check in `sanitizeSave()`. Heroes other than the first are unlocked with gold (`UNLOCK_PRICE`). `saveRun()` is called from `endGame()` and from `goMenu()`. The records screen can export and import the save as JSON.

**Debug panel.** The NIVEL+, BOSS, LILITH, REROLL+ and AUTO-MEJORA buttons are testing-only. They live in the `#debug-panel` HTML block, `js/debug.js`, and a marked block in `css/estilos.css`. `debugEnabled(location)` decides whether the panel is on: on when running locally (`file:`, `localhost`, `127.0.0.1`, `[::1]`) and off everywhere else, including the published site. The `?debug` URL parameter always wins: `?debug` or `?debug=1` turns it on anywhere, and `?debug=0` turns it off locally. When it is off, the panel is hidden (`body` has no `debug-on` class) and every `debug*`/`dbgAutoPick` function does nothing. To test on a phone over the LAN (an IP like `192.168.x.x`), add `?debug`. `?debug=0`, `=false`, `=off`, and `=no` turn it off. Use the panel to reach late-game content quickly.

To remove the panel completely: delete `js/debug.js` and its `<script>` tag, the marked `#debug-panel` block in `index.html`, and the marked block in `css/estilos.css`. Then remove or stub the calls the game makes into it: `dbgSyncRerollBtn()` in `startGame()` (`js/guardado.js`) and in the level-up flow (`js/mejoras-heroes.js`), plus `dbgAutoPick()` in `triggerLvlUp()`. Otherwise starting a run or leveling up throws a ReferenceError.

**Boot gating.** Until `js/arranque.js` adds `body.booted`, the menu ignores clicks (`body:not(.booted) .scrim{pointer-events:none}` in the CSS). This keeps a click on INICIAR during a slow load from leaving the game half-started.
