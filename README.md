# 🥊 Motion-Strike

**Motion-Strike** is a next-generation browser-based 3D combat sports game powered by **Webcam Computer Vision**, **MediaPipe Pose Estimation**, and **Three.js**. It turns your real-world body movements into responsive, close-quarters combat strikes and defensive maneuvers in real-time.

---

## ⚡ Key Features

- **🎮 Real-Time Webcam Motion Tracking**: Uses Google MediaPipe Pose to track 33 3D skeletal landmarks at up to 60 FPS without special sensors or hardware.
- **🥊 Close-Quarters "Pocket" Combat**: Fighters engage in authentic in-fighting range (0.92m spacing), creating intense toe-to-toe battles where punches land directly on the opponent's face, chin, and ribs.
- **🥋 Authentic Boxing Kinematics & Orthodox Stance**:
  - **Lead Jab**: Fast piston punch with shoulder roll and fist pronation.
  - **Power Cross**: Full kinetic chain rotating the rear foot, hips, and shoulders flush into the opponent's jaw.
  - **Muay Thai Kick**: Support foot pivot and complete hip turnover striking the ribs and midsection.
  - **Rising Uppercut Special**: Low pocket slip exploding upward into a devastating chin-shattering finisher.
  - **Peek-a-Boo Guard**: Tight forearm earmuff shield absorbing 70% of incoming damage.
  - **Slips & Rolls**: Bob and weave under punches to leave opponents open for counter-attacks.
- **💥 Realistic Impact VFX & Hit Physics**:
  - Directional cervical head snap and rotational jaw whip on impact.
  - High-velocity sweat droplet spray arcing away from heavy punches.
  - Contact flashes, floor shockwaves, and impact sparks.
  - Hit-stop (micro-freeze frames) for heavy, tactile striking feel.
- **🤖 Tactical & Reactive CPU AI**: Reacts dynamically to player strikes with realistic block percentages, slip-counters, and 1-2 punch combos.
- **🔊 Procedural Web Audio Engine**: Zero external audio files—uses the Web Audio API to synthesize low-end punch thuds, leather cracks, whooshes, and metallic block clangs in real time.
- **🎥 Cinematic Ringside Broadcast Camera**: Low-angle dynamic framing with trauma screen shake and punch action zoom.
- **⌨️ Dual Control Scheme**: Play physically via webcam or test with keyboard shortcuts.

---

## 🔄 End-to-End Game Pipeline

The game operates on a continuous, multi-stage pipeline connecting real-time computer vision to 3D rendering and combat state management:

```
 ┌────────────────────────────────────────────────────────┐
 │                   1. VISION & INPUT                    │
 │  Webcam (getUserMedia) ──> MediaPipe Pose ML Engine    │
 └───────────────────────────┬────────────────────────────┘
                             │ (33 3D Skeleton Landmarks @ 60fps)
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │               2. GESTURE & KINEMATICS                  │
 │  GestureEngine: Velocity, Angles & Lean Tracking       │
 │  [Jab, Cross, Kick, Block, Slip / Dodge, Special]      │
 └───────────────────────────┬────────────────────────────┘
                             │ (Classified Moves & Body Lean Vector)
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │                3. COMBAT STATE MACHINE                 │
 │  CombatEngine <─── Tactical AI (CpuOpponent)           │
 │  • Hit detection & Contact calculation                 │
 │  • Block absorption (70%) & Dodge evasion              │
 │  • Health, Special Meters, Pushback, Hit-Stop          │
 └─────────────┬────────────────────────────┬─────────────┘
               │                            │
               ▼                            ▼
 ┌───────────────────────────┐  ┌─────────────────────────┐
 │   4. 3D GRAPHICS (WebGL)  │  │   5. SYNTHESIZED AUDIO  │
 │  Three.js Engine          │  │  Web Audio API Engine   │
 │  • Orthodox Rigged Models │  │  • Sub-bass Thuds       │
 │  • Dynamic Pocket Camera  │  │  • Whooshes & Clangs    │
 │  • Sweat & Flash VFX      │  │  • Ring Bells & Impacts │
 └─────────────┬─────────────┘  └─────────────────────────┘
               │
               ▼
 ┌────────────────────────────────────────────────────────┐
 │                   6. HUD & OVERLAY                     │
 │  Health Bars, Special Meters, PiP Skeleton Canvas      │
 └────────────────────────────────────────────────────────┘
```

### Pipeline Breakdown:

1. **Vision & Capture Layer (`src/motion/tracker.js`)**:
   - Captures high-frame-rate video streams via HTML5 `getUserMedia`.
   - Google MediaPipe Pose processes frames through WebAssembly/WebGL to infer 33 normalized 3D keypoints.
   - Renders a live Picture-in-Picture (PiP) feed with real-time skeleton overlay for tracking feedback.

