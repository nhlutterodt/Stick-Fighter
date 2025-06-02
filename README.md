# Stick-Fighter

A 2D stickman fighting game with advanced animation, combat mechanics, and AI opponents.

## Features

- **Procedural Animation**: Realistic walking cycles with IK foot planting and natural body movement
- **Combat System**: Punches, kicks, flying kicks, ground slams, guards, parries, and air dodges
- **Advanced Mechanics**: Combo system, limb impairment, knockback physics, and hit detection
- **AI Opponents**: Multiple difficulty levels with different fighting archetypes
- **Turn-Around Action**: Dedicated turn controls that maintain animation coherence
- **Power-ups**: Health restoration items that spawn dynamically
- **Visual Effects**: Hit sparks, impact animations, and smooth procedural movements

## Controls

### Player 1 (Blue Stickman)
- **A/D**: Move Left/Right
- **W**: Jump
- **F**: Punch / Flying Kick (in air)
- **G**: Kick
- **S**: Ground Slam (in air)
- **L-Shift**: Guard
- **C (+W/A/S/D)**: Air Dodge
- **V**: Parry
- **Q**: Run/Dash (Hold)
- **R**: Turn Around
- **Esc**: Pause Game

### Player 2 (Red / Computer)
- **Arrows**: Move Left/Right/Jump
- **K**: Punch / Flying Kick (in air)
- **L**: Kick
- **Down Arrow**: Ground Slam (in air)
- **R-Shift**: Guard
- **M (+Arrows)**: Air Dodge
- **N**: Parry
- **U**: Run/Dash (Hold)
- **P**: Turn Around

## Game Modes

- **Player vs Player**: Local multiplayer combat
- **Player vs Computer**: Fight against AI with Easy, Medium, or Hard difficulty

## Technical Features

- Inverse Kinematics (IK) for realistic foot placement
- Phase-coherent walk cycles that maintain proper gait when turning
- Limb-based hit detection with specific damage zones
- Dynamic obstacle generation and power-up spawning
- Event-driven architecture with pause/resume functionality
