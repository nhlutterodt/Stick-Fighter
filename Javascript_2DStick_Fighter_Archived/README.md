# Stickman Fighter: Application Requirements

## 1. General Requirements

### 1.1. Game Objective:
The primary objective of the game is for one player to defeat the other player (either human or AI-controlled) by reducing their health to zero through combat.

### 1.2. Game Modes:
The application shall support a Player vs Player (PvP) mode where two human players can compete against each other using shared keyboard controls.

The application shall support a Player vs Computer (PvC) mode where a human player competes against an AI-controlled opponent.

The PvC mode shall offer selectable difficulty levels for the AI opponent (e.g., Easy, Medium, Hard – current code defaults to 'Medium' but has buttons for others).

## 2. Functional Requirements

### 2.1. Game State Management: 
The application must manage the following game states:

**FR-GS-001: Loading:**
Upon initial startup, display a "Loading..." screen for a defined duration (LOADING_DURATION).

**FR-GS-002: Main Menu (MENU):**
After loading, present a main menu with an option to "Start Game".
This state should be the default return state after a game ends or when the "Main Menu" button is clicked.

**FR-GS-003: Mode Selection (MODE_SELECT):**
Allow the player to choose between "Player vs Player" and "Player vs Computer" modes.

**FR-GS-004: Difficulty Selection (DIFFICULTY_SELECT):**
If "Player vs Computer" is chosen, allow the player to select AI difficulty (Easy, Medium, Hard).

**FR-GS-005: Fighting (FIGHTING):**
The active gameplay state where players control their characters and engage in combat.
Game physics, player updates, AI actions, power-up spawning, and collision detection shall occur in this state.

**FR-GS-006: Paused (PAUSED):**
Allow a player to pause the game during the FIGHTING state (e.g., by pressing the Escape key).
Display a "Paused" menu with options to "Resume", access "Settings", or return to the "Main Menu".
Game actions and animations (except menu interactions) shall be suspended.

**FR-GS-007: Settings Menu (SETTINGS_MENU):**
Accessible from the PAUSED menu.
Allow adjustment of game settings (e.g., gravity levels: Low, Normal, High).
Provide an option to return to the PAUSED menu.

**FR-GS-008: Game Over:**
Triggered when a player's health reaches zero.
Display a message indicating the winner (e.g., "Player 1 Wins!").
After a short delay, return to the MAIN_MENU state.

### 2.2. Player Control:

**FR-PC-001: Keyboard Input:**
The system shall accept keyboard input for controlling player characters and navigating menus (as defined in the controls-info section and handlePlayerActions function).

- Player 1 controls: WASD for movement, F for Punch/Flying Kick, G for Kick, S for Ground Slam, L-Shift for Guard, C for Air Dodge, V for Parry, Q for Run/Dash, R for Turn Around.
- Player 2 controls (PvP): Arrow keys for movement, K for Punch/Flying Kick, L for Kick, Down Arrow for Ground Slam, R-Shift for Guard, M for Air Dodge, N for Parry, U for Run/Dash, P for Turn Around.

**FR-PC-002: Action State Gating:**
Player actions (attacks, special moves, jumps, etc.) shall be gated by canAct() logic, preventing actions during hit stun, parry failure, dodging, or while another attack/animation is in progress.
Movement shall be gated by canMove() logic, preventing movement during guard, parry, specific special moves, or hit stun.
Changing facing direction shall be gated by canChangeFacing().

### 2.3. Player Character (Stickman): 
Each player character (stickman) shall possess the following capabilities:

#### 2.3.1. Movement:

**FR-SCM-001: Horizontal Movement:** Move left and right on the game stage with defined acceleration (BASE_PLAYER_ACCELERATION) up to a maximum walk speed (MAX_WALK_SPEED).

**FR-SCM-002: Running/Dashing:** Hold a designated key (KeyQ for P1, KeyU for P2) to increase acceleration (RUN_ACCELERATION_MULTIPLIER) and maximum speed (MAX_RUN_SPEED).

**FR-SCM-003: Jumping:** Execute a jump with a defined upward force (JUMP_FORCE). Players cannot jump while already in the air.

**FR-SCM-004: Turning Around:** Instantly reverse the character's facing direction using a dedicated key (KeyR for P1, KeyP for P2), with appropriate animation adjustments.

