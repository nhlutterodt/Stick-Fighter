// Stickman class for 2D Stick Fighter (feature-rich, ES module)
// Dependencies: Import or provide ctx, constants, eventManager, updateHealthBars, checkRectCollision, HitSpark, etc. in your main entry point or as needed.

import * as controls from '../game/controls.js';
import { obstacles, checkObstacleCollision } from './obstacles.js';

export class Stickman {
    constructor(x, y, colors, isPlayer1, controls = null, isNPC = false, aiType = null) {
        // Position and movement
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.velocityX = 0;
        this.velocityY = 0;
        this.width = STICKMAN_WIDTH;
        this.height = STICKMAN_HEIGHT;
        this.yBase = y;
        this.facingRight = isPlayer1;
        this.isRunning = false;
        this.isJumping = false;
        this.mass = STICKMAN_MASS;
        this.lineWidth = 6;

        // Controls and AI
        this.isNPC = isNPC;
        this.controls = controls;
        this.aiType = aiType;
        this.aiActionCooldown = 0;
        this.aiDecisionIntervalBase = 600;
        this.aiPreferredDistance = 180;
        this.aiBaseAttackProb = 0.18;
        this.aiBaseGuardProb = 0.13;
        this.aiBaseParryProb = 0.08;
        this.aiBaseJumpProb = 0.07;
        this.aiTargetX = null;
        this.aiWantsToAttack = false;
        this.aiWantsToGuard = false;
        this.aiWantsToParry = false;
        this.aiWantsToJump = false;

        // State
        this.isGuarding = false;
        this.isParrying = false;
        this.isDodging = false;
        this.isAttacking = false;
        this.isPerformingSpecialMove = false;
        this.specialMoveType = null;
        this.attackType = null;
        this.attackTimer = 0;
        this.groundSlamImpactDone = false;
        this.hitStunTimer = 0;
        this.dodgeTimer = 0;
        this.dodgeCooldownTimer = 0;
        this.parryTimer = 0;
        this.parryCooldownTimer = 0;
        this.parryFailedVulnTimer = 0;
        this.comboState = { count: 0, lastAttackTime: 0, lastAttackType: null };

        // Health and limbs
        this.health = PLAYER_HEALTH_MAX;
        this.limbImpairDuration = LIMB_IMPAIR_DURATION;
        this.limbs = {
            leftUpperArm: { impairedTimer: 0 },
            leftLowerArm: { impairedTimer: 0 },
            rightUpperArm: { impairedTimer: 0 },
            rightLowerArm: { impairedTimer: 0 },
            leftUpperLeg: { impairedTimer: 0 },
            leftLowerLeg: { impairedTimer: 0 },
            rightUpperLeg: { impairedTimer: 0 },
            rightLowerLeg: { impairedTimer: 0 }
        };
        this.colors = colors;
        this.limbSegmentLength = STICKMAN_LIMB_LENGTH;

        // Animation
        this.walkCycleTime = 0;
        this.leftFootPlantedX = null;
        this.rightFootPlantedX = null;
        this.activeProceduralAnimation = null;
        this.currentAngles = this.defaultAngles();
        this.targetAngles = this.defaultAngles();
    }

    defaultAngles() {
        return {
            leftShoulderZ: 0, rightShoulderZ: 0,
            leftElbowZ: 0, rightElbowZ: 0,
            leftHipZ: 0, rightHipZ: 0,
            leftKneeZ: 0, rightKneeZ: 0
        };
    }

    getJointPositions() {
        // Implement joint position calculation based on angles, x, y, and limbSegmentLength
        // ...existing code or placeholder...
        return {};
    }

    getLimbColor(limb) {
        return this.colors[limb] || '#000';
    }

