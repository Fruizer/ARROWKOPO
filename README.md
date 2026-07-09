# 🏹 ARROWKOPO: System Overdrive (v1.3.0)

A high-velocity, adrenaline-fueled arcade survival prototype engineered on a decoupled HTML5 Canvas architecture. Dodge tracking enemies, weave through lethal shifting laser arrays, collect energy matrix inputs, and execute devastating cybernetic abilities to survive the system grid.

⚡ **Play the Live Prototype instantly on Vercel:** [arrowkopo.vercel.app](https://arrowkopo.vercel.app/)

---

## 🏎️ Core Gameplay Mechanics

### Navigation & Movement
* **Inertia Glide:** Smooth keyboard physics across a bounded 2D coordinate space.
* **[SPACE] Micro Dash:** Short-range phase shift with complete iframe protection. Safely slices straight through active laser hitboxes and hostile enemies. (Holds up to 2 charges).

### [SYSTEM OVERDRIVE] Cybernetic Energy Abilities
Collect **Neon Purple** (5 Energy) and **Yellow** (10 Energy) matrix orbs to charge your ability core:
* **`[Q]` EMP Freeze (Cost: 200):** Instantly triggers an emergency localized stasis lock, completely freezing all hazard loops, projectile vectors, and active tracking paths for 3 seconds.
* **`[E]` Hyper Dash / Sandevistan (Cost: 450):** Overclocks your core to 2.2x acceleration and 1.8x maximum velocity while generating a physical, high-opacity continuous chromatic rainbow trail. **Bonus:** Instantly refills your Micro Dash charges back to 2/2 upon activation.
* **`[F]` Thorn Barrier (Cost: 700):** Manifests a kinetic shatter-shield that obliterates any physical entities or projectiles it touches for defensive scoring.
* **`[R]` Tactical Nuke (Cost: 2500):** Overloads the sector core, wiping out every hostile projectile and enemy unit on the screen with massive score feedback.

---

## 🛠️ Project Architecture

The project has been fully optimized and decoupled into a clean, scannable structural blueprint:

```text
ARROWKOPO/
├── .github/workflows/
│   └── package-release.yml  # Automated zip asset bundler for GitHub Releases
├── index.html               # Semantic structural layout, canvas layer, & HUD container
├── styles.css               # Dark-grid grid systems and reactive neon HUD pulsing animations
├── game.js                  # Core rendering loops, collision trees, and particle vectors
└── package.json             # Dev environmental scripts and local node server dependencies