**FR-SCM-005: Air Dodge:** While jumping, perform a directional dodge with a defined force (AIR_DODGE_FORCE), duration (AIR_DODGE_DURATION), and cooldown (AIR_DODGE_COOLDOWN).

**FR-SCM-006: Procedural Animation:**
Limb movements shall be animated procedurally by interpolating current joint angles towards target angles using lerp() and angleLerp() functions.
Characters shall exhibit distinct poses/animations for idling, walking, running (IK-driven legs with foot planting), jumping, guarding, parrying, dodging, hit stun, and performing attacks.
Range of Motion (ROM) profiles (ROM_DEFAULT, ROM_NINJA) shall define the permissible angular limits for each joint, clampable via clampAngle().

#### 2.3.2. Combat Actions (Attacks):

**FR-SCC-001: Punch:** Perform a punch attack with defined damage (PUNCH_DAMAGE), range (PUNCH_RANGE), and duration (ATTACK_DURATION).

**FR-SCC-002: Kick:** Perform a kick attack with defined damage (KICK_DAMAGE), range (KICK_RANGE), and duration (ATTACK_DURATION).

**FR-SCC-003: Flying Kick:** If a "punch" is initiated while jumping, perform a flying kick with defined damage (FLYING_KICK_DAMAGE), range (FLYING_KICK_RANGE), and duration (SPECIAL_ATTACK_DURATION).

**FR-SCC-004: Ground Slam:** While in the air, initiate a ground slam attack by pressing the designated key. The player rapidly descends (GROUND_SLAM_FORCE). Upon impact with the ground, this attack deals Area of Effect (AoE) damage (GROUND_SLAM_DAMAGE) within a defined range (GROUND_SLAM_AOE_RANGE).

**FR-SCC-005: Hit Detection:** Attacks connect if the opponent is within the attack's range and the attacker is facing the opponent. Opponent dodging prevents hits.

**FR-SCC-006: Knockback:** Successful unblocked/unparried hits shall apply knockback to the opponent (KNOCKBACK_BASE_X, KNOCKBACK_BASE_Y), with special moves having a multiplier (KNOCKBACK_SPECIAL_MULTIPLIER).

**FR-SCC-007: Hit Stun:** Opponents hit by an attack shall enter a hit stun state for a defined duration (HIT_STUN_DURATION_LIGHT or HIT_STUN_DURATION_HEAVY), during which they cannot perform actions.

Example Requirement Levels (Hit Stun):

- Simple: When a player is hit, they can't move or attack for a short time.
- Intermediate: A player hit by a light attack is stunned for 150ms. A player hit by a heavy or special attack is stunned for 300ms. During stun, the player cannot initiate any actions.
- Expert: Upon receiving an unblocked, unparried damaging hit, the recipient enters a hit stun state. Duration is HIT_STUN_DURATION_LIGHT for standard attacks and HIT_STUN_DURATION_HEAVY for special moves. During this state, the character cannot initiate movement, attacks, guards, parries, or dodges. Stun duration is decremented each frame.

#### 2.3.3. Defensive Actions:

**FR-SCD-001: Guarding:** Hold a designated key to enter a guarding stance. While guarding and facing an incoming attack, damage taken is reduced by GUARD_DAMAGE_REDUCTION percent, and a slight pushback (GUARD_PUSHBACK_FORCE) is applied. Movement speed is heavily reduced while guarding.

**FR-SCD-002: Parrying:** Initiate a parry with a designated key. If an opponent's attack connects during the active parry window (PARRY_DURATION), the attack is negated, and the attacker is put into an extended hit stun (HIT_STUN_DURATION_HEAVY * PARRY_SUCCESS_STUN_MULTIPLIER). A successful parry puts the parrying player into a brief vulnerable state (PARRY_FAIL_VULNERABLE_DURATION). Parrying has a cooldown (PARRY_COOLDOWN). If the parry is attempted but no attack connects, the player is vulnerable for PARRY_FAIL_VULNERABLE_DURATION.

#### 2.3.4. Health & Damage:

**FR-SCH-001: Health Points:** Each player starts with a maximum health value (PLAYER_HEALTH_MAX).

**FR-SCH-002: Taking Damage:** When an attack successfully hits, the player's health is reduced by the attack's damage value (factoring in guard, combos, etc.).