    getLimbHitboxes() {
        const joints = this.getJointPositions();
        const hitboxes = {};
        const p = LIMB_HITBOX_PADDING;
        hitboxes.head = { type: 'circle', cx: joints.head?.cx, cy: joints.head?.cy, radius: (joints.head?.radius || 0) + p };
        const createSegmentAABB = (p1, p2) => ({
            type: 'rect',
            x: Math.min(p1.x, p2.x) - p,
            y: Math.min(p1.y, p2.y) - p,
            width: Math.abs(p1.x - p2.x) + 2 * p,
            height: Math.abs(p1.y - p2.y) + 2 * p
        });
        hitboxes.torso = createSegmentAABB(joints.neck, joints.hip);
        if (this.facingRight) {
            hitboxes.rightUpperArm = createSegmentAABB(joints.rightShoulder, joints.rightElbow);
            hitboxes.rightLowerArm = createSegmentAABB(joints.rightElbow, joints.rightHand);
            hitboxes.leftUpperArm = createSegmentAABB(joints.leftShoulder, joints.leftElbow);
            hitboxes.leftLowerArm = createSegmentAABB(joints.leftElbow, joints.leftHand);
            hitboxes.rightUpperLeg = createSegmentAABB(joints.hip, joints.rightKnee);
            hitboxes.rightLowerLeg = createSegmentAABB(joints.rightKnee, joints.rightFoot);
            hitboxes.leftUpperLeg = createSegmentAABB(joints.hip, joints.leftKnee);
            hitboxes.leftLowerLeg = createSegmentAABB(joints.leftKnee, joints.leftFoot);
        } else {
            hitboxes.leftUpperArm = createSegmentAABB(joints.leftShoulder, joints.leftElbow);
            hitboxes.leftLowerArm = createSegmentAABB(joints.leftElbow, joints.leftHand);
            hitboxes.rightUpperArm = createSegmentAABB(joints.rightShoulder, joints.rightElbow);
            hitboxes.rightLowerArm = createSegmentAABB(joints.rightElbow, joints.rightHand);
            hitboxes.leftUpperLeg = createSegmentAABB(joints.hip, joints.leftKnee);
            hitboxes.leftLowerLeg = createSegmentAABB(joints.leftKnee, joints.leftFoot);
            hitboxes.rightUpperLeg = createSegmentAABB(joints.hip, joints.rightKnee);
            hitboxes.rightLowerLeg = createSegmentAABB(joints.rightKnee, joints.rightFoot);
        }
        for (const key in hitboxes) {
            if (hitboxes[key].type === 'rect') {
                if (hitboxes[key].width < 2 * p) hitboxes[key].width = 2 * p;
                if (hitboxes[key].height < 2 * p) hitboxes[key].height = 2 * p;
            }
        }
        return hitboxes;
    }

