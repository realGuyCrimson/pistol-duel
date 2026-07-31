# AGENTS.md — Project Routing Table & Bare Essentials Guide

> **Welcome Agent / Developer!**  
> This file acts as the primary orientation map and routing table for the **Pistol Duel Multiplayer Web App** codebase. Refer to this guide to quickly locate specs, original assets, physics math, and architecture plans.

---

## 📍 Project Overview

This repository bridges the original mobile hit *Pistol Duel* (`com.kayac.PistolDuel` by KAYAC Inc.) and a new 2-player real-time multiplayer web app implementation.

* **Original Mobile Game Concept:** Untethered, single-tap recoil-propelled physics duel where guns float, spin, and launch themselves via Newtonian impulse reaction.
* **Target Web Application:** Server-authoritative 2-player physics duel built with React, Phaser 3 / Matter.js, TypeScript, and Node.js + Socket.io, deployed on Netlify (frontend) and Railway/Fly.io (backend).

---

## 🗺️ Project Routing Table ("What Can Be Found Where")

| File / Folder Path | Type | Description & Purpose |
| :--- | :--- | :--- |
| [`AGENTS.md`](file:///c:/Users/evolv/Desktop/pistol%20duel/AGENTS.md) | **Doc** | **This Routing Table & Guide.** Primary entry point for AI agents & engineers. |
| [`pistol_duel_game_breakdown.md`](file:///c:/Users/evolv/Desktop/pistol%20duel/pistol_duel_game_breakdown.md) | **Doc** | **Reverse-Engineered Android Analysis.** In-depth architectural analysis of KAYAC's *Pistol Duel* Android app: impulse math, torque vectors, single-tap mechanics, Unity PhysX parameters, level structures, glass-cannon HP, hardware specs, and market analysis. |
| [`plan.md`](file:///c:/Users/evolv/Desktop/pistol%20duel/plan.md) | **Doc** | **Authoritative Web Multiplayer Plan.** Master technical design doc detailing stack selection, server authority model, URL room system (`/roomcode`), lobby color picker, gun HP classes, bullet types, arena elements, gravity rules, socket event registry, victory conditions, and 14-step implementation roadmap. |
| [`android app/`](file:///c:/Users/evolv/Desktop/pistol%20duel/android%20app) | **Folder** | **Extracted Android APK Directory.** The original APK extracted after renaming `.apk` to `.zip`. Contains original resources, assets, and bytecode. |
| [`android app/res/`](file:///c:/Users/evolv/Desktop/pistol%20duel/android%20app/res) | **Folder** | **Game Audio, Fonts & Visual Assets.** Contains extracted resources: <br>• **Audio (`.ogg`):** `1h.ogg`, `ON.ogg`, `SE.ogg`, `cQ.ogg` (gunshots, hits, explosions)<br>• **Fonts (`.ttf`):** `Ek.ttf`, `pH.ttf`<br>• **Data (`.json`):** `CA.json`, `Sc.json`, `Va.json`<br>• **Graphics (`.webp`, `.png`, `.9.png`):** UI drawables, particle textures, 9-patch frames, and vector XMLs. |
| [`android app/assets/`](file:///c:/Users/evolv/Desktop/pistol%20duel/android%20app/assets) | **Folder** | **Extracted APK Assets.** Raw bundled assets including secondary font files and dexopt configs. |
| [`android app/AndroidManifest.xml`](file:///c:/Users/evolv/Desktop/pistol%20duel/android%20app/AndroidManifest.xml) | **File** | **Android Manifest.** Activity declarations, permissions, and app package metadata. |
| [`android app/classes.dex`](file:///c:/Users/evolv/Desktop/pistol%20duel/android%20app/classes.dex) | **Binary** | **DEX Bytecode.** Compiled Android Java/Kotlin application logic files (`classes.dex` through `classes4.dex`). |

---

## ⚡ Core Physics Cheat Sheet

Movement and combat operate under an inverted kinematic model (no character avatar; guns float freely):

1. **Newton's 3rd Law Recoil:**
   $$\vec{J}_{\text{recoil}} = -\Delta \vec{p}_{\text{bullet}} = -m_{\text{bullet}} \cdot \vec{v}_{\text{bullet}}$$
2. **Induced Torque & Angular Acceleration:**
   $$\vec{\tau} = \vec{r} \times \vec{F}_{\text{recoil}}, \quad \vec{\alpha} = \frac{\vec{\tau}}{I}$$
   *(Offset $\vec{r}$ from barrel tip to center of mass causes gun to spin in mid-air on discharge).*
3. **Gravity Dynamics:**
   * **Guns & Bombs:** Subject to light, slow downward gravity pull.
   * **Bullets:** Zero gravity effect (straight hitscan or trajectory).

---

## ⚙️ Multiplayer Architecture & System Rules (`plan.md` Summary)

* **Server Authority:** Server executes all physics (Matter.js), collision resolution, HP tracking, and win logic. Clients strictly render snapshots & emit tap inputs.
* **Room URL Routing:** Rooms accessible via `https://pistonduel.netlify.app/roomcode`.
* **Match Lifecycle:**
  1. Host (P1) selects gun type before room creation.
  2. Joiner (P2) enters via room link/code.
  3. Both players choose colors from a fixed 7-color palette (no duplicates).
  4. Server randomizes an arena map from the arena pool.
  5. 3-2-1 countdown -> Battle phase -> Victory/Draw state -> Rematch prompt.
* **Gun Classes (Durability):**
  * Small: 1 HP
  * Medium: 2 HP
  * Big: 3 HP
* **Bullet Classifications:**
  * **Straight:** Linear non-gravitational trajectory.
  * **Bounce:** Travels straight, bounces once off bouncy walls.
  * **Wavy:** Oscillating wave motion (~2 wavelength range).

---

## 🛠️ Instructions for AI Agents & Developers

1. **Asset Sourcing:** When sourcing original sound effects, font families, or icon templates for the web client, inspect [`android app/res/`](file:///c:/Users/evolv/Desktop/pistol%20duel/android%20app/res). Take inspiration from them. Not necessary to replicate them exactly.
2. **Feature Implementation:** Always verify proposed socket schemas, room state structures, and mechanics against [`plan.md`](file:///c:/Users/evolv/Desktop/pistol%20duel/plan.md).
3. **Physics Integrity:** Consult [`pistol_duel_game_breakdown.md`](file:///c:/Users/evolv/Desktop/pistol%20duel/pistol_duel_game_breakdown.md) when tuning linear/angular drag, mass calibration, or impulse force vectors.
