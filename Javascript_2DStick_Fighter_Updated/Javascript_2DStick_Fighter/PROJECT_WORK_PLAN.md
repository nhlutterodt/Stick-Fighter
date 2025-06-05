# Stick Fighter Project Work Plan

This document outlines the overall phases for building our Stick Fighter HTML/CSS/JS project, now including the Animation System.
Refer to `ANIMATION_SYSTEM_PLAN.md` for detailed animation work.

---

## 1. Scaffold & Build Setup

- [x] Create/validate `index.html`, link `main.css`, bundle JS via Rollup.
- [x] Ensure project structure is clean and modular: `src/`, `styles/`, `assets/`, `ui/`, `game/`.

## 2. Asset Preloader & Boot

- [x] Integrate `preloader.js` to load images and sounds.
- [x] Show loading progress; dispatch a ready event to start game.

## 3. Canvas Setup

- [x] Call `setupResponsiveCanvas()` in `bootstrap.js` or init script.
- [x] Verify canvas scales and fits viewport.

## 4. Input Handling

- [x] Import `controls.js` and wire keyboard events.
- [x] Dispatch game events for movement, actions, and debug inputs.

## 5. Game Loop & Rendering Core

- [x] Use `integratedGameLoop()` in `index.js` or main entry.
- [x] Clear canvas, draw background, and orchestrate rendering calls.

## 6. Animation System

- [x] Core skeleton & FK
- [x] Rendering basics (cylinders)
- [x] Animation data & player
- [x] State machine
- [x] Game integration of animation
- [x] IK, procedural moves, API, persistence

## 7. Stickman Rendering & Effects  <!-- Completed -->

- [x] Hook `stickman.js` and `hitSparks.js` for character visuals.
- [x] Ensure correct draw order and gradient shading.

## 8. UI Overlays  <!-- Next Up -->

- [x] Integrate `healthBar.js`, `controlsInfo.js`, `menu.js`, `messageDisplay.js`, `screenManager.js`.
- [x] Sync UI with game events via `eventManager`.

## 9. State Persistence

- [x] Wire up `saveManager.saveGameState()` and `loadGameState()`.
- [x] Auto-save on key points (pause, level end).

## 10. SFX & Hit Sparks

- [x] Play audio (`hit.wav`, etc.) on damage events.
- [x] Spawn visual effects via `spawnHitSpark()`.

## 11. Debug & Polish

- [x] Enable `eventManager.enableDebug()`, diagnostics panels.
- [ ] Refine CSS (`main.css`), tweak performance, fix edge cases.

---

*Use this plan as the master reference: block out small PR-friendly chunks per phase.*