    draw(ctx) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = this.lineWidth;
        const joints = this.getJointPositions();
        // Draw torso
        ctx.strokeStyle = this.getLimbColor('torso');
        ctx.beginPath();
        ctx.moveTo(joints.neck?.x, joints.neck?.y);
        ctx.lineTo(joints.hip?.x, joints.hip?.y);
        ctx.stroke();
        // Draw head
        ctx.fillStyle = this.getLimbColor('head');
        ctx.beginPath();
        ctx.arc(joints.head?.cx, joints.head?.cy, joints.head?.radius || 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.colors.headOutline || '#000';
        ctx.stroke();
        // Draw arms and legs (left/right, upper/lower)
        ctx.strokeStyle = this.getLimbColor('leftUpperArm');
        ctx.beginPath();
        ctx.moveTo(joints.leftShoulder.x, joints.leftShoulder.y);
        ctx.lineTo(joints.leftElbow.x, joints.leftElbow.y);
        ctx.stroke();
        ctx.strokeStyle = this.getLimbColor('leftLowerArm');
        ctx.beginPath();
        ctx.moveTo(joints.leftElbow.x, joints.leftElbow.y);
        ctx.lineTo(joints.leftHand.x, joints.leftHand.y);
        ctx.stroke();
        ctx.strokeStyle = this.getLimbColor('rightUpperArm');
        ctx.beginPath();
        ctx.moveTo(joints.rightShoulder.x, joints.rightShoulder.y);
        ctx.lineTo(joints.rightElbow.x, joints.rightElbow.y);
        ctx.stroke();
        ctx.strokeStyle = this.getLimbColor('rightLowerArm');
        ctx.beginPath();
        ctx.moveTo(joints.rightElbow.x, joints.rightElbow.y);
        ctx.lineTo(joints.rightHand.x, joints.rightHand.y);
        ctx.stroke();
        ctx.strokeStyle = this.getLimbColor('leftUpperLeg');
        ctx.beginPath();
        ctx.moveTo(joints.hip.x, joints.hip.y);
        ctx.lineTo(joints.leftKnee.x, joints.leftKnee.y);
        ctx.stroke();
        ctx.strokeStyle = this.getLimbColor('leftLowerLeg');
        ctx.beginPath();
        ctx.moveTo(joints.leftKnee.x, joints.leftKnee.y);
        ctx.lineTo(joints.leftFoot.x, joints.leftFoot.y);
        ctx.stroke();
        ctx.strokeStyle = this.getLimbColor('rightUpperLeg');
        ctx.beginPath();
        ctx.moveTo(joints.hip.x, joints.hip.y);
        ctx.lineTo(joints.rightKnee.x, joints.rightKnee.y);
        ctx.stroke();
        ctx.strokeStyle = this.getLimbColor('rightLowerLeg');
        ctx.beginPath();
        ctx.moveTo(joints.rightKnee.x, joints.rightKnee.y);
        ctx.lineTo(joints.rightFoot.x, joints.rightFoot.y);
        ctx.stroke();
        // Draw special move effect if needed
        if (this.specialMoveType === 'groundSlam' && this.y >= GROUND_LEVEL - this.height / 2 - 5 && !this.groundSlamImpactDone) {
            ctx.strokeStyle = 'rgba(100, 100, 100, 0.7)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(this.x, GROUND_LEVEL, (i + 1) * 15, Math.PI, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    // --- Animation and Movement ---
    solveLegIK(targetX, targetY, isLeftLeg) {
        // ...implement inverse kinematics for leg...
    }
    updateTargetAngles() {
        // ...update target angles for animation...
    }
    applyProceduralAnimation(baseArmAngle, baseElbowAngle, baseHipAngle, baseKneeAngle) {
        // ...implement procedural animation logic...
    }
    applyDodgingAngles() { /* ...as before... */ }
    applyParryAngles() { /* ...as before... */ }
    applyHitStunAngles() { /* ...as before... */ }
    applyGuardAngles() { /* ...as before... */ }
    applySpecialMoveAngles() { /* ...as before... */ }
    applyWalkingAngles(dir, baseArmAngle, baseElbowAngle) { /* ...as before... */ }
    applyIdleAngles(dir, baseArmAngle, baseElbowAngle) { /* ...as before... */ }

    // --- Game Logic ---
    update(opponent, ctx, gameState) {
        // ...implement update logic, including movement, AI, health, attacks, etc...
    }
    canAct() {
        return this.hitStunTimer <= 0 && this.parryFailedVulnTimer <= 0 && !this.isDodging && !this.isParrying && !this.isAttacking && !this.isPerformingSpecialMove && !this.activeProceduralAnimation;
    }
    canMove() {
        return !this.isGuarding && !this.isParrying && !(this.isPerformingSpecialMove && this.specialMoveType === 'groundSlam') && !this.activeProceduralAnimation && this.hitStunTimer <= 0 && this.parryFailedVulnTimer <= 0 && !this.isDodging;
    }
    canChangeFacing() {
        return !this.isAttacking && !this.isPerformingSpecialMove && !this.activeProceduralAnimation && this.hitStunTimer <= 0 && this.parryFailedVulnTimer <= 0 && !this.isParrying && !this.isDodging && !this.isGuarding;
    }
    turnAround() {
        if (!this.canChangeFacing()) return;
        this.facingRight = !this.facingRight;
        this.walkCycleTime += Math.PI;
        [this.leftFootPlantedX, this.rightFootPlantedX] = [this.rightFootPlantedX, this.leftFootPlantedX];
        if (Math.abs(this.velocityX) < 0.01) {
            this.leftFootPlantedX = this.rightFootPlantedX = null;
        }
        // Flip limb angles to match new facing direction
        [this.currentAngles.leftShoulderZ, this.currentAngles.rightShoulderZ] = [-this.currentAngles.rightShoulderZ, -this.currentAngles.leftShoulderZ];
        [this.currentAngles.leftElbowZ, this.currentAngles.rightElbowZ] = [this.currentAngles.rightElbowZ, this.currentAngles.leftElbowZ];
        [this.currentAngles.leftHipZ, this.currentAngles.rightHipZ] = [-this.currentAngles.rightHipZ, -this.currentAngles.leftHipZ];
        [this.currentAngles.leftKneeZ, this.currentAngles.rightKneeZ] = [this.currentAngles.rightKneeZ, this.currentAngles.leftKneeZ];
        // Also update target angles to match
        [this.targetAngles.leftShoulderZ, this.targetAngles.rightShoulderZ] = [-this.targetAngles.rightShoulderZ, -this.targetAngles.leftShoulderZ];
        [this.targetAngles.leftElbowZ, this.targetAngles.rightElbowZ] = [this.targetAngles.rightElbowZ, this.targetAngles.leftElbowZ];
        [this.targetAngles.leftHipZ, this.targetAngles.rightHipZ] = [-this.targetAngles.rightHipZ, -this.targetAngles.leftHipZ];
        [this.targetAngles.leftKneeZ, this.targetAngles.rightKneeZ] = [this.targetAngles.rightKneeZ, this.targetAngles.leftKneeZ];
    }
    jump(force) {
        if (!this.isJumping) {
            this.velocityY = force;
            this.isJumping = true;
        }
    }
    initiateAttack(attackType, opponent) {
        if (this.canAct()) {
            this.isAttacking = true;
            this.attackType = attackType;
            this.attackTimer = ATTACK_DURATION;
            this.activeProceduralAnimation = {
                type: attackType,
                startTime: Date.now(),
                duration: ATTACK_DURATION,
                startAngles: { ...this.currentAngles }
            };
            if (this.isJumping && attackType === 'punch') {
                this.isPerformingSpecialMove = true;
                this.specialMoveType = 'flyingKick';
                this.attackTimer = SPECIAL_ATTACK_DURATION;
            }
            this.checkHit(opponent);
        }
    }
    initiateSpecialMove(moveType, opponent) {
        if (this.canAct() && this.isJumping) {
            this.isPerformingSpecialMove = true;
            this.specialMoveType = moveType;
            this.attackTimer = SPECIAL_ATTACK_DURATION;
            if (moveType === 'groundSlam') {
                this.velocityY = GROUND_SLAM_FORCE;
                this.groundSlamImpactDone = false;
            }
            this.checkHit(opponent);
        }
    }
    initiateParry() {
        if (this.canAct() && this.parryCooldownTimer <= 0) {
            this.isParrying = true;
            this.parryTimer = PARRY_DURATION;
            this.parryCooldownTimer = PARRY_COOLDOWN;
        }
    }
    initiateAirDodge(dx, dy) {
        if (this.canAct() && this.isJumping && this.dodgeCooldownTimer <= 0) {
            this.isDodging = true;
            this.dodgeTimer = AIR_DODGE_DURATION;
            this.dodgeCooldownTimer = AIR_DODGE_COOLDOWN;
            this.velocityX += dx * AIR_DODGE_FORCE;
            this.velocityY += dy * AIR_DODGE_FORCE;
        }
    }
    checkHit(opponent) {
        // ...implement hit detection and effects...
    }
    takeDamage(damage, attacker) {
        // ...implement damage logic, limb impairment, health update, win/lose event...
    }
    getHitLimbs(attacker) {
        // ...implement limb hit detection...
        return ['torso'];
    }
    facingTowards(opponent) {
        return (this.facingRight && opponent.x > this.x) || (!this.facingRight && opponent.x < this.x);
    }
    getAttackRange() {
        if (this.specialMoveType === 'flyingKick') return FLYING_KICK_RANGE;
        if (this.specialMoveType === 'groundSlam') return GROUND_SLAM_AOE_RANGE;
        if (this.attackType === 'punch') return PUNCH_RANGE;
        if (this.attackType === 'kick') return KICK_RANGE;
        return 0;
    }
    getDamage() {
        if (this.specialMoveType === 'flyingKick') return FLYING_KICK_DAMAGE;
        if (this.specialMoveType === 'groundSlam') return GROUND_SLAM_DAMAGE;
        if (this.attackType === 'punch') return PUNCH_DAMAGE;
        if (this.attackType === 'kick') return KICK_DAMAGE;
        return 0;
    }
    getKnockback() {
        let multiplier = this.isPerformingSpecialMove ? KNOCKBACK_SPECIAL_MULTIPLIER : 1;
        return { x: KNOCKBACK_BASE_X * multiplier, y: KNOCKBACK_BASE_Y * multiplier };
    }
    updateComboState() {
        const now = Date.now();
        if (now - this.comboState.lastAttackTime <= COMBO_WINDOW && this.comboState.lastAttackType === this.attackType) {
            this.comboState.count++;
        } else {
            this.comboState.count = 1;
        }
        this.comboState.lastAttackTime = now;
        this.comboState.lastAttackType = this.attackType;
    }
    handleParrySuccess(opponent) {
        opponent.hitStunTimer = HIT_STUN_DURATION_HEAVY * PARRY_SUCCESS_STUN_MULTIPLIER;
        this.parryFailedVulnTimer = PARRY_FAIL_VULNERABLE_DURATION;
    }
    handleGroundSlamImpact(opponent) {
        if (this.groundSlamImpactDone) return;
        this.groundSlamImpactDone = true;
        const distance = Math.abs(this.x - opponent.x);
        if (distance <= GROUND_SLAM_AOE_RANGE) {
            opponent.takeDamage(GROUND_SLAM_DAMAGE, this);
            opponent.velocityY = KNOCKBACK_BASE_Y * 2;
            opponent.hitStunTimer = HIT_STUN_DURATION_HEAVY;
            // Add hit spark effect here if needed
        }
    }
    // --- AI ---
    aiDecideAction(opponent) {
        if (!opponent) return;
        const distance = Math.abs(this.x - opponent.x);
        this.aiActionCooldown = this.aiDecisionIntervalBase + Math.random() * 200;
        if (distance < this.aiPreferredDistance * 0.7) {
            this.aiTargetX = opponent.x > this.x ? this.x - 100 : this.x + 100;
        } else if (distance > this.aiPreferredDistance * 1.3) {
            this.aiTargetX = opponent.x;
        } else {
            this.aiTargetX = this.x;
        }
        this.aiWantsToAttack = Math.random() < this.aiBaseAttackProb * (this.aiPreferredDistance / Math.max(distance, 1));
        this.aiWantsToGuard = Math.random() < this.aiBaseGuardProb;
        this.aiWantsToParry = Math.random() < this.aiBaseParryProb;
        this.aiWantsToJump = Math.random() < this.aiBaseJumpProb;
    }
    aiExecuteAction(opponent, maxSpeed) {
        if (this.aiTargetX !== null) {
            const direction = this.aiTargetX > this.x ? 1 : -1;
            this.velocityX = Math.min(Math.abs(this.velocityX) + BASE_PLAYER_ACCELERATION, maxSpeed) * direction;
            if (Math.abs(this.x - this.aiTargetX) < 10) this.aiTargetX = null;
        }
        if (this.aiWantsToAttack && this.canAct()) {
            const attackType = Math.random() < 0.5 ? 'punch' : 'kick';
            this.initiateAttack(attackType, opponent);
            this.aiWantsToAttack = false;
        }
        if (this.aiWantsToGuard && this.canAct()) {
            this.isGuarding = true;
        }
        if (this.aiWantsToParry && this.canAct()) {
            this.initiateParry();
            this.aiWantsToParry = false;
        }
        if (this.aiWantsToJump && !this.isJumping && this.canAct()) {
            this.jump(JUMP_FORCE);
            this.aiWantsToJump = false;
        }
    }
}

// Example integration for stickman.js (if not already modularized):
// import { Stickman } from './stickman.js';
// ...
// In your main entry point or game setup, pass controls to modules that need input state or combos.
// For example, in stickman.js or player logic:
//
// function handlePlayerInput(player, controlsModule = controls) {
//     const actions = controlsModule.getPressedActions(player);
//     // Use actions array to drive movement, attacks, etc.
//     // Optionally, listen for combos:
//     controlsModule.setComboCallback(comboSequence => {
//         // Handle combo for this player
//     });
// }

// Example: Stickman can query obstacles for AI or movement decisions
export function getObstacleDecisionContext(stickman) {
  // Returns the closest relevant obstacle description for the stickman
  const stickRect = {
    x: stickman.x - stickman.width / 2,
    y: stickman.y - stickman.height,
    width: stickman.width,
    height: stickman.height,
    facingRight: stickman.facingRight
  };
  // Find obstacles in front (within 1.5x width)
  const range = stickman.width * 1.5;
  const facingRight = stickman.facingRight !== false;
  const probeRect = {
    x: facingRight ? stickRect.x + stickRect.width : stickRect.x - range,
    y: stickRect.y,
    width: range,
    height: stickRect.height
  };
  const obs = obstacles.find(o => checkObstacleCollision(probeRect));
  return obs ? obs.describe() : null;
}