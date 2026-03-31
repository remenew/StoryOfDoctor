# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000 (hot reload)
npm run build     # Production build to /dist
npm run preview   # Preview production build
```

No test runner or linter is configured. There are no test files.

## Architecture

**Stack**: Phaser 3 + Vite + ES6 modules. No TypeScript. No backend.

### Scene Flow
```
BootScene → MenuScene → BattleScene
```
- **BootScene**: Loads all JSON configs into Phaser's registry (`this.registry.set(...)`)
- **MenuScene**: Main menu, continue/new game, help dialog
- **BattleScene**: The entire gameplay loop (~320 lines, most complex file)

### Systems (`src/systems/`)
Three pure-logic systems used by BattleScene:
- **BattleSystem.js** — State machine: `IDLE → DRAW → PLAY → DISEASE → CHECK → VICTORY/DEFEAT`
- **DeckSystem.js** — Draw/discard/shuffle pile management using seeded RNG
- **ComboSystem.js** — Sliding-window detection over the last N played cards to trigger combo effects

### Game Objects (`src/objects/`)
Phaser `GameObject` subclasses with visual + state:
- **Card.js** — Selectable, playable state, heal value display
- **Patient.js** — Player health bar with animation
- **Disease.js** — Enemy with attack intent preview, randomized deck

### Data (`src/config/`)
All game content is data-driven JSON loaded at boot:
- `cards.json` — 100+ cards (Drug/Skill/Magic types) with costs and effects
- `diseases.json` — 50+ enemies with attack patterns and stats
- `combos.json` — Combo definitions matched against played card sequences
- `levels.json` — 4 chapters, 30+ levels

### Core Mechanics
- **Qi** (真气): Energy per turn (max 3), spent to play cards
- **Turn loop**: Draw 5 → Player plays cards → Disease attacks → Check win/loss → repeat
- **RNG**: `seedrandom` library for deterministic, reproducible gameplay
- **Persistence**: `localStorage` via helpers in `src/utils/helpers.js`

### Shared State
Game data (card/disease/level definitions) is accessed via `this.registry.get('cards')` etc. from any scene. Battle state flows through the BattleSystem state machine, not the Phaser scene directly.
