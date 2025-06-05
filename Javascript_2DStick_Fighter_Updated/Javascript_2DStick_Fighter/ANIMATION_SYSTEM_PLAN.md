# 2D Stick Fighter Animation System Plan

This document captures the phased breakdown for building the stick-fighter animation system. We’ll refer to this plan as we implement each stage.

---

## 1. Core Skeleton & Forward Kinematics (FK)
1. Define `Bone` and `Skeleton` classes
   - Properties: length, localAngle, worldAngle, parent/children links
2. Implement `updateWorldTransform()`
   - Recursive FK pass to compute world positions and rotations

## 2. Rendering Basics (“Cylinders”)
1. Draw bones as thick lines / rounded rectangles
   - Use `ctx.lineCap = 'round'` or `roundRect`
2. Apply perpendicular gradient fills
   - Create linear gradients orthogonal to each bone’s angle
3. (Optional) Offscreen canvas & layered canvases for performance

## 3. Animation Data & Player
1. Define JSON schema for `AnimationClip` and `Track`
   - Keyframes with time, value, easing, interpolation
2. Build `AnimationPlayer`
   - Play, loop, cross-fade, sample & interpolate tracks

## 4. State Machine
1. Integrate a simple FSM per character
   - States: idle, walk, attack, etc.
2. Transition rules → trigger clip playback and cross-fade

## 5. Game Integration
1. Wire skeleton + player + renderer in `integratedGameLoop()`
2. Kick off the initial “idle” state on load

## 6. Inverse Kinematics (IK)
1. Implement analytical 2-bone solver for arms/legs
   - Law-of-cosines + angle clamping for aiming and foot placement
2. (Future) CCD / FABRIK modules for longer chains or tails

## 7. Procedural & Parametric Moves
1. Define combat-move data structure
   - Phases: anticipation → execution → recovery with easing
2. Implement parametric gait generator
   - Sinusoidal limb and torso swings

## 8. Runtime API
1. Expose high-level methods:
   - `character.play(name)`, `character.crossFadeTo()`, `setIKTarget()`, etc.

## 9. Asset Persistence & Tooling
1. Load / save skeleton and animation JSON via `preloader` + `saveManager`
2. (Future) Create a simple authoring UI or JSON editor

---

*Use this plan as a reference when tackling each phase.*
