# Multiplayer Gun Battle Game — Final Development Plan

## Overview

This game is a 2-player head-to-head physics duel. There is only one active match per room, and the server owns all gameplay truth. The client only sends inputs and renders state.

The match flow is simple:

* The host chooses the gun type before creating the room.
* The room lives at `https://pistonduel.netlify.app/roomcode`.
* The room can be joined directly from that link.
* No usernames.
* The creator is Player 1.
* The joiner is Player 2.
* The server randomly selects the arena.
* Both players choose gun colors from a fixed set before the match starts.
* Gravity slowly pulls guns and bombs downward.
* Bullets are not affected by gravity.
* Battle begins.
* One gun is destroyed or both are destroyed in a draw.
* Rematch resets the room and randomizes a new arena.

---

# 1) Core Architecture

## Stack

### Frontend

* React
* Phaser 3
* TypeScript

### Backend

* Node.js
* Socket.io

### Physics

* Matter.js or a custom 2D physics layer

### Hosting

* Frontend on Netlify
* Backend on a persistent Node host such as Railway, Fly.io, or a small VPS
* The same setup can also run on a personal laptop if that is the deployment choice

---

## Authority Model

The server is authoritative.

### Clients do

* Send inputs
* Pick gun color
* Show UI
* Render the world
* Smooth motion locally

### Server does

* Create and manage rooms
* Assign Player 1 and Player 2
* Randomize arenas
* Run physics
* Apply gravity to guns and bombs
* Track HP
* Resolve hits
* Determine winners
* Handle rematches

---

# 2) Room System

## Room URL Rule

Every room must be accessible at:

`https://pistonduel.netlify.app/roomcode`

Examples:

* `https://pistonduel.netlify.app/AB12CD`
* `https://pistonduel.netlify.app/ZX9PQ1`

A room code in the URL should be enough to open the room page and join directly.

---

## Room Creation

The host first chooses the gun type.

Then they click **Create Room**.

The server should:

* Create a unique room code
* Create a room record
* Store the chosen gun type
* Mark the creator as Player 1
* Return the room URL

The room page should load automatically from the route.

---

## Room Join

A player opens the room URL or enters the room code.

The server should:

* Look up the room
* Check whether it exists
* Check whether it already has 2 players
* Assign the new player as Player 2 if possible

If the room is full or missing:

* show an error
* do not allow joining

---

## Room State

The server should store one object per room.

Example structure:

```ts id="r1f82"
type RoomState = {
  code: string;
  status: "waiting" | "ready" | "countdown" | "active" | "ended";
  gunType: string;
  arenaId?: string;
  player1: {
    socketId: string;
    color?: string;
    ready: boolean;
  };
  player2?: {
    socketId: string;
    color?: string;
    ready: boolean;
  };
  battle?: {
    startedAt?: number;
    endedAt?: number;
    winner?: "player1" | "player2" | "draw";
  };
};
```

---

# 3) Lobby Flow

## When the room opens

The lobby should show:

* Room code
* Room URL
* Gun type chosen by host
* Player 1 slot
* Player 2 slot
* Color choices
* Ready status
* Join status

There are no usernames.

Player identity is only:

* Player 1 = host
* Player 2 = joiner

---

## Gun Color Selection

Each player can choose one color from a fixed palette of 7 rainbow colors.

Rules:

* A chosen color appears in real time on both screens
* If one player selects a color, that color becomes blocked for the other player
* No duplicate colors
* Color choice is only cosmetic

---

# 4) Gun Type System (HP (size) + bullet type)

The host selects the gun type before room creation.

That gun type applies to both players.

## Gun properties

Each gun type should define:

* Name (cosmetic)
* HP
* Bullet type (basically gun type)
* Mass
* Spread (currently same for all)
* Special behavior (currently none for all)
* Damage (currently same for all)
* Fire rate (currently same for all)
* Recoil (currently same for all)

---

## Gun HP

Gun durability is simple:

* Small gun: 1 HP
* Medium gun: 2 HP
* Big gun: 3 HP

Each bullet hit reduces 1 HP.

When HP reaches zero:

* the gun is destroyed
* the match ends

---

# 5) Bullet Type System

Different gun types can contain different bullet types.

## Bullet types

### Straight bullet

* Travels in a straight line
* No gravity
* Continues until collision or map boundary

### Bounce bullet

* Travels straight
* Can bounce once
* Then continues until it hits something else or expires

### Wavy bullet

* Travels forward with a wave motion
* Range is limited to about 2 wavelengths
* Server must simulate the exact motion so both clients see the same path

Bullets should not be pulled by gravity.

---

# 6) Arena System

The arena is selected randomly by the server after both players are ready.

There is no arena vote.

There is no arena selection by players.

The server chooses one arena from the available pool.

---

## Arena format

Arenas are 2D maps defined in structured data.

Each arena can contain:

* Dimensions
* Spawn points
* Walls
* Divisions
* Bouncy wall sections
* Computer guns
* Cannons
* Bombs
* Props
* Interactive objects (computer guns, cannons, bombs)

---

## Arena objects

### Walls

Static collision surfaces.

### Divisions

Internal walls that separate regions of the map.

### Computer guns

Neutral AI guns that:

* are randomly sized and typed (their random chance is predetermined)
* are colored black or white
* can detect players
* can fire automatically
* can be destroyed

### Cannons

Slow arena hazards that:

* fire projectiles periodically
* target player guns
* are part of the map logic

### Bombs

Objects that:

* explode when hit by a player bullet
* deal area damage
* apply knockback

### Bouncy wall sections

Special wall pieces that:

* reflect bullets
* do not treat player guns differently than normal walls

---

# 7) Gravity System

Add a gravity factor that acts slowly and continuously.