2. **Kinematics & Gesture Recognition (`src/motion/gesture.js`)**:
   - Computes 3D velocity vectors ($\Delta x, \Delta y, \Delta z$) of wrists and ankles.
   - Measures joint angles (elbow extension, shoulder elevation, knee flex).
   - Detects defensive postures (wrists brought to chin level for Peek-a-boo guard).
   - Computes lateral and forward torso lean for real-time fighter model responsiveness.

3. **Combat Simulation & Rules Engine (`src/combat/combatEngine.js`)**:
   - Handles the 60-second round timer, health pools, and special meter accumulation.
   - Resolves attack defense priority:
     1. **Evasion Check**: If defender is dodging, damage is nullified (0 damage).
     2. **Guard Check**: If defender is blocking, 70% damage is absorbed (30% chip damage) and defender gains meter.
     3. **Clean Hit**: Full damage applied, attacker builds meter, contact point calculated.
   - Triggers hit-stop freeze frames (50–140ms) and tightly controlled pushback displacement.

4. **Tactical Opponent AI (`src/combat/ai.js`)**:
   - Runs an adaptive decision loop that evaluates player offense in real time.
   - Counter-attacks with lead jabs after successful blocks and slips into cross counters.

5. **3D Scene & Animation Hierarchy (`src/three/`)**:
   - Fully articulated PBR human skeletal rig:
     - `Pelvis` $\rightarrow$ `Torso` $\rightarrow$ `Chest` $\rightarrow$ `Neck` $\rightarrow$ `Head`
     - `Shoulder` $\rightarrow$ `Bicep` $\rightarrow$ `Elbow` $\rightarrow$ `Forearm` $\rightarrow$ `Glove`
     - `Hip` $\rightarrow$ `Thigh` $\rightarrow$ `Knee` $\rightarrow$ `Calf` $\rightarrow$ `Boot`
   - Real-time procedural animations for stance bounce, punching pronation, and directional hit flinches.
   - Combat VFX engine generating sweat droplet spray, contact sparks, and shockwaves.
   - Dynamic ringside broadcast camera with trauma screen shake and punch action zooms.

6. **Procedural Audio Engine (`src/audio.js`)**:
   - Uses Web Audio API oscillators, bandpass noise filters, and gain envelopes to synthesize zero-latency sound effects.

---

## 🎮 Controls

### 📹 Motion / Webcam Gestures

| Move | Physical Gesture |
| :--- | :--- |
| **Lead Jab** | Quick straight punch forward with your lead hand |
| **Power Cross** | Powerful straight punch forward with your rear hand |
| **Body Kick** | Knee raise or kick motion forward |
| **High Guard (Block)** | Bring both hands up to cover your chin/cheeks |
| **Slip / Dodge** | Lean your head and upper body quickly to the left or right |
| **Special Finisher** | Raise both fists high above your head when the meter is full (100%) |

### ⌨️ Keyboard Testing Controls

| Key | Action |
| :--- | :--- |
| <kbd>J</kbd> | Lead Jab |
| <kbd>K</kbd> | Power Cross |
| <kbd>L</kbd> | Body Kick |
| <kbd>B</kbd> | High Guard (Block) |
| <kbd>A</kbd> / <kbd>D</kbd> | Slip / Dodge (Left / Right) |
| <kbd>S</kbd> | Rising Uppercut Special (requires 100% meter) |

---

## 📁 Project Directory Structure

```text
Motion-Strike/
├── index.html                  # Main application markup & UI overlay
├── package.json                # Project dependencies & Vite scripts
├── src/
│   ├── main.js                 # Game bootstrap & loop coordinator
│   ├── audio.js                # Web Audio API procedural sound engine
│   ├── style.css               # Cyberpunk UI, glassmorphic HUD styling
│   ├── combat/
│   │   ├── combatEngine.js     # State machine, rules, hitboxes & contact
│   │   └── ai.js               # Reactive CPU opponent behavior
│   ├── motion/
│   │   ├── tracker.js          # MediaPipe Pose tracking & PiP canvas
│   │   └── gesture.js          # Velocity & kinematic gesture recognition
│   ├── three/
│   │   ├── arena.js            # 3D boxing ring, lighting & ropes
│   │   ├── camera.js           # Cinematic ringside camera with trauma shake
│   │   ├── fighter3d.js        # 3D fighter mesh hierarchy, stance & animations
│   │   ├── textures.js         # Procedural canvas & leather textures
│   │   └── vfx.js              # Sweat spray, flashes & spark particle systems
│   └── ui/
│       ├── hud.js              # Health bars, meter & round timer updates
│       └── screens.js          # Screen transitions (Title, Fight, End)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A modern browser with WebGL & WebRTC webcam support (Google Chrome, Edge, etc.)

### Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/Thiva123-ab/Motion-Strike.git
   cd Motion-Strike
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch development server:
   ```bash
   npm run dev
   ```

4. Open the local link in your browser:
   ```text
   http://localhost:5173/
   ```

5. Click **START FIGHT**, allow webcam access when prompted, and step back so your upper body is visible in the PiP feed!