**FR-SCH-003: Defeat:** If a player's health reaches zero, they are defeated, and the game ends.

**FR-SCH-004: Limb Impairment:**

- Specific limbs (head, torso, arms, legs) can become "impaired" if hit.
- An impaired limb is visually distinct (e.g., color change to impairedLimbColor) for a duration (limbImpairDuration).
- Impaired leg limbs reduce maximum movement speed (LIMB_IMPAIR_SPEED_REDUCTION) and jump force (LIMB_IMPAIR_JUMP_REDUCTION).
- (Note: The current code sets impairedTimer on hit limbs but only explicitly checks leg impairment for speed/jump effects. Effects of other limb impairments are not defined beyond visual).

**FR-SCH-005: Hit Sparks:** Successful hits shall generate visual "hit spark" particles (HitSpark class, HIT_SPARK_COUNT) at the point of impact.

#### 2.3.5. Special Mechanics:

**FR-SCSM-001: Combo System:**
Landing subsequent attacks of the same type within a specific time window (COMBO_WINDOW) increases a combo counter.
(Note: The code updates comboState.count but doesn't explicitly use it to modify damage. This requirement reflects the setup for a potential combo damage bonus: COMBO_DAMAGE_MULTIPLIER_STEP).

**FR-SCSM-002: Mass:** Player characters have a mass property (currently 1.0 for all), which influences acceleration and pushback during collisions.

### 2.4. Non-Player Character (NPC) / AI (for PvC mode):

**FR-AI-001: AI Control:** In PvC mode, Player 2 shall be controlled by an AI.

**FR-AI-002: AI Decision Making:**
The AI shall make decisions at intervals (aiDecisionIntervalBase + random variance).
Decisions include choosing a target X-coordinate (aiTargetX), and whether to attack (aiWantsToAttack), guard (aiWantsToGuard), parry (aiWantsToParry), or jump (aiWantsToJump).
Probabilities for actions (aiBaseAttackProb, aiBaseGuardProb, etc.) and preferred engagement distance (aiPreferredDistance) guide decisions.

**FR-AI-003: AI Action Execution:** The AI shall attempt to execute decided actions (move, attack, guard, parry, jump) subject to the same canAct() and canMove() rules as human players.

**FR-AI-004: AI Archetype:** The AI has an archetype property (e.g., 'CounterStriker', though its specific behavior differentiation based on archetype is not fully implemented in the provided snippet beyond being a placeholder).

**FR-AI-005: AI Difficulty Scaling:** (Currently, selectedAIDifficulty is stored but doesn't directly modify AI parameters in the provided Stickman class code. This requirement assumes it's intended to be used).
AI behavior (e.g., reaction time, aggression, parry success rate) should scale with the selected difficulty.

### 2.5. Game Elements:

#### 2.5.1. Obstacles:
The game shall support fixed rectangular obstacles (Obstacle class) on the stage.
Players cannot pass through obstacles. Collision with obstacles will halt movement in that direction.

#### 2.5.2. Power-ups:

**FR-PU-001: Spawning:** Power-ups shall spawn periodically (POWERUP_SPAWN_INTERVAL) at random X-coordinates and fall from the top of the screen (POWERUP_FALL_SPEED).

**FR-PU-002: Collection:** Players collect power-ups by touching them.

**FR-PU-003: Health Power-up:** A "health" power-up shall restore a fixed amount of health (HEALTH_POWERUP_AMOUNT) to the collecting player, up to their maximum health.

**FR-PU-004: Active State:** Power-ups become inactive after collection or if they fall off-screen.

### 2.6. Physics:

**FR-PHY-001: Gravity:** A constant downward gravitational force (currentGravity) shall affect players when they are in the air. Gravity level can be adjusted in settings.

**FR-PHY-002: Friction:**
Ground friction (PLAYER_FRICTION) shall decelerate players when no movement input is given on the ground.
Air friction (AIR_FRICTION) shall decelerate players horizontally while in the air.

**FR-PHY-003: Collision Detection - Player vs. Player:**
Players cannot pass through each other. Upon collision, they shall push each other apart based on their relative positions and mass.
Velocity may be affected (dampened/reversed slightly) upon collision.

**FR-PHY-004: Collision Detection - Player vs. Obstacles:**
Players cannot move through obstacles. Horizontal and vertical movement will be stopped upon colliding with an obstacle's bounds.

**FR-PHY-005: Collision Detection - Player vs. Ground:**
Players cannot fall through the ground level (GROUND_LEVEL). Vertical velocity is nullified upon landing.

**FR-PHY-006: World Bounds:** Players cannot move beyond the canvas boundaries (CANVAS_WIDTH).

### 2.7. User Interface (Menus & HUD):

**FR-UI-001: Main Title:** Display "Stickman Fighter" as the game title.

**FR-UI-002: Health Bars:**
Display health bars for Player 1 (blue) and Player 2 (red) at the top of the game screen during FIGHTING state.
Health bars shall visually update in real-time to reflect current health percentages.

**FR-UI-003: In-Game Messages:**
Display messages overlaid on the game canvas (e.g., "Player 1 Wins!", "Paused", "Settings").

**FR-UI-004: Controls Display:**
Display a static section below the game area showing the keyboard controls for both players.

**FR-UI-005: Menu Navigation:**
Menus (MENU, MODE_SELECT, DIFFICULTY_SELECT, PAUSED, SETTINGS_MENU) shall be rendered on the canvas.
Buttons within menus shall be clickable to trigger actions or navigate to other game states/menus.
Buttons should visually indicate their default and hover states (as per CSS, though hover is canvas-drawn and might need explicit logic if not already present for button.hoverColor).

**FR-UI-006: Reset/Main Menu Button:** A dedicated HTML button ("Main Menu") shall be present to allow the user to return to the main menu from any active fight or game over screen.

## 3. Non-Functional Requirements

### 3.1. Performance:

**NFR-PERF-001: Frame Rate:** The game should strive for a smooth visual experience, ideally maintaining a consistent frame rate (target 60 FPS, as implied by requestAnimationFrame and delta calculations based on 1000/60).

**NFR-PERF-002: Responsiveness:** Player inputs should be processed with minimal latency.

### 3.2. Usability:

**NFR-USA-001: Clear Controls:** Controls should be clearly displayed and intuitive (based on common fighting game conventions).

**NFR-USA-002: Understandable Feedback:** The game must provide clear visual feedback for actions, hits, game state changes, and power-up collections.

**NFR-USA-003: Easy Navigation:** Menus should be easy to navigate.

### 3.3. Visuals:

**NFR-VIS-001: Stickman Representation:** Players are represented as stickman figures with distinct colors for P1 and P2. Limbs should be clearly distinguishable.

**NFR-VIS-002: Animations:** Animations for movement and combat should be fluid and clearly convey the action being performed. Procedural animations for walking, running, attacks, and reactions are key.

**NFR-VIS-003: Environment:** The game features a simple 2D environment with a sky, ground, and obstacles.

**NFR-VIS-004: Effects:** Visual effects like hit sparks and ground slam impact visuals enhance the gameplay experience.

### 3.4. Extensibility:

**NFR-EXT-001: Character Archetypes:** The Stickman class includes an archetype property and different Range-of-Motion (ROM) profiles, suggesting an intent for potential character variations or extensibility in AI or player abilities.

**NFR-EXT-002: Power-up Types:** The PowerUp class has a type property, allowing for easy addition of new power-up effects beyond just "health".

### 3.5. Maintainability:

**NFR-MAIN-001: Code Readability:** Code should be well-commented and organized (the provided code has comments and structure).

**NFR-MAIN-002: Centralized Constants:** Game parameters (damage, speed, etc.) are defined as constants for easy tuning.

**NFR-MAIN-003: Event System:** An eventManager is used for decoupling event dispatch and handling (e.g., playerDefeated).

## 4. Technical Requirements (Derived from Implementation)

### 4.1. Platform:
The application is a web browser-based game.
It must run on modern web browsers that support HTML5 Canvas and JavaScript ES6 features.

### 4.2. Dependencies:

**TR-DEP-001: Tailwind CSS:** The application uses Tailwind CSS for styling, loaded via CDN. Internet connectivity is required for the CDN to function unless a local copy is used.

**TR-DEP-002: No External Game Engines:** The game logic is custom-built using JavaScript and the HTML5 Canvas API, without external game engines or libraries beyond Tailwind CSS.