## Gravity rules

Gravity affects:

* player guns
* computer guns
* bombs

Gravity does not affect:

* bullets
* walls
* divisions
* cannons

## Gravity behavior

Gravity should be light and slow, not extreme.

The effect should feel like:

* gentle downward pull
* gradual sinking over time
* extra movement pressure during combat

This gives the arena more tactical depth without turning the game into a full platformer.

---

# 8) Match Flow

The battle flow should be as simple as possible.

## Match sequence

```text id="m1zq7"
Host selects gun type
↓

Create room
↓

Player 2 joins through room link
↓

Both players choose colors
↓

Both press Ready
↓

Server randomly selects arena
↓

Countdown
↓

Battle starts
↓

Fight
↓

One side wins or draw
↓

Rematch
```

---

## Countdown

Once both players are ready:

* show 3
* show 2
* show 1
* start

Players cannot act until the countdown ends.

---

# 9) Battle Simulation

The server continuously simulates:

* Gun movement
* Gun rotation
* Gun velocity
* Bomb movement
* Bullet movement
* Collisions
* Gravity
* Damage
* Destruction
* Victory state

Clients only render snapshots.

---

## Collision rules

### Bullet hits gun

* Reduce HP
* Apply knockback
* Destroy gun if HP reaches zero

### Gun hits wall

* Bounce

### Gun hits bomb

Nothing happens

### Gun hits cannon

Nothing happens

### Bullet hits bomb

* Bomb detonates
* Apply area damage
* Apply knockback

### Bullet hits cannon

* Reduce 1 HP from the cannon (cannons have 1-2 HP by default)

### Bullet hits bullet

destroy both

---

# 10) Victory Rules

## Primary win condition

A player wins when the opponent gun reaches 0 HP.

## Draw condition

If both guns are destroyed in the same server tick:

* the result is a draw

## Match end

When the match ends:

* freeze the simulation
* announce the winner
* show match result
* enable rematch

---

# 11) Socket Events

## Room events

* `create_room`
* `room_created`
* `join_room`
* `room_joined`
* `room_full`
* `room_not_found`

## Lobby and color events

* `select_color`
* `color_updated`
* `ready_up`
* `player_ready_state`

## Match events

* `arena_selected`
* `battle_start`
* `input_update`
* `state_update`
* `hit_event`
* `destroy_event`
* `battle_end`

## Rematch events

* `rematch_request`
* `rematch_accept`
* `rematch_decline`
* `rematch_start`

---

# 12) Client Behavior

The client should:

* Open the room page from the URL
* Show room status
* Show gun type
* Let players pick colors
* Show the arena once selected
* Render the battlefield
* Show countdown
* Show victory screen
* Show rematch options

The client should never decide winner.

---

# 13) Server Behavior

The server should:

* Create and delete rooms
* Keep Player 1 and Player 2 identity fixed
* Store chosen gun type
* Randomly select arenas
* Validate color uniqueness
* Apply gravity to guns and bombs
* Run physics
* Manage bullets
* Track HP
* Resolve victory or draw
* Reset for rematch

---

# 14) Rematch System

After a battle ends:

* both players see rematch options
* if both accept, the room resets
* the gun type stays the same
* a new random arena is selected
* colors can NOT be reselected
* the next battle begins

If one declines:

* return to lobby or close the room

---

# 15) Disconnect Handling

## Before battle

If someone disconnects before the fight:

* keep the room alive briefly
* allow reconnect if the room is still valid
* delete the room after timeout if needed

## During battle

If someone disconnects during combat:

* allow a short reconnect window.
* end the match and give the other player the win

## After battle

If someone disconnects after the result:

* close the room normally

---

# 16) Security Rules

Do not trust the client.

The server must verify:

* firing rate
* legal color choice
* movement input
* HP
* collision results
* victory conditions

Clients cannot claim hits or wins.

---

# 17) Development Order

## Step 1

Build the room system and URL routing.

## Step 2

Create room creation with host gun-type selection.

## Step 3

Implement room join from link or room code.

## Step 4

Add player color selection.

## Step 5

Add ready checks.

## Step 6

Add random arena selection.

## Step 7

Build the battle countdown.

## Step 8

Build the authoritative physics world.

## Step 9

Add guns, bullets, HP, and destruction.

## Step 10

Add gravity for guns and bombs.

## Step 11

Add walls, divisions, bombs, cannons, bouncy walls, and computer guns.

## Step 12

Implement victory and draw logic.

## Step 13

Implement rematch flow.

## Step 14

Polish visuals, syncing, and UI.

---

# 18) Data Model

## Room

* code
* status
* gun type
* arena id
* players
* battle state

## Player

* socket id
* role
* color
* ready state
* gun HP
* physics body

## Gun type

* HP
* bullet type
* mass

## Bullet

* position
* velocity
* lifetime
* bounce count
* damage (1 for all)

## Arena

* dimensions
* spawn points
* walls
* divisions
* hazards
* props
* special objects

## Match

* tick counter
* start time
* end time
* winner
* draw flag
* event log

---

# 19) Final Simplified Rules

* The host chooses the gun type before creating the room.
* The room is accessible at `https://pistonduel.netlify.app/roomcode`.
* The room can be joined directly from that link.
* No usernames.
* The creator is Player 1.
* The joiner is Player 2.
* Players only choose colors.
* The arena is randomly selected by the server.
* There is no gun vote and no arena vote.
* Guns have 1–3 HP.
* Bullet types include straight, one-bounce, and wavy.
* Gravity slowly pulls guns and bombs downward.
* Bullets are not affected by gravity.
* The server owns the simulation.
* A match ends when one gun is destroyed or both are destroyed at once for a draw.
* Rematch resets the room and loads a new random arena.
