import * as THREE from 'three';

export class Fighter3D {
  constructor(scene, isPlayer = true) {
    this.scene = scene;
    this.isPlayer = isPlayer;
    this.themeColor = isPlayer ? 0x00f3ff : 0xff0055;
    this.secondaryColor = isPlayer ? 0x0066ff : 0xaa0033;
    this.accentColor = isPlayer ? 0x70ffff : 0xff7799;

    this.baseX = isPlayer ? -1.6 : 1.6;
    this.facing = isPlayer ? 1 : -1;

    this.group = new THREE.Group();
    this.group.position.set(this.baseX, 0, 0);
    this.group.rotation.y = this.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
    this.scene.add(this.group);

    // Animation state
    this.currentAction = 'idle'; // idle, jab, cross, kick, block, dodge_left, dodge_right, special, hit, ko
    this.actionTime = 0;
    this.actionDuration = 0.35;
    this.idleTime = Math.random() * 5;
    this.pushbackOffset = 0;
    this.isBlocking = false;
    this.isDodging = false;
    this.dodgeSide = 0; // -1 left, 1 right

    this.buildMesh();
  }

  buildMesh() {
    const armorColor = this.isPlayer ? 0x1e3a8a : 0x881337;
    const plateColor = this.isPlayer ? 0x00f3ff : 0xff2255;
    
    const armorMat = new THREE.MeshStandardMaterial({
      color: armorColor,
      roughness: 0.25,
      metalness: 0.7
    });
    const plateMat = new THREE.MeshStandardMaterial({
      color: plateColor,
      roughness: 0.15,
      metalness: 0.8
    });
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.5
    });
    const neonMat = new THREE.MeshBasicMaterial({
      color: this.themeColor
    });
    const visorMat = new THREE.MeshBasicMaterial({
      color: this.accentColor
    });

    // Root node
    this.root = new THREE.Group();
    this.root.position.y = 0;
    this.group.add(this.root);

    // YOU Holographic Floating Marker for Player
    if (this.isPlayer) {
      const markerGeo = new THREE.ConeGeometry(0.12, 0.22, 4);
      markerGeo.rotateX(Math.PI);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
      this.marker = new THREE.Mesh(markerGeo, markerMat);
      this.marker.position.set(0, 2.1, 0);
      this.group.add(this.marker);
    }

    // Hips / Pelvis
    this.pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.24, 0.30), armorMat);
    this.pelvis.position.y = 0.95;
    this.root.add(this.pelvis);

    // Torso & Chest
    this.torso = new THREE.Group();
    this.torso.position.set(0, 0.12, 0);
    this.pelvis.add(this.torso);

    const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.32), armorMat);
    chestMesh.position.y = 0.26;
    this.torso.add(chestMesh);

    // Chest Neon Core
    const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16), neonMat);
    coreMesh.rotation.x = Math.PI / 2;
    coreMesh.position.set(0, 0.28, 0.17);
    this.torso.add(coreMesh);

    // Neck & Head
    this.head = new THREE.Group();
    this.head.position.set(0, 0.52, 0);
    this.torso.add(this.head);

    const helmetMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), armorMat);
    helmetMesh.position.y = 0.16;
    this.head.add(helmetMesh);

    // Cyber Visor
    const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.06), visorMat);
    visorMesh.position.set(0, 0.18, 0.13);
    this.head.add(visorMesh);

    // --- ARMS ---
    // Right Shoulder & Arm (Front / Jab Hand)
    this.rightArm = this.createArm(0.28, armorMat, jointMat, neonMat, true);
    this.torso.add(this.rightArm.shoulderGroup);

    // Left Shoulder & Arm (Back / Cross Hand)
    this.leftArm = this.createArm(-0.28, armorMat, jointMat, neonMat, false);
    this.torso.add(this.leftArm.shoulderGroup);

    // --- LEGS ---
    // Right Leg
    this.rightLeg = this.createLeg(0.14, armorMat, jointMat, neonMat);
    this.pelvis.add(this.rightLeg.hipGroup);

    // Left Leg
    this.leftLeg = this.createLeg(-0.14, armorMat, jointMat, neonMat);
    this.pelvis.add(this.leftLeg.hipGroup);

    // --- Energy Shield for Block ---
    const shieldGeo = new THREE.RingGeometry(0.3, 0.65, 6);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: this.themeColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.set(0, 1.4, 0.5);
    this.group.add(this.shieldMesh);

    // Shadow blob
    const shadowGeo = new THREE.CircleGeometry(0.48, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5
    });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.position.y = 0.02;
    this.group.add(this.shadow);
  }

  createArm(offsetX, armorMat, jointMat, neonMat, isRight) {
    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.set(offsetX, 0.42, 0);

    // Pauldron
    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.18), armorMat);
    shoulderGroup.add(pauldron);

    // Upper Arm
    const bicep = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.28, 8), jointMat);
    bicep.position.y = -0.16;
    shoulderGroup.add(bicep);

    // Forearm Group (Elbow joint)
    const elbowGroup = new THREE.Group();
    elbowGroup.position.set(0, -0.3, 0);
    shoulderGroup.add(elbowGroup);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.12), armorMat);
    forearm.position.y = -0.14;
    elbowGroup.add(forearm);

    // Glove / Fist
    const fistGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const fistMat = new THREE.MeshStandardMaterial({
      color: 0x222a38,
      roughness: 0.2,
      metalness: 0.9
    });
    const fist = new THREE.Mesh(fistGeo, fistMat);
    fist.position.y = -0.3;
    elbowGroup.add(fist);

    // Glowing Knuckle Strip
    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.04), neonMat);
    knuckle.position.set(0, -0.3, 0.07);
    elbowGroup.add(knuckle);

    return { shoulderGroup, elbowGroup, fist, isRight };
  }

  createLeg(offsetX, armorMat, jointMat, neonMat) {
    const hipGroup = new THREE.Group();
    hipGroup.position.set(offsetX, -0.05, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.38, 8), jointMat);
    thigh.position.y = -0.19;
    hipGroup.add(thigh);

    const kneeGroup = new THREE.Group();
    kneeGroup.position.set(0, -0.38, 0);
    hipGroup.add(kneeGroup);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.15), armorMat);
    shin.position.y = -0.21;
    kneeGroup.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.24), armorMat);
    boot.position.set(0, -0.42, 0.05);
    kneeGroup.add(boot);

    return { hipGroup, kneeGroup };
  }

  triggerAction(actionName, duration = 0.35, side = 0) {
    if (this.currentAction === 'ko') return;
    this.currentAction = actionName;
    this.actionTime = 0;
    this.actionDuration = duration;
    this.dodgeSide = side;

    if (actionName === 'block') {
      this.isBlocking = true;
    } else {
      this.isBlocking = false;
    }

    if (actionName === 'dodge_left' || actionName === 'dodge_right') {
      this.isDodging = true;
    } else {
      this.isDodging = false;
    }
  }

  applyHitPushback(amount = 0.35) {
    this.pushbackOffset = amount;
    this.triggerAction('hit', 0.25);
  }

  update(delta) {
    this.idleTime += delta;

    // Reset blocking/dodging states if action finishes
    if (this.currentAction !== 'idle') {
      this.actionTime += delta;
      if (this.actionTime >= this.actionDuration) {
        if (this.currentAction !== 'ko') {
          this.currentAction = 'idle';
          this.isBlocking = false;
          this.isDodging = false;
        }
      }
    }

    // Pushback decay
    if (this.pushbackOffset > 0) {
      this.pushbackOffset = Math.max(0, this.pushbackOffset - delta * 1.8);
    }
    const targetX = this.baseX - this.facing * this.pushbackOffset;
    this.group.position.x += (targetX - this.group.position.x) * Math.min(1, delta * 12);

    // Shield glow on block
    const targetShieldOpacity = this.isBlocking ? 0.75 : 0.0;
    this.shieldMesh.material.opacity += (targetShieldOpacity - this.shieldMesh.material.opacity) * Math.min(1, delta * 15);
    this.shieldMesh.rotation.z += delta * 1.5;

    // Animate player YOU marker
    if (this.marker) {
      this.marker.position.y = 2.05 + Math.sin(this.idleTime * 4.5) * 0.06;
      this.marker.rotation.y += delta * 2.0;
    }

    // Compute progress of current action [0, 1]
    const p = Math.min(1, this.actionTime / this.actionDuration);

    this.animate(delta, p);
  }

  animate(delta, p) {
    const idleT = this.idleTime * 4.5;
    const idleBounce = Math.sin(idleT) * 0.035;

    // Base Reset
    this.pelvis.position.y = 0.95 + idleBounce;
    this.torso.rotation.set(0, 0, 0);
    this.torso.position.set(0, 0.12, 0);
    this.head.rotation.set(0, 0, 0);

    // Guard Idle Pose
    let rShX = -0.55 + Math.sin(idleT) * 0.05;
    let rElbX = -1.1;
    let lShX = -0.65 - Math.cos(idleT) * 0.05;
    let lElbX = -1.25;

    let rHipX = 0.15;
    let rKneeX = -0.15;
    let lHipX = -0.15;
    let lKneeX = 0.15;

    if (this.currentAction === 'idle') {
      // Natural fighting bounce
      this.torso.rotation.y = Math.sin(idleT * 0.5) * 0.06;
      this.head.rotation.y = -Math.sin(idleT * 0.5) * 0.06;
    } else if (this.currentAction === 'jab') {
      // Fast Right Hand Punch
      const punchPhase = Math.sin(p * Math.PI);
      rShX = THREE.MathUtils.lerp(-0.55, -1.6, punchPhase);
      rElbX = THREE.MathUtils.lerp(-1.1, -0.05, punchPhase);
      this.torso.rotation.y = THREE.MathUtils.lerp(0, 0.35, punchPhase);
      this.torso.position.z = punchPhase * 0.15;
    } else if (this.currentAction === 'cross') {
      // Powerful Left Hand Punch
      const punchPhase = Math.sin(p * Math.PI);
      lShX = THREE.MathUtils.lerp(-0.65, -1.65, punchPhase);
      lElbX = THREE.MathUtils.lerp(-1.25, -0.05, punchPhase);
      this.torso.rotation.y = THREE.MathUtils.lerp(0, -0.45, punchPhase);
      this.torso.position.z = punchPhase * 0.22;
    } else if (this.currentAction === 'kick') {
      // Heavy Front / Round Kick
      const kickPhase = Math.sin(p * Math.PI);
      rHipX = THREE.MathUtils.lerp(0.15, -1.5, kickPhase);
      rKneeX = THREE.MathUtils.lerp(-0.15, 0.8, kickPhase);
      this.torso.rotation.x = THREE.MathUtils.lerp(0, 0.25, kickPhase);
      this.pelvis.position.y = 0.95 + kickPhase * 0.15;
    } else if (this.currentAction === 'block') {
      // Both hands tight in front of face
      rShX = -1.2;
      rElbX = -1.75;
      lShX = -1.25;
      lElbX = -1.75;
      this.torso.rotation.x = -0.15;
    } else if (this.currentAction === 'dodge_left' || this.currentAction === 'dodge_right') {
      // Lateral evasion lean
      const dir = this.dodgeSide !== 0 ? this.dodgeSide : (this.currentAction === 'dodge_left' ? -1 : 1);
      const dodgePhase = Math.sin(p * Math.PI);
      this.torso.rotation.z = dir * dodgePhase * 0.45;
      this.pelvis.position.x = dir * dodgePhase * 0.25;
    } else if (this.currentAction === 'special') {
      // Overhead slam
      if (p < 0.45) {
        // Raise arms high
        const raisePhase = p / 0.45;
        rShX = THREE.MathUtils.lerp(-0.55, -2.8, raisePhase);
        lShX = THREE.MathUtils.lerp(-0.65, -2.8, raisePhase);
        rElbX = -0.2;
        lElbX = -0.2;
        this.torso.rotation.x = 0.2 * raisePhase;
      } else {
        // Slam downward
        const slamPhase = Math.min(1, (p - 0.45) / 0.35);
        rShX = THREE.MathUtils.lerp(-2.8, -0.6, slamPhase);
        lShX = THREE.MathUtils.lerp(-2.8, -0.6, slamPhase);
        rElbX = -0.1;
        lElbX = -0.1;
        this.torso.position.z = THREE.MathUtils.lerp(0, 0.4, slamPhase);
        this.torso.rotation.x = THREE.MathUtils.lerp(0.2, -0.4, slamPhase);
      }
    } else if (this.currentAction === 'hit') {
      // Flinch back
      const hitPhase = Math.sin(p * Math.PI);
      this.torso.rotation.x = 0.3 * hitPhase;
      this.head.rotation.x = 0.4 * hitPhase;
      this.pelvis.position.y = 0.95 - 0.08 * hitPhase;
    } else if (this.currentAction === 'ko') {
      // Knockout collapse
      const koPhase = Math.min(1, this.actionTime / 1.5);
      this.group.rotation.x = koPhase * (Math.PI / 2);
      this.group.position.y = -koPhase * 0.6;
    }

    // Apply computed angles
    this.rightArm.shoulderGroup.rotation.x = rShX;
    this.rightArm.elbowGroup.rotation.x = rElbX;
    this.leftArm.shoulderGroup.rotation.x = lShX;
    this.leftArm.elbowGroup.rotation.x = lElbX;

    this.rightLeg.hipGroup.rotation.x = rHipX;
    this.rightLeg.kneeGroup.rotation.x = rKneeX;
    this.leftLeg.hipGroup.rotation.x = lHipX;
    this.leftLeg.kneeGroup.rotation.x = lKneeX;
  }
}
