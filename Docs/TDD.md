# Technical Design Document: LOTR Card Game Browser Implementation

This document outlines the architecture, data models, and implementation strategy for the browser-based version of the Lord of the Rings: The Card Game.

## Tech Stack
- **Frontend**: React 19 (for component-based UI)
- **State Management**: Zustand (lightweight, robust state control)
- **Logic Engine**: Pure TypeScript (decoupled from UI)
- **Styling**: Vanilla CSS (CSS Grid for the table layout)
- **Deployment**: Vite 7 (fast dev server and build)

## 0. Project Structure
The application follows a modular directory structure to separate concern and logic:
```text
/src
  /assets        - Global styles, fonts, and generic card art.
  /components    - Reusable UI elements (Card, Hand, Token, Button).
  /engine        - Pure TypeScript logic for game rules and phase management.
  /store         - Zustand store for managing global game state.
  /data          - Local JSON card databases (Core.json, core_encounter.json).
  /utils         - Helper functions (Image resolvers, rule validators).
  App.tsx        - Root component and layout orchestrator.

/public
  /cards         - Full card images (used for zoomed view and hand cards).
  /cardPortraits - Square portrait images (used for hero card display).
```

### Image File Naming Convention

All image files use a **code-only naming convention** for simplicity and consistency:

| Folder | Pattern | Example |
|--------|---------|---------|
| `/public/cards/` | `{code}.png` | `01001.png` (Aragorn full card) |
| `/public/cardPortraits/` | `{code}.png` | `01001.png` (Aragorn portrait) |

**Benefits:**
- No special character issues (avoids `é`, `ó`, `'`, `!` in filenames)
- Simple path generation: `/cards/${card.code}.png`
- No lookup tables needed in code
- Easy to add new images (just use the card code from RingsDB)

**Code Usage:**
```typescript
// Get full card image path
function getCardImagePath(code: string): string {
    return `/cards/${code}.png`;
}

// Get portrait image path
function getPortraitImagePath(code: string): string {
    return `/cardPortraits/${code}.png`;
}
```

**Card Code Reference:**
- Player cards (Core Set): `01001` - `01073`
- Encounter cards (Core Set): `01074` - `01121`
- Card codes match RingsDB JSON data (`Core.json`)

## 1. Data Models
### Core Types
- `Card`: Common properties (ID, Title, Traits, Type).
- `PlayerCard`: Costs, Spheres, Stats (Willpower, Attack, Defense, Hit Points).
- `EncounterCard`: Engagement Cost, Threat, Stats, Shadow effects.
- `GameState`:
    - Current Phase (Resource, Planning, Quest, etc.)
    - Threat Levels (per player)
    - Resource Pools (per hero)
    - Deck Stacks (Player Deck, Encounter Deck, Quest Deck)
    - Active Locations and Staging Area

## 2. Core Game Engine
A headless state machine built in TypeScript to handle rules enforcement:
- **Phase Management**: Orchestrating transitions through the 7 game phases.
- **Action Resolution**: Handling resource costs, triggering effects, and managing responses.
- **Combat Logic**: Automated shadow card dealing, attack declaration, and damage calculation.
- **Keyword Handlers**: Dedicated logic for keywords like `Surge`, `Doomed`, `Ranged`, and `Sentinel`.

## 3. UI Components

### 3.1 Layout Overview

The game board uses **CSS Grid** to divide the screen into persistent zones:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ THREAT | QUEST DECK   │ ACTIVE   |   STAGING AREA        │ ENCOUNTER     │
│ DIAL   | [Quest Card] │ LOCATION | [Enemy] [Location]... │ DECK / DISCARD│
│        |              │          |                       │               │
├────────┴──────────────┴──────────┴───────────────────────┴───────────────┤
│  PLAYER ZONE                                                             │
│  [Hero 1] [Hero 2] [Hero 3]    [Ally] [Ally]                             │
│  Resources: ●●●               Threat: 0                                  │
│  HAND: [Card] [Card] [Card]...                                           │
├──────────────────────────────────────────────────────────────────────────┤
│  PHASE CONTROL BAR  [Resource] [Planning] [Quest] ... [Refresh]          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Tree

```
<App>
  <GameTable>
    <QuestZone>           ← Quest deck + current quest card
    <StagingArea>         ← Revealed enemies, locations, treacheries
    <EncounterDeckZone>   ← Encounter deck + discard pile
    <ActiveLocationZone>  ← The current active location card
    <PlayerZone>          ← Per player: heroes, allies, hand
      <HeroCard>          ← Hero stats + resources + exhausted state ✅
      <AllyCard>          ← Ally stats + damage + exhausted state ✅
      <HandCard>          ← Cards in hand (face-down option in multiplayer)
  <PhaseControlBar>       ← Phase indicator + current phase action buttons ✅
  <ThreatDial>            ← Circular threat tracker (0–50) ✅
  <LogPanel>              ← Collapsible event log ✅
```

### 3.3 Individual Component Specs

#### `<CardDisplay>` — Universal card renderer
- **Props**: `card: Card`, `exhausted?: boolean`, `damage?: number`, `selected?: boolean`
- **Image Mode**: Shows card art (`imagesrc`) scaled to fit.
- **Placeholder Mode** (triggered when image fails to load or `imagesrc` is absent):
  - **Enemy**: Dark red/brown border, name, traits, engagement icon, stats grid (Threat / ATK / DEF / HP).
  - **Location**: Green border, name, Threat + Quest Points.
  - **Treachery**: Purple border, name + full text.
  - **Quest**: Sepia banner, stage number, quest points, setup/forced text.
  - **Player cards**: Sphere-colored border, cost, name, stats.
- **Overlays**: Exhausted (30° rotation + desaturate), damage tokens, selection glow.

#### `<HeroCard>` — Extended hero panel
- Shows portrait, name, sphere icon, Willpower/Attack/Defense/HP stats.
- Inline **resource pool** with `+` / `−` buttons.
- **Damage track** along the bottom edge.
- Click to exhaust / ready (toggle state in Zustand).

#### `<StagingArea>` — Encounter staging zone
- Horizontal scrollable row of `<CardDisplay>` cards.
- Shows cumulative **Threat total** badge.
- Cards can be clicked to engage (triggers engagement check during Encounter Phase).

#### `<PhaseControlBar>` — Action bar at the bottom
- Highlights the **current phase** tab.
- Renders **context-sensitive action buttons** per phase:
  - **Resource** → "Collect Resources"
  - **Planning** → "Play Card from Hand"
  - **Quest** → "Commit to Quest", "Pass"
  - **Travel** → "Travel to Location", "Skip"
  - **Encounter** → "Optionally Engage", "Done"
  - **Combat** → "Declare Defender", "Resolve Attack", "Next Enemy"
  - **Refresh** → "Ready All", "Raise Threat", "End Round"

#### `<ThreatDial>` — Circular progress UI
- SVG-based circular dial, 0–50 range.
- Color transitions: green (0–29), yellow (30–39), red (40–49), pulsing at 50.
- `+` / `−` manual adjustment buttons.

#### `<LogPanel>` — Collapsible game log
- Chronological list of game events (e.g., "Round 2 — Combat Phase started", "Forest Spider attacks Aragorn for 2 damage").
- Collapsed by default, expandable on click.


## 4. Initial Scenario Implementation
The first release will focus on the **Passage Through Mirkwood** scenario, including all unique encounter sets and quest stages defined in the rules.

## 5. Card Data Sourcing
To ensure accuracy and minimize manual data entry, the project uses the following sourcing strategy:
- **Primary Source**: [RingsDB API](https://ringsdb.com/api/doc).
- **Ingestion Workflow**:
    - A dedicated script fetches data for the Core Set and "Passage Through Mirkwood" encounter cards.
    - Data is normalized into the project's Game Engine schema.
    - Resulting JSON is stored locally in `src/data/cards.json` for performance.
- **Image Assets**: Initially hotlinked using the image URLs provided by RingsDB (which are served by Hall of Beorn).
    - **Current Status**: Card images are stored locally in `public/cards`.
    - **Portrait Generation**: A custom utility `crop_cards.py` generates art-only "portraits" for use in compact UI views (like Hero cards).
    - **Coordinates**: The tool crops a **290x290** square using box `(134, 10, 424, 300)`.
    - **Output**: Portratis are saved to `public/cardPortraits/` with the suffix `_CardPortrait.png`.
- **Placeholder Strategy**: Encounter and Quest card images (Cards 01074-01121) are currently missing due to host restrictions. The UI will render high-quality text-based placeholders with card details (Stats, Text, Keywords) until local assets are provided.

## 6. Deck Management
To allow players to customize their experience, the application will provide two primary methods for deck handling:

### A. RingsDB Integration (Import)
- **Workflow**: Players provide a RingsDB Deck ID or URL.
- **Implementation**: The app calls `https://ringsdb.com/api/public/decklist/{id}` to retrieve the card list.
- **Mapping**: The app maps RingsDB card codes to the local normalized `cards.json` database.
- **Persistence**: Imported decks are saved to the browser's `localStorage`.

### B. In-App Deck Builder
- **Card Browser**: A searchable, filterable gallery using the `json/Core.json` data.
- **Validation Rules**:
    - Minimum 50 cards (standard) or custom size for "Quick Play".
    - Exactly 1-3 Heroes.
    - Maximum 3 copies of any card by title.
    - Sphere matching validation (optional/soft warning).
- **Deck Export**: Decks can be downloaded as `.json` or exported as a RingsDB-compatible text list.

## 7. Asset Fallback Strategy
To maintain playability without full image assets:
- **Image Resolver**: A utility function `resolveCardImage(code)` will check for the existence of `{code}.png` in the assets folder.
- **Fallback Logic**: If the image is not found, the `Card` component will toggle to "Text Mode":
    - **Encounters**: Red/Brown frame with semi-transparent background and prominently displayed stats.
    - **Quests**: Full-width landscape layout with flavor text and scenario goals.

## 8. Implemented Features

### 8.1 Game Setup (Rules Compliant)
The game setup follows the official rules reference:

1. **Shuffle Decks**: Player deck and encounter deck are shuffled independently.
2. **Place Heroes & Set Initial Threat**: Heroes are placed, and starting threat equals the sum of hero threat costs.
3. **Draw Setup Hand**: Each player draws **6 cards** from their player deck (per Rules Section 5).
4. **Mulligan Support**: Players can optionally shuffle and redraw (UI not yet implemented).
5. **Scenario Setup**: For "Passage Through Mirkwood":
   - 1x Forest Spider added to staging area
   - 1x Old Forest Road added to staging area
   - Encounter deck reshuffled after search

**Implementation Location**: `src/store/gameStore.ts` → `runSetup()`

### 8.2 Card Playing System

#### `playCard` Store Action
A comprehensive action for playing cards from hand during the Planning phase.

**Signature**:
```typescript
playCard: (playerId: string, cardIndex: number, targetHeroCode?: string) => PlayCardResult
```

**Features**:
| Feature | Implementation |
|---------|----------------|
| Phase Validation | Only allows card play during Planning phase |
| Resource Validation | Checks if player has enough resources from matching sphere heroes |
| Sphere Matching | Leadership cards require Leadership hero resources, etc. |
| Neutral Cards | Can use resources from any hero |
| Ally Cards | Added to `player.allies` array with `exhausted: false` |
| Attachments | Requires `targetHeroCode` parameter; adds to hero's `attachments` array |
| Events | Goes to discard pile (individual effect resolution not yet implemented) |
| Resource Spending | Automatically deducts from matching sphere heroes |
| Logging | All actions logged to game log |

**Return Type**:
```typescript
interface PlayCardResult {
    success: boolean;
    error?: string;  // Error message if success is false
}
```

**Implementation Location**: `src/store/gameStore.ts` → `playCard()`

### 8.3 Hand Card UI Interactions

#### Click-to-Play System
Hand cards are now interactive during the Planning phase:

**Visual Indicators**:
- **Green cost badge**: Card is playable (enough resources)
- **Red cost badge**: Card is not playable (insufficient resources)
- **Hover effect**: Playable cards lift and glow on hover
- **Grayed out**: Unplayable cards appear dimmed

**Card Type Handling**:
| Card Type | Click Behavior |
|-----------|----------------|
| Ally | Plays immediately, added to player's ally zone |
| Event | Plays immediately, discarded after resolution |
| Attachment | Enters "targeting mode" — player must click a hero |

**Attachment Targeting Flow**:
1. Player clicks an attachment card in hand
2. UI displays prompt: "Select a hero for [Card Name]"
3. All heroes gain a pulsing blue glow (`.highlighted` state)
4. Player clicks a hero to attach the card
5. Cancel button available to abort the action

**Implementation Locations**:
- `src/components/GameTable.tsx` → `handleHandCardClick()`, `handleHeroClickForAttachment()`
- `src/components/HeroCard.tsx` → `highlighted` prop
- `src/components/GameTable.css` → `.hand-card-wrapper`, `.playable`, `.unplayable`
- `src/components/HeroCard.css` → `.hero-card.highlighted`

### 8.4 Resource System
Heroes collect 1 resource per turn during the Resource phase. Resources are sphere-specific:

- **Leadership** (gold): Used for Leadership cards
- **Tactics** (red): Used for Tactics cards
- **Spirit** (blue): Used for Spirit cards
- **Lore** (green): Used for Lore cards
- **Neutral**: Can use resources from any sphere

**Resource Display**: Each hero card shows resource pips with `+`/`−` buttons for manual adjustment.

### 8.5 Ally Display Zone

#### `<AllyCard>` Component
A dedicated component for displaying allies in play, similar to `HeroCard` but more compact.

**Props**:
```typescript
interface AllyCardProps {
    ally: Ally;                       // Ally card data with exhausted/damage state
    onExhaustToggle: () => void;      // Callback to exhaust/ready ally
    onDamageChange: (delta: number) => void;  // Callback to deal/heal damage
    highlighted?: boolean;            // Optional targeting highlight
}
```

**Features**:
| Feature | Implementation |
|---------|----------------|
| Portrait | Card image or text placeholder via `<CardDisplay>` |
| Stats Display | Grid showing WIL / ATK / DEF / HP |
| Damage Track | Visual bar showing current damage vs max HP |
| Exhaust Toggle | Button to exhaust/ready the ally |
| Damage +/- Buttons | Manual damage tracking |
| Auto-Destruction | Allies are destroyed when damage ≥ HP |

**Implementation Location**: `src/components/AllyCard.tsx`

#### Store Actions for Allies
Four new actions added to the Zustand store:

```typescript
exhaustAlly: (playerId: string, allyIndex: number) => void;
readyAlly: (playerId: string, allyIndex: number) => void;
damageAlly: (playerId: string, allyIndex: number, amount: number) => void;
healAlly: (playerId: string, allyIndex: number, amount: number) => void;
```

**Ally Destruction Logic** (`damageAlly`):
- When `ally.damage >= ally.health`, the ally is automatically destroyed
- Destroyed allies are removed from `player.allies` array
- Destroyed allies are added to `player.discard` pile
- Log message: `"[Ally Name] is destroyed!"`

**Implementation Location**: `src/store/gameStore.ts`

#### UI Integration
The allies section appears in the Player Zone between Heroes and Engaged Enemies:

```
┌────────────────────────────────────────────────────────────────┐
│  PLAYER ZONE                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ENGAGED: [Forest Spider] [King Spider] ...              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ HEROES: [Aragorn] [Legolas] [Gimli]                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ALLIES: [Gandalf] [Snowbourn Scout] ...                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│  HAND: [Card] [Card] [Card]...                                 │
└────────────────────────────────────────────────────────────────┘
```

**CSS Classes**:
- `.player-zone__allies` - Container for allies section
- `.player-zone__allies-label` - "Allies" label
- `.player-zone__allies-list` - Scrollable flex container for ally cards

**Implementation Locations**:
- `src/components/GameTable.tsx` - Allies section rendering
- `src/components/GameTable.css` - Allies zone styling

### 8.6 Attachment Display on Heroes

#### Type Changes
The `Hero` interface was updated to store full attachment card data instead of just IDs:

```typescript
// src/engine/types.ts
export interface Hero extends PlayerCard {
    currentHealth: number;
    damage: number;
    exhausted: boolean;
    resources: number;
    attachments: PlayerCard[];  // Changed from string[] to PlayerCard[]
}
```

#### Attachment Badge Display
When attachments are played on a hero, they appear as small badges in the hero card's attachment zone:

**Visual Design**:
- Each attachment shows as a compact badge with the card name
- Badges are displayed in a horizontal row below the hero's stats
- If more than 3 attachments, the row becomes scrollable
- Badge colors match the attachment's sphere (Leadership=gold, Tactics=red, etc.)

**CSS Classes**:
- `.hero-attachments` - Container for attachment badges
- `.attachment-badge` - Individual attachment badge styling
- `.attachment-badge--leadership`, `.attachment-badge--tactics`, etc. - Sphere-specific colors

#### Stat Bonus Calculation
Attachments that grant stat bonuses are automatically calculated and displayed:

```typescript
// src/components/HeroCard.tsx
function calculateAttachmentBonuses(attachments: PlayerCard[]): AttachmentBonuses {
    const bonuses = { willpower: 0, attack: 0, defense: 0, health: 0 };
    for (const att of attachments) {
        const text = att.text ?? '';
        // Pattern matching for common bonus formats
        if (text.includes('+2 [willpower]')) bonuses.willpower += 2;
        if (text.includes('+1 [willpower]')) bonuses.willpower += 1;
        if (text.includes('+2 [attack]')) bonuses.attack += 2;
        if (text.includes('+1 [attack]')) bonuses.attack += 1;
        if (text.includes('+2 [defense]')) bonuses.defense += 2;
        if (text.includes('+1 [defense]')) bonuses.defense += 1;
        // ... additional patterns
    }
    return bonuses;
}
```

**Bonus Display**:
| Display Element | Description |
|-----------------|-------------|
| Base stat | Shows hero's original stat value |
| Green indicator | `(+N)` appears next to modified stats |
| Total display | Some views show `Base + Bonus = Total` format |

#### Hero Click Handler for Attachment Targeting
The `HeroCard` component accepts an `onClick` prop to enable attachment targeting:

```typescript
// src/components/HeroCard.tsx
interface HeroCardProps {
    card: Hero;
    onResourceChange: (delta: number) => void;
    onToggleExhaust: () => void;
    highlighted?: boolean;  // Pulsing blue glow when selecting target
    onClick?: () => void;   // Called when clicking hero for attachment
}
```

**Targeting Flow**:
1. Player clicks attachment card in hand
2. `GameTable` enters attachment targeting mode with `attachmentTargetCard` state
3. All hero cards receive `highlighted={true}` prop
4. Hero cards show pulsing blue border animation
5. Clicking a hero triggers `onClick` → `handleHeroClickForAttachment()`
6. Attachment is played on the selected hero
7. Targeting mode exits, attachment appears as badge on hero

**Implementation Locations**:
- `src/components/HeroCard.tsx` - `onClick` prop, `highlighted` styling, attachment badges, bonus calculation
- `src/components/HeroCard.css` - `.hero-card.highlighted`, `.hero-attachments`, `.attachment-badge`
- `src/components/GameTable.tsx` - `attachmentTargetCard` state, `handleHeroClickForAttachment()`
- `src/store/gameStore.ts` - `playCard()` action stores full `PlayerCard` in `hero.attachments`

### 8.7 Card Zoom/Detail View

#### Overview
Hovering over any card displays a larger, more readable version of the card. This enables players to read full card text and view stats clearly without requiring a separate modal or right-click interaction.

#### Props Update
The `CardDisplay` component gained a new optional prop:

```typescript
interface CardDisplayProps {
    card: Card;
    exhausted?: boolean;
    damage?: number;
    selected?: boolean;
    onClick?: () => void;
    disableZoom?: boolean;  // Set to true to disable hover zoom
}
```

#### Zoom Behavior
| Trigger | Action |
|---------|--------|
| Mouse Enter | Calculates position and shows zoomed overlay |
| Mouse Leave | Hides zoomed overlay |
| Hover on Overlay | Auto-hides overlay (prevents flickering) |

#### Position Calculation
The zoomed card automatically positions itself to stay within the viewport:

```typescript
// Position priority:
// 1. Right of the card (default)
// 2. Left of the card (if right edge would clip)
// 3. Above/below centered (if neither side fits)

const zoomWidth = 280;   // Zoomed card width
const zoomHeight = 392;  // Zoomed card height (280 * 1.4 aspect ratio)
```

**Edge Cases Handled**:
- Card near right edge → zoom appears on left
- Card near bottom edge → zoom shifts upward
- Card near top edge → zoom shifts downward
- Card near corner → zoom centers horizontally

#### React Portal Implementation
The zoom overlay uses `createPortal()` to render directly into `document.body`:

```typescript
import { createPortal } from 'react-dom';

// Inside CardDisplay render:
{isHovered && !disableZoom && zoomPosition && createPortal(
    <div className="card-display__zoom-overlay" style={{ left: x, top: y }}>
        <div className="card-display__zoom-card">
            {/* Zoomed content */}
        </div>
    </div>,
    document.body
)}
```

**Why Portal?**
Parent elements with CSS `transform` (like `.hand-card-wrapper:hover`) create a new containing block, breaking `position: fixed`. Using a Portal renders the overlay outside the DOM hierarchy, ensuring it always positions relative to the viewport.

#### CSS Styling

**Overlay Container**:
```css
.card-display__zoom-overlay {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    animation: zoom-fade-in 0.15s ease-out;
}
```

**Zoom Animation**:
```css
@keyframes zoom-fade-in {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}
```

**Zoomed Card**:
```css
.card-display__zoom-card {
    width: 280px;
    height: 392px;
    border-radius: 12px;
    box-shadow:
        0 0 0 2px rgba(245, 215, 110, 0.5),
        0 20px 60px rgba(0, 0, 0, 0.8),
        0 0 40px rgba(245, 215, 110, 0.2);
}
```

**Enlarged Text for Placeholders**:
All placeholder text elements are scaled up in the zoom view via nested CSS selectors:
- `.card-display__zoom-card .card-display__name` → 16px font
- `.card-display__zoom-card .card-display__text` → 12px font with 1.5 line-height
- `.card-display__zoom-card .card-display__stats` → 18px stat values

#### Implementation Locations
- `src/components/CardDisplay.tsx` - Hover state, position calculation, Portal rendering
- `src/components/CardDisplay.css` - `.card-display__zoom-overlay`, `.card-display__zoom-card`, enlarged placeholder styles

### 8.8 Mulligan System

#### Overview
At the start of the game, after drawing the initial 6-card hand, players are presented with a modal to review their hand and optionally mulligan (shuffle hand back and draw 6 new cards). This can only be done once per game.

#### Store State
Two new state properties control the mulligan flow:

```typescript
interface GameStore {
    // ... existing properties
    mulliganAvailable: boolean;  // true at game start, false after mulligan or keep
    showMulliganModal: boolean;  // controls modal visibility
}
```

#### Store Actions

**`takeMulligan(playerId: string)`**:
- Shuffles the player's hand back into their deck
- Draws 6 new cards
- Sets `mulliganAvailable: false` (prevents further mulligans)
- Closes the modal (`showMulliganModal: false`)
- Logs the action

**`keepHand()`**:
- Sets `mulliganAvailable: false`
- Closes the modal
- Logs that player kept their hand

#### initGame Flow
The `initGame` action was updated to show the mulligan modal after setup:

```typescript
initGame: (heroes, playerDeck) => {
    const raw = setupGame(heroes, playerDeck);
    const { state, log } = runSetup(raw);
    set({
        gameState: state,
        log: log.map(...),
        mulliganAvailable: true,   // Enable mulligan
        showMulliganModal: true,   // Show modal
    });
},
```

#### MulliganModal Component

**Props**:
```typescript
interface MulliganModalProps {
    hand: PlayerCard[];      // Cards to display for review
    onKeepHand: () => void;  // Called when player keeps hand
    onMulligan: () => void;  // Called when player mulligans
}
```

**Visual Design**:
- Full-screen semi-transparent backdrop
- Centered modal with medieval/fantasy styling
- Shows all 6 hand cards in a row for review
- Two prominent buttons: "Keep Hand" (green) and "Take Mulligan" (gold)
- Warning text explaining one-time use

**Animations**:
- Backdrop fade-in (0.3s)
- Modal slide-in with scale (0.3s)
- Hover effects on buttons

#### CSS Classes
| Class | Purpose |
|-------|---------|
| `.mulligan-modal__backdrop` | Full-screen dark overlay |
| `.mulligan-modal` | Centered modal container |
| `.mulligan-modal__title` | "Starting Hand" header |
| `.mulligan-modal__warning` | Red text for one-time warning |
| `.mulligan-modal__hand` | Card display row |
| `.mulligan-modal__button--keep` | Green "Keep" button |
| `.mulligan-modal__button--mulligan` | Gold "Mulligan" button |

#### Integration in GameTable
The modal renders conditionally at the end of the `GameTable` component:

```tsx
{showMulliganModal && (
    <MulliganModal
        hand={player.hand}
        onKeepHand={keepHand}
        onMulligan={() => takeMulligan(player.id)}
    />
)}
```

**Note**: Card zoom is disabled on cards in the mulligan modal (`disableZoom` prop) to prevent visual conflicts.

#### Implementation Locations
- `src/store/gameStore.ts` - `mulliganAvailable`, `showMulliganModal`, `takeMulligan`, `keepHand`
- `src/components/MulliganModal.tsx` - Modal component
- `src/components/MulliganModal.css` - Modal styling
- `src/components/GameTable.tsx` - Modal rendering and action wiring

---

## 8.9 Shadow Card System

**Implementation Date**: 2025-02-25

The Shadow Card System handles dealing and resolving shadow cards during the Combat phase, as per the game rules.

### Game Flow

1. **Deal Shadow Cards**: At the start of combat, one shadow card is dealt face-down to each engaged enemy from the encounter deck
2. **Enemy Attacks**: During each enemy's attack, the shadow card is revealed and its effect applied
3. **Effect Resolution**: Shadow effects modify the enemy's attack (bonus attack, direct damage, etc.)
4. **Cleanup**: After combat, all shadow cards are discarded to the encounter discard pile

### Shadow Effect Parsing

The engine parses shadow effect text to extract mechanical effects:

```typescript
// Attack bonus patterns
"+1 Attack", "+2 [attack]", "gets +3 Attack"
→ parseShadowAttackBonus(text): number

// Direct damage patterns
"deal 1 damage", "deals 2 damage to the defending character"
→ parseShadowDirectDamage(text): number
```

### Components

#### `<EngagedEnemyCard>` — Enemy with shadow cards

**Props**:
```typescript
interface EngagedEnemyCardProps {
    enemy: ActiveEnemy;  // Contains card, damage, shadowCards array
}
```

**Visual Design**:
- Main enemy card displayed via `<CardDisplay>`
- Shadow cards shown as face-down stack below the enemy
- Moon icon (🌑) on shadow card backs
- Hover tooltip shows shadow effect text (for debugging/transparency)
- Damage badge overlay when enemy has taken damage

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.engaged-enemy` | Container for enemy + shadow stack |
| `.engaged-enemy__card` | Enemy card wrapper |
| `.engaged-enemy__shadow-stack` | Shadow card container |
| `.engaged-enemy__shadow-card` | Individual shadow card |
| `.engaged-enemy__shadow-back` | Face-down card appearance |
| `.engaged-enemy__shadow-icon` | Moon icon on card back |
| `.engaged-enemy__shadow-label` | "X Shadow" text |
| `.engaged-enemy__damage-badge` | Damage indicator overlay |

### Combat Phase Logic (gameEngine.ts)

```typescript
export function stepCombat(state: GameState): { state: GameState; log: string[] } {
    // Step 1: Deal shadow cards to each engaged enemy
    for (const enemy of player.engagedEnemies) {
        let shadowCard = drawEncounterCard(nextState);
        enemy.shadowCards.push(shadowCard);
    }

    // Step 2: Enemy attacks with shadow resolution
    for (const enemy of enemiesWithShadow) {
        const shadowCard = enemy.shadowCards[0];
        const attackBonus = parseShadowAttackBonus(shadowCard.shadow);
        const directDamage = parseShadowDirectDamage(shadowCard.shadow);

        const totalAttack = enemy.card.attack + attackBonus;
        const damage = Math.max(1, totalAttack - defender.defense) + directDamage;
        // Apply damage to defender...
    }

    // Step 3: Discard shadow cards
    encounterDiscard.push(...shadowCardsToDiscard);
}
```

### Log Messages

The system generates descriptive log messages:
- `"Shadow card dealt to Forest Spider."`
- `"Shadow revealed (Dol Guldur Orcs): \"Shadow: +1 Attack\""`
- `"Shadow effect: Forest Spider gains +1 Attack this attack."`
- `"Forest Spider attacks Gimli: 2+1 ATK vs 2 DEF + 0 direct = 1 damage."`
- `"3 shadow card(s) discarded."`

### Implementation Locations

- `src/engine/gameEngine.ts` - `stepCombat()`, `parseShadowAttackBonus()`, `parseShadowDirectDamage()`
- `src/components/EngagedEnemyCard.tsx` - Shadow card display component
- `src/components/EngagedEnemyCard.css` - Shadow card styling
- `src/components/GameTable.tsx` - Uses `<EngagedEnemyCard>` for engaged enemies

---

## 8.10 Manual Combat Resolution

**Implementation Date**: 2025-02-25

The Manual Combat Resolution system replaces the automatic combat with an interactive UI where players choose defenders and attackers.

### Combat Phases

The combat phase is now split into sub-phases:

| Phase | Description | User Action |
|-------|-------------|-------------|
| `combat_defend` | Enemy is about to attack | Player selects a defender (hero or ally) |
| `combat_attack` | Player counter-attacks | Player selects one or more attackers |

### Combat State

A new `CombatState` interface tracks the current combat:

```typescript
interface CombatState {
    currentEnemyIndex: number;           // Which enemy is being resolved
    phase: 'enemy_attacks' | 'player_attacks';
    selectedDefender: CharacterRef | null;
    selectedAttackers: CharacterRef[];
    shadowRevealed: boolean;
    enemiesResolved: number[];           // Indices of resolved enemies
}

interface CharacterRef {
    type: 'hero' | 'ally';
    index: number;  // For allies
    code: string;   // For heroes
}
```

### Combat Flow

1. **Start Combat** (`startCombat` action):
   - Deal shadow cards to all engaged enemies
   - Initialize `combatState` with first enemy
   - Enter `combat_defend` phase

2. **Defense Phase** (for each enemy):
   - Player selects a defender (click on hero/ally)
   - Player can skip defense (undefended attack)
   - On confirm: reveal shadow card, apply damage to defender

3. **Attack Phase** (for each enemy):
   - Player selects attackers (click to toggle selection)
   - Multiple attackers combine their attack values
   - On confirm: deal damage to enemy, exhaust attackers

4. **End Combat**:
   - After all enemies resolved
   - Discard all shadow cards
   - Transition to Refresh phase

### CombatPanel Component

**Props**:
```typescript
interface CombatPanelProps {
    combatState: CombatState;
    currentEnemy: ActiveEnemy;
    heroes: Hero[];
    allies: Ally[];
    onSelectDefender: (ref: CharacterRef) => void;
    onConfirmDefense: () => void;
    onSkipDefense: () => void;
    onToggleAttacker: (ref: CharacterRef) => void;
    onConfirmAttack: () => void;
    onSkipAttack: () => void;
}
```

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│  ⚔️ Combat - Enemy Attack                    Enemy 1        │
├──────────────────────────────────────────────────────────────┤
│  ┌────────┐   │  CHOOSE DEFENDER           │  COMBAT PREVIEW │
│  │ Enemy  │   │                            │                 │
│  │  Card  │   │  HEROES:                   │  Enemy ATK: 2   │
│  └────────┘   │  [Aragorn 🛡1] [Gimli 🛡2]  │  Defender DEF:-2│
│  ⚔2 🛡1 ❤3   │                            │  ────────────── │
│               │  ALLIES:                   │  Damage: 0      │
│  SHADOW       │  [Gandalf 🛡4]             │                 │
│  🌑 Hidden    │                            │                 │
├──────────────────────────────────────────────────────────────┤
│              [Skip Defense]    [Confirm Defender]            │
└──────────────────────────────────────────────────────────────┘
```

**Features**:
- Enemy card display with stats
- Shadow card indicator (hidden/revealed)
- Character selection list with stats
- Combat preview showing damage calculation
- Action buttons for confirm/skip

### Store Actions

| Action | Description |
|--------|-------------|
| `startCombat()` | Deal shadow cards, initialize combat state |
| `selectDefender(ref)` | Set selected defender |
| `confirmDefense()` | Resolve enemy attack with selected defender |
| `skipDefense()` | Take undefended attack |
| `toggleAttacker(ref)` | Add/remove character from attackers |
| `confirmAttack()` | Resolve player attack, move to next enemy |
| `skipAttack()` | Skip attacking, move to next enemy |

### Shadow Card Resolution

During `confirmDefense`:
1. Shadow card is revealed (`shadowRevealed = true`)
2. Shadow effect text is parsed for attack bonuses
3. Total attack = base attack + shadow bonus
4. Damage = total attack - defender defense (minimum 0)
5. Direct damage from shadow effects is added on top

### Damage Application

**Defended Attack**:
- Damage dealt to the selected defender
- Defender is exhausted after defending

**Undefended Attack**:
- Full enemy attack value + shadow bonuses
- Damage dealt directly to first hero (no defense reduction)

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.combat-panel` | Fixed positioned overlay container |
| `.combat-panel__header` | Title bar with enemy count |
| `.combat-panel__main` | 3-column grid layout |
| `.combat-panel__enemy-section` | Enemy card and stats |
| `.combat-panel__shadow` | Shadow card display |
| `.combat-panel__characters-section` | Character selection |
| `.combat-panel__character` | Clickable character option |
| `.combat-panel__character.selected` | Green border when selected |
| `.combat-panel__character.unavailable` | Grayed out if exhausted |
| `.combat-panel__preview-section` | Damage calculation preview |
| `.combat-panel__actions` | Bottom button row |
| `.combat-overlay` | Full-screen dark backdrop |

### Implementation Locations

- `src/engine/types.ts` - `CombatState`, `CharacterRef`, `Ally` interface, new phases
- `src/components/CombatPanel.tsx` - Combat UI component
- `src/components/CombatPanel.css` - Combat panel styling
- `src/components/GameTable.tsx` - CombatPanel integration
- `src/store/gameStore.ts` - Combat actions (`startCombat`, `selectDefender`, etc.)

---

## 8.11 Quest Phase Manual Commitment

The Quest phase now supports manual character commitment, allowing players to choose which heroes and allies to commit to the quest.

### Quest Sub-Phases

| Sub-Phase | Description |
|-----------|-------------|
| `quest_commit` | Player selects characters to commit; QuestCommitPanel is displayed |
| `quest_staging` | Reveal encounter cards from encounter deck |
| `quest_resolve` | Compare committed Willpower vs staging area Threat |

### Game State Additions

```typescript
// Added to GameState interface
questCommitment: CharacterRef[];  // Characters committed to current quest

// CharacterRef (reused from combat)
interface CharacterRef {
    type: 'hero' | 'ally';
    index: number;
    code: string;
}
```

### Store Actions

| Action | Description |
|--------|-------------|
| `startQuestCommit()` | Transitions to `quest_commit` phase, clears previous commitment |
| `toggleQuestCommit(ref)` | Adds/removes a character from commitment list |
| `confirmQuestCommit()` | Exhausts committed characters, proceeds to `quest_staging` |
| `revealStaging()` | Reveals one encounter card, proceeds to `quest_resolve` |
| `resolveQuest()` | Calculates Willpower vs Threat, applies progress or threat raise |

### QuestCommitPanel Component

**Purpose**: Modal overlay for selecting characters to commit to the quest.

**Props**:
```typescript
interface QuestCommitPanelProps {
    heroes: Hero[];
    allies: Ally[];
    committedCharacters: CharacterRef[];
    stagingThreat: number;
    onToggleCommit: (ref: CharacterRef) => void;
    onConfirmCommit: () => void;
    onSkipCommit: () => void;
}
```

**Layout**:
```
┌────────────────────────────────────────────────────────┐
│  🗺️ Quest Phase - Commit Characters                   │
├────────────────────────────────────────────────────────┤
│  Select characters to commit to the quest:            │
│                                                       │
│  HEROES:                                              │
│  [✓ Aragorn 🌟2] [✓ Gimli 🌟2] [○ Legolas 🌟1]       │
│                                                       │
│  ALLIES:                                              │
│  [✓ Gandalf 🌟4] [○ Snowbourn Scout 🌟0]             │
│                                                       │
├────────────────────────────────────────────────────────┤
│  Quest Preview                                        │
│  Committed Willpower: 8 🌟                            │
│  Staging Area Threat: 5 ⚫                            │
│  Expected Result: +3 progress                         │
├────────────────────────────────────────────────────────┤
│          [Skip (0 Willpower)]  [Confirm (8 🌟)]       │
└────────────────────────────────────────────────────────┘
```

**Features**:
- Shows all ready (non-exhausted) heroes and allies
- Click to toggle commitment (visual selection with checkmark)
- Unavailable characters (exhausted/defeated) shown grayed out
- Real-time preview of total willpower and expected result
- Warning message if no characters are committed
- "Skip" button commits with 0 willpower
- "Confirm" button exhausts selected characters and proceeds

### PhaseControlBar Updates

The PhaseControlBar now accepts `questActions` prop for quest-specific callbacks:

```typescript
interface QuestActions {
    onStartCommit?: () => void;
    onRevealStaging?: () => void;
    onResolveQuest?: () => void;
}
```

Phase button mapping:
| Phase | Button | Action |
|-------|--------|--------|
| `quest` | "Start Quest" | Opens QuestCommitPanel |
| `quest_commit` | (none - panel handles it) | - |
| `quest_staging` | "Reveal Encounter Cards" | Reveals cards |
| `quest_resolve` | "Resolve Quest" | Calculates result |

### Quest Resolution Logic

1. Calculate total committed Willpower from `questCommitment` characters
2. Calculate staging area Threat (sum of all card threat values)
3. Compare:
   - If Willpower > Threat: Place progress = Willpower - Threat
     - Progress goes to active location first, then current quest
   - If Threat > Willpower: Raise player threat = Threat - Willpower
   - If equal: No change
4. Check for quest completion (progress ≥ quest points)
5. Clear `questCommitment` after resolution

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.quest-commit-panel` | Fixed positioned overlay container |
| `.quest-commit-panel__header` | Title bar |
| `.quest-commit-panel__characters-section` | Character selection area |
| `.quest-commit-panel__character-group` | Heroes or Allies group |
| `.quest-commit-panel__character` | Clickable character option |
| `.quest-commit-panel__character.committed` | Green highlight when selected |
| `.quest-commit-panel__character.unavailable` | Grayed out if exhausted |
| `.quest-commit-panel__preview-section` | Willpower/Threat/Result preview |
| `.quest-commit-panel__preview-result.positive` | Green for progress |
| `.quest-commit-panel__preview-result.negative` | Red for threat raise |
| `.quest-commit-panel__actions` | Bottom button row |

### Implementation Locations

- `src/engine/types.ts` - Quest sub-phases, `questCommitment` in GameState
- `src/components/QuestCommitPanel.tsx` - Quest commitment UI component
- `src/components/QuestCommitPanel.css` - Quest panel styling
- `src/components/PhaseControlBar.tsx` - Quest phase buttons, `questActions` prop
- `src/components/GameTable.tsx` - QuestCommitPanel integration
- `src/store/gameStore.ts` - Quest actions (`startQuestCommit`, `toggleQuestCommit`, `confirmQuestCommit`, `revealStaging`, `resolveQuest`)

---

## 8.12 Travel Phase Implementation

The Travel phase allows players to travel to a location in the staging area, making it the active location.

### Store Actions

| Action | Description |
|--------|-------------|
| `travelToLocation(location)` | Moves a location from staging area to active location |
| `skipTravel()` | Advances to Encounter phase without traveling |

### Travel Rules

1. **Preconditions**:
   - Must be in `travel` phase
   - Cannot travel if there's already an active location
   - Only locations (type_code === 'location') can be traveled to

2. **Travel Effect**:
   - Remove location from staging area
   - Set as active location with `progress: 0`
   - Log any "Travel:" effects (not yet resolved)
   - Advance to Encounter phase

3. **Quest Progress Order**:
   - Progress tokens go to active location first
   - When location's progress ≥ quest_points, location is explored (removed)
   - Excess progress then goes to the current quest

### Auto-Skip Feature

The Travel phase automatically skips when there's no meaningful action available:

| Condition | Behavior |
|-----------|----------|
| Active location exists | Auto-skip with message "Auto-skipped Travel (active location exists)." |
| No locations in staging | Auto-skip with message "Auto-skipped Travel (no locations in staging)." |
| Locations available, no active | Player must choose to travel or skip |

**Implementation**: The auto-skip logic is in `resolveQuest()` function. After transitioning to Travel phase, it checks conditions and calls `skipTravel()` via `setTimeout` if auto-skip applies.

```typescript
// In resolveQuest(), after setting phase to 'travel':
if (hasActiveLocation || !hasLocationsInStaging) {
    setTimeout(() => {
        get().skipTravel();
        // Log reason for auto-skip
    }, 50);
}
```

### StagingArea Component Updates

**New Props**:
```typescript
interface StagingAreaProps {
    cards: EncounterCard[];
    onCardClick?: (card: EncounterCard, index: number) => void;
    isTravelPhase?: boolean;
    hasActiveLocation?: boolean;
}
```

**Visual Feedback**:
- Travel hint message shown during travel phase ("🚶 Click a location to travel there")
- Locations get green border and glow effect when travelable
- "🚶 Travel" badge appears on travelable locations
- Hover effect raises the card

### PhaseControlBar Updates

**New Props**:
```typescript
interface TravelActions {
    onSkipTravel?: () => void;
}

interface PhaseControlBarProps {
    // ... existing props
    travelActions?: TravelActions;
    hasActiveLocation?: boolean;
    hasLocationsInStaging?: boolean;
}
```

**Context-Aware Buttons**:
| Condition | Button |
|-----------|--------|
| Active location exists | "Skip (Location Active)" |
| No locations in staging | "Skip (No Locations)" |
| Locations available | "Skip Travel" |

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.staging-area__travel-hint` | Green hint message during travel phase |
| `.staging-area__card-wrapper` | Wrapper for card + travel badge |
| `.staging-area__card-wrapper.travelable` | Green border and cursor pointer |
| `.staging-area__travel-badge` | Green badge with "🚶 Travel" text |

### Implementation Locations

- `src/store/gameStore.ts` - `travelToLocation`, `skipTravel` actions
- `src/components/StagingArea.tsx` - Travel phase props, clickable locations
- `src/components/StagingArea.css` - Travel styling
- `src/components/PhaseControlBar.tsx` - Travel actions and context-aware buttons
- `src/components/GameTable.tsx` - Integrated travel props

---
*Created on 2025-02-24 based on LOTR Rules Reference.*
*Updated on 2025-02-25 with Card Playing System, Ally Display Zone, Attachment Display, Card Zoom, Mulligan System, Shadow Card System, Manual Combat Resolution, Quest Phase Manual Commitment, Travel Phase, and Treachery Effect Resolution documentation.*

---

## 17. Treachery Effect Resolution System

The treachery effect resolution system handles "When Revealed" effects for treachery cards during the Quest Phase staging step.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Treachery Resolution Flow                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   revealStaging() ─────► isTreacheryCard(card) ────► TRUE       │
│         │                        │                    │         │
│         │                        │                    ▼         │
│         │                        │            resolveTreachery()│
│         │                        │                    │         │
│         │                        ▼                    │         │
│         │                      FALSE                  ▼         │
│         │                        │            TREACHERY_HANDLERS│
│         │                        │               (registry)     │
│         ▼                        ▼                    │         │
│   Add to staging         Handler by code              │         │
│                                                       ▼         │
│                                              TreacheryResult    │
│                                            { state, log,        │
│                                              discard }          │
└─────────────────────────────────────────────────────────────────┘
```

### Core Types

```typescript
// Result of resolving a treachery card
interface TreacheryResult {
    state: GameState;      // Updated game state after effect
    log: string[];         // Log messages to display
    discard: boolean;      // If true, card goes to encounter discard
                           // If false, card was attached (e.g., condition)
}

// Handler function signature
type TreacheryHandler = (state: GameState, card: EncounterCard) => TreacheryResult;
```

### Treachery Handler Registry

The system uses a handler registry pattern to map card codes to effect handlers:

```typescript
const TREACHERY_HANDLERS: Record<string, TreacheryHandler> = {
    '01102': resolveNecromancersReach,  // The Necromancer's Reach
    '01103': resolveDrivenByShadow,     // Driven by Shadow
    '01104': resolveDespair,            // Despair
    '01077': resolveGreatForestWeb,     // Great Forest Web
    '01078': resolveCaughtInAWeb,       // Caught in a Web
};
```

### Implemented Treachery Effects

| Card Code | Card Name | Effect |
|-----------|-----------|--------|
| `01102` | The Necromancer's Reach | Assign 1 damage to each exhausted character |
| `01103` | Driven by Shadow | Place progress per staging card (beneficial!) |
| `01104` | Despair | Raise each player's threat by 3 |
| `01077` | Great Forest Web | Attach condition: hero cannot ready without paying 2 resources |
| `01078` | Caught in a Web | Attach condition: hero cannot collect resources |

### Condition Attachments

Some treacheries attach to heroes as "Condition" attachments instead of being discarded:

```typescript
// Creating a condition attachment
const conditionAttachment: PlayerCard = {
    code: card.code,
    name: card.name,
    type_code: 'attachment',
    text: 'Effect description...',
    traits: 'Condition.',
    quantity: 1,
};

// Attach to hero
const updatedHeroes = player.heroes.map((h) =>
    h.code === targetHero.code
        ? { ...h, attachments: [...h.attachments, conditionAttachment] }
        : h
);
```

For condition attachments, `TreacheryResult.discard` is `false`, indicating the card should not go to the encounter discard pile.

### Integration with Staging Phase

The `revealStaging` action in `gameStore.ts` integrates with the treachery system:

```typescript
revealStaging: () => {
    // ... reveal card from encounter deck

    if (isTreacheryCard(revealed)) {
        // Resolve treachery effect
        const result = resolveTreachery(updatedState, revealed);
        updatedState = result.state;
        msgs.push(...result.log.slice(1)); // Skip duplicate reveal message

        if (result.discard) {
            encounterDiscard.push(revealed);
        }
        // If not discarded, it was attached as a condition
    } else {
        // Add enemy/location to staging area
        newStagingArea.push(revealed);
    }
};
```

### Game Over Detection

Treachery effects can trigger game over conditions:
- **All heroes defeated**: Checked in `resolveNecromancersReach`
- **Threat elimination**: Checked in `resolveDespair` when any player reaches threat 50

### Unit Tests

The treachery system has comprehensive unit tests (25 tests total):

| Test Suite | Tests |
|------------|-------|
| `resolveNecromancersReach` | 6 tests (exhausted damage, ally destruction, game over) |
| `resolveDrivenByShadow` | 4 tests (progress placement, quest completion) |
| `resolveDespair` | 4 tests (threat raise, cap at 50, elimination) |
| `resolveGreatForestWeb` | 4 tests (condition attachment, no heroes fallback) |
| `resolveCaughtInAWeb` | 3 tests (condition attachment, effect text) |
| `resolveTreachery` | 2 tests (routing, unknown cards) |
| `isTreacheryCard` | 2 tests (type detection) |

Run tests with:
```bash
npm test
```

### File Locations

- `src/engine/treacheryEffects.ts` - Handler functions and resolution system
- `src/engine/treacheryEffects.test.ts` - Unit tests (25 tests)
- `src/store/gameStore.ts` - `revealStaging` integration

---

## 18. Rules-Compliant Engagement System

The engagement system handles enemy engagement during the Encounter phase according to official rules: engage enemies iteratively from highest to lowest engagement cost, support optional engagement, and trigger "When Engaged" effects.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Engagement Phase Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   stepEncounter() ─────► Optional Engagement (via UI action)    │
│         │                                                       │
│         ▼                                                       │
│   ┌─────────────────────────────────────────────┐               │
│   │          ITERATIVE ENGAGEMENT LOOP          │               │
│   │  ┌─────────────────────────────────────────┐│               │
│   │  │ findHighestQualifyingEnemy()            ││               │
│   │  │   - Find enemy with highest cost        ││               │
│   │  │   - Where cost ≤ player threat          ││               │
│   │  └─────────────────────────────────────────┘│               │
│   │                    │                        │               │
│   │                    ▼                        │               │
│   │  ┌─────────────────────────────────────────┐│               │
│   │  │ engageEnemy()                           ││               │
│   │  │   - Move enemy to engaged enemies       ││               │
│   │  │   - Trigger When Engaged effects        ││               │
│   │  └─────────────────────────────────────────┘│               │
│   │                    │                        │               │
│   │                    ▼                        │               │
│   │            More qualifying enemies?         │               │
│   │                YES │ NO                     │               │
│   │              ──────┴──────────────────────► │               │
│   └─────────────────────────────────────────────┘               │
│                         │                                       │
│                         ▼                                       │
│               Transition to Combat Phase                        │
└─────────────────────────────────────────────────────────────────┘
```

### Core Functions

```typescript
// Find highest cost enemy that qualifies for engagement
function findHighestQualifyingEnemy(
    stagingArea: GameState['stagingArea'],
    playerThreat: number
): { enemy: EncounterCard; index: number } | null;

// Engage a single enemy with a player
function engageEnemy(
    state: GameState,
    enemy: EncounterCard,
    enemyIndex: number,
    playerId: string
): { state: GameState; log: string[] };

// Optional engagement - player chooses to engage enemy regardless of cost
function optionalEngagement(
    state: GameState,
    enemyIndex: number,
    playerId: string
): { state: GameState; log: string[] };

// Main encounter phase handler - iterative engagement
function stepEncounter(state: GameState): { state: GameState; log: string[] };
```

### Engagement Order

Enemies are engaged in order of **highest engagement cost first**:

```typescript
// Example: Player threat = 35, enemies with costs 20, 25, 30
// Engagement order: 30 → 25 → 20

while (continueEngagement) {
    const qualifying = findHighestQualifyingEnemy(nextState.stagingArea, player.threat);
    if (qualifying) {
        const { enemy, index } = qualifying;
        const result = engageEnemy(nextState, enemy, index, player.id);
        // ...
    } else {
        continueEngagement = false;
    }
}
```

### When Engaged Effects

Some enemies have effects that trigger when they engage a player:

```typescript
const WHEN_ENGAGED_EFFECTS: Record<string, TreacheryHandler> = {
    // Forest Spider (01089): Characters get -1 defense until end of phase
    '01089': (state, enemy, playerId) => {
        return { state, log: [`When Engaged: Forest Spider - Characters get -1 defense...`] };
    },

    // Hummerhorns (01082): Deal 5 damage to a hero
    '01082': (state, enemy, playerId) => {
        // Deal 5 damage to first hero
        const newDamage = targetHero.damage + 5;
        // Update state, check for defeat...
        return { state: updatedState, log: [...] };
    },
};
```

### Optional Engagement

Players can optionally engage any enemy from the staging area, regardless of engagement cost:

```typescript
// Store action
optionallyEngageEnemy: (enemyIndex: number) => {
    const result = optionalEngagement(gameState, enemyIndex, player.id);
    set({ gameState: result.state, log: [...log, ...result.log] });
};
```

This allows strategic choices like:
- Engage a high-cost enemy early to reduce staging threat
- Control which enemy attacks which player (in two-handed mode)
- Trigger beneficial "When Engaged" effects at optimal times

### Unit Tests

The engagement system has comprehensive unit tests (21 tests):

| Test Suite | Tests |
|------------|-------|
| `stepEncounter - Engagement Order` | 5 tests (highest cost first, cost filtering, empty staging) |
| `engageEnemy` | 3 tests (move enemy, create ActiveEnemy, logging) |
| `optionalEngagement` | 4 tests (voluntary engagement, error handling, When Engaged) |
| `When Engaged Effects` | 5 tests (Hummerhorns damage, Forest Spider, game over) |
| `Iterative Engagement` | 2 tests (multi-enemy order, count) |
| `Phase Transition` | 2 tests (combat phase, game over) |

Run tests with:
```bash
npm test
```

### File Locations

- `src/engine/gameEngine.ts` - `stepEncounter()`, `engageEnemy()`, `optionalEngagement()`
- `src/engine/engagement.test.ts` - Unit tests (21 tests)
- `src/store/gameStore.ts` - `optionallyEngageEnemy` action

---

## 19. Quest Stage Transition System

The quest stage system handles transitions between quest stages, "When Revealed" effects for new stages, ongoing "Forced" effects, and victory conditions.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Quest Stage System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   resolveQuest() ─────► Progress >= Quest Points?               │
│         │                        │                              │
│         │                        ▼ YES                          │
│         │               Advance to next stage                   │
│         │                        │                              │
│         │                        ▼                              │
│         │           resolveQuestStageTransition()               │
│         │                   (When Revealed)                     │
│         │                        │                              │
│         ▼                        │                              │
│   revealStaging() ◄──────────────┘                              │
│         │                                                       │
│         ▼                                                       │
│   getEncounterCardsToReveal() ──► Stage 3? Return 2             │
│         │                         Otherwise: Return 1           │
│         │                                                       │
│         ▼                                                       │
│   checkVictoryCondition() ──► Stage 3 + Empty Deck = VICTORY    │
└─────────────────────────────────────────────────────────────────┘
```

### Quest Stages (Passage Through Mirkwood)

| Stage | Code | Name | Quest Points | Special Rules |
|-------|------|------|--------------|---------------|
| 1 | 01119A | Flies and Spiders | 8 | Setup: Add Forest Spider + Old Forest Road |
| 2 | 01120A | A Fork in the Road | 10 | When Revealed: Add "Caught in a Web" to staging |
| 3 | 01121A | Escape from Mirkwood | 0 | Reveal 2 cards; Victory when deck empty |

### Core Functions

```typescript
// Handle When Revealed effects when advancing to a new stage
function resolveQuestStageTransition(
    state: GameState,
    newQuest: EncounterCard
): QuestStageResult;

// Get number of encounter cards to reveal (1 normally, 2 on Stage 3)
function getEncounterCardsToReveal(state: GameState): number;

// Check if victory condition is met (Stage 3 + empty deck)
function checkVictoryCondition(state: GameState): { victory: boolean; reason: string };

// Check if Stage 2 Forced effect should trigger (no enemies in play)
function checkStage2ForcedEffect(state: GameState): boolean;
```

### Stage 2: "When Revealed" Effect

When players advance to Stage 2, the set-aside "Caught in a Web" card is added to the staging area:

```typescript
function resolveStage2WhenRevealed(state: GameState): QuestStageResult {
    const newStagingArea = [...state.stagingArea, CAUGHT_IN_A_WEB_SETASIDE];
    return {
        state: { ...state, stagingArea: newStagingArea },
        log: ['When Revealed: Adding "Caught in a Web" to the staging area.'],
    };
}
```

### Stage 2: Forced Effect

Stage 2 has a Forced effect: "At the end of the encounter phase, if there are no enemies in play, reveal the top card of the encounter deck."

```typescript
// In stepEncounter()
if (checkStage2ForcedEffect(nextState)) {
    // Reveal encounter card
    let revealedCard: EncounterCard | null;
    [revealedCard, nextState] = drawEncounterCard(nextState);
    // Add to staging area...
}
```

### Stage 3: Reveal 2 Cards

Stage 3 requires revealing 2 encounter cards during the quest phase staging step:

```typescript
function getEncounterCardsToReveal(state: GameState): number {
    if (state.currentQuest?.code === '01121A') {
        return 2;
    }
    return 1;
}

// In revealStaging()
const cardsToReveal = getEncounterCardsToReveal(gameState);
for (let i = 0; i < cardsToReveal; i++) {
    // Reveal and resolve each card...
}
```

### Stage 3: Victory Condition

Players win when both the encounter deck AND discard pile are empty on Stage 3:

```typescript
function checkVictoryCondition(state: GameState): { victory: boolean; reason: string } {
    if (state.currentQuest?.code === '01121A') {
        if (state.encounterDeck.length === 0 && state.encounterDiscard.length === 0) {
            return {
                victory: true,
                reason: '🏆 VICTORY! The encounter deck is empty - you have escaped Mirkwood!',
            };
        }
    }
    return { victory: false, reason: '' };
}
```

### Unit Tests

The quest stage system has comprehensive unit tests (26 tests):

| Test Suite | Tests |
|------------|-------|
| `resolveQuestStageTransition` | 4 tests (Stage 1/2/3 transitions, unknown stages) |
| `getEncounterCardsToReveal` | 4 tests (1 for Stage 1/2, 2 for Stage 3, null quest) |
| `checkVictoryCondition` | 5 tests (victory on Stage 3 with empty deck, no victory otherwise) |
| `checkStage2ForcedEffect` | 6 tests (enemies in staging/engaged, locations) |
| `getCurrentStageNumber` | 4 tests (stage number retrieval) |
| `isOnFinalStage` | 3 tests (final stage detection) |

Run tests with:
```bash
npm test
```

### File Locations

- `src/engine/questStageEffects.ts` - Stage effect handlers and utilities
- `src/engine/questStageEffects.test.ts` - Unit tests (26 tests)
- `src/engine/gameEngine.ts` - Stage 2 Forced effect in `stepEncounter()`
- `src/store/gameStore.ts` - `resolveQuest()` and `revealStaging()` integration

---

## 20. Keyword Resolution System

The keyword system handles special keywords on encounter cards that modify game rules when revealed during staging.

### Keywords Implemented

| Keyword | Effect | Implementation |
|---------|--------|----------------|
| **Surge** | Reveal an additional encounter card | `hasSurge()` detects, `resolveKeywords()` returns surge flag |
| **Doomed X** | Each player raises threat by X | `getDoomedValue()` extracts X, `resolveKeywords()` applies |

### Architecture

```typescript
// keywords.ts - Keyword detection and resolution

/**
 * Check if a card has the Surge keyword.
 * Searches keywords field, traits field, and text field.
 */
function hasSurge(card: EncounterCard): boolean;

/**
 * Extract Doomed X value from a card.
 * Returns 0 if no Doomed keyword found.
 * Parses "Doomed 2" format from keywords, traits, or text.
 */
function getDoomedValue(card: EncounterCard): number;

/**
 * Check if a card has any keywords that need resolution.
 */
function hasKeywords(card: EncounterCard): boolean;

/**
 * Resolve all keywords on an encounter card.
 * Returns updated state, log messages, and surge flag.
 */
function resolveKeywords(state: GameState, card: EncounterCard): KeywordResult;

interface KeywordResult {
    state: GameState;      // Updated game state (threat raised, etc.)
    log: string[];         // Log messages for keyword resolution
    surge: boolean;        // If true, reveal an additional card
}
```

### Integration with Staging

The `revealStaging()` function in gameStore.ts calls `resolveKeywords()` after revealing each card:

```typescript
// In revealStaging()
const revealSingleCard = (): boolean => {
    // ... reveal card from deck ...

    // Resolve keywords (Doomed, Surge) before other effects
    const keywordResult = resolveKeywords(updatedState, revealed);
    updatedState = keywordResult.state;
    msgs.push(...keywordResult.log);
    if (keywordResult.surge) {
        surgeCount++;
    }

    // Check if game ended due to keyword effects (e.g., threat elimination)
    if (updatedState.phase === 'game_over') {
        return false;
    }

    // ... continue with treachery/enemy/location handling ...
    return true;
};

// Reveal main cards
for (let i = 0; i < cardsToReveal; i++) {
    if (!revealSingleCard()) break;
}

// Handle Surge: reveal additional cards for each surge
while (surgeCount > 0 && updatedState.phase !== 'game_over') {
    surgeCount--;
    if (!revealSingleCard()) break;
}
```

### Doomed Resolution

When a card with "Doomed X" is revealed:
1. Extract the X value using `getDoomedValue()`
2. Raise each player's threat by X (capped at 50)
3. Check for threat elimination (game over at 50 threat)
4. Log the effect for each player

```typescript
const doomedValue = getDoomedValue(card);
if (doomedValue > 0) {
    logs.push(`Doomed ${doomedValue}: Each player raises their threat by ${doomedValue}.`);

    const updatedPlayers = nextState.players.map((player) => {
        const newThreat = Math.min(50, player.threat + doomedValue);
        logs.push(`${player.name}'s threat raised to ${newThreat}.`);
        return { ...player, threat: newThreat };
    });

    // Check for threat elimination
    const eliminated = nextState.players.filter((p) => p.threat >= 50);
    if (eliminated.length > 0) {
        logs.push(`${eliminated.map((p) => p.name).join(', ')} eliminated by threat!`);
        nextState = { ...nextState, phase: 'game_over' };
    }
}
```

### Surge Resolution

Surge is handled by counting surge triggers and revealing additional cards:

1. When a card with Surge is resolved, increment `surgeCount`
2. After the main reveal loop, reveal one card per surge
3. Surge can chain (a surged card may also have Surge)
4. Continue until no more surges or encounter deck empty

### Keyword Detection

Keywords can appear in multiple card fields:
- `keywords` field (RingsDB format)
- `traits` field (less common)
- `text` field (e.g., "Surge. When Revealed: ...")

The detection functions search all three locations case-insensitively.

### Display Utilities

```typescript
// Parse keywords for programmatic use
function parseKeywords(card: EncounterCard): string[];
// Returns: ['Surge', 'Doomed 2']

// Format keywords for display
function formatKeywords(card: EncounterCard): string;
// Returns: 'Surge. Doomed 2.'
```

### Unit Tests

The keyword system has comprehensive unit tests (38 tests):

| Test Suite | Tests |
|------------|-------|
| `hasSurge` | 7 tests (detection in text, keywords, traits, case-insensitive) |
| `getDoomedValue` | 8 tests (value extraction, multiple locations, case-insensitive) |
| `hasKeywords` | 4 tests (combined keyword detection) |
| `resolveKeywords` | 9 tests (threat raising, elimination, surge flag, combined) |
| `parseKeywords` | 4 tests (keyword array extraction) |
| `formatKeywords` | 3 tests (display formatting) |
| Integration tests | 4 tests (real card data scenarios) |

Run tests with:
```bash
npm test
```

### File Locations

- `src/engine/keywords.ts` - Keyword parser and resolver
- `src/engine/keywords.test.ts` - Unit tests (38 tests)
- `src/store/gameStore.ts` - `revealStaging()` integration with keyword resolution

---

## 21. Event Effect Resolution System

The event effect system handles player event cards, resolving their effects when played. It uses a handler registry pattern similar to the treachery and keyword systems.

### Architecture

```typescript
// eventEffects.ts - Event definitions and resolution

interface EventDefinition {
    code: string;          // RingsDB card code
    name: string;          // Card name
    timing: EventTiming;   // When event can be played
    target?: TargetRequirement;  // What the event targets
    canPlay?: (state, playerId) => { canPlay: boolean; reason?: string };
    resolve: (state, playerId, target?) => EventEffectResult;
}

type EventTiming = 'action' | 'combat_action' | 'response';

type TargetType =
    | 'none'              // No target needed
    | 'ally'              // Target an ally in play
    | 'ally_in_hand'      // Target an ally in hand
    | 'ally_in_discard'   // Target an ally in discard pile
    | 'hero'              // Target a hero
    | 'character'         // Target any character
    | 'engaged_enemy'     // Target an engaged enemy
    | 'card_in_discard';  // Target a card in discard pile

interface EventEffectResult {
    state: GameState;
    log: string[];
    success: boolean;
    error?: string;
    endOfPhaseEffect?: EndOfPhaseEffect;  // For delayed effects
}
```

### Registered Events

| Code | Name | Effect | Timing |
|------|------|--------|--------|
| 01020 | Ever Vigilant | Ready an exhausted ally | Action |
| 01021 | Common Cause | Exhaust hero to ready another | Action |
| 01023 | Sneak Attack | Put ally from hand into play temporarily | Action |
| 01025 | Grim Resolve | Ready all characters in play | Action |
| 01032 | Blade Mastery | Character gains +1 Attack/Defense | Action |
| 01034 | Feint | Enemy cannot attack this phase | Combat Action |
| 01035 | Quick Strike | Immediate attack against enemy | Action |
| 01037 | Swift Strike | Deal 2 damage to attacking enemy | Response |
| 01046 | The Galadhrim's Greeting | Reduce threat by 6 | Action |
| 01048 | Hasty Stroke | Cancel shadow effect | Response |
| 01050 | A Test of Will | Cancel "When Revealed" effect | Response |
| 01051 | Stand and Fight | Play ally from any discard pile | Action |
| 01052 | A Light in the Dark | Return enemy to staging area | Action |
| 01053 | Dwarven Tomb | Return Spirit card from discard to hand | Action |

### Integration with playCard

The `playCard` function in gameStore.ts handles events by:

1. Checking if the event has a registered handler
2. Validating `canPlay` conditions (timing, phase, available targets)
3. If event requires a target, return `requiresTarget: true` to prompt UI
4. Resolve the event effect and apply state changes
5. Move event to discard pile
6. Track end-of-phase effects (like Sneak Attack ally return)

```typescript
case 'event': {
    const eventDef = getEventDefinition(card.code);

    // Check if event can be played
    if (eventDef?.canPlay) {
        const canPlayResult = eventDef.canPlay(gameState, playerId);
        if (!canPlayResult.canPlay) {
            return { success: false, error: canPlayResult.reason };
        }
    }

    // If target required but not provided, return targeting info
    if (eventRequiresTarget(card) && !eventTarget) {
        return {
            success: false,
            requiresTarget: true,
            targetType: eventDef.target.type,
            targetDescription: eventDef.target.description,
        };
    }

    // Resolve the event effect
    const result = resolveEventEffect(gameState, card, playerId, eventTarget);

    if (!result.success) {
        return { success: false, error: result.error };
    }

    // Apply state changes, move to discard, etc.
    // ...
}
```

### Timing Restrictions

Events have timing restrictions that are validated before resolution:

| Timing | Valid Phases |
|--------|--------------|
| Action | Any phase with an action window |
| Combat Action | `combat`, `combat_defend`, `combat_attack` only |
| Response | After specific triggering events |

### End-of-Phase Effects

Some events have delayed effects that trigger at the end of a phase:

```typescript
interface EndOfPhaseEffect {
    type: 'return_ally_to_hand';
    allyCode: string;
    playerId: string;
}
```

Sneak Attack returns the played ally to hand at end of phase. This is tracked via `endOfPhaseEffect` in the result.

### Target Selection

Events that require targets return targeting information for the UI:

```typescript
// Returns valid targets for an event
function getEventTargets(state, eventCard, playerId): {
    type: TargetType;
    targets: any[];
} | null;

// Check if event needs a target
function eventRequiresTarget(eventCard: PlayerCard): boolean;

// Get target description for UI
function getEventTargetDescription(eventCard: PlayerCard): string | null;
```

### Unit Tests

The event effect system has 29 unit tests:

| Test Suite | Tests |
|------------|-------|
| Event Registry | 6 tests (event registration verification) |
| Ever Vigilant | 3 tests (ready ally, fail if not exhausted) |
| Sneak Attack | 3 tests (put ally into play, end-of-phase effect) |
| Grim Resolve | 2 tests (ready all characters) |
| Feint | 2 tests (prevent attack, combat timing) |
| Quick Strike | 3 tests (immediate attack, destroy enemy) |
| The Galadhrim's Greeting | 2 tests (reduce threat) |
| Stand and Fight | 2 tests (play ally from discard) |
| A Light in the Dark | 1 test (return enemy to staging) |
| Dwarven Tomb | 2 tests (return Spirit card) |
| Unknown Events | 1 test (graceful handling) |
| Targeting Utilities | 2 tests (target selection) |

Run tests with:
```bash
npm test
```

### File Locations

- `src/engine/eventEffects.ts` - Event definitions and resolution system
- `src/engine/eventEffects.test.ts` - Unit tests (29 tests)
- `src/store/gameStore.ts` - `playCard()` integration with event resolution

---

## 22. Location Ability System

The Location Ability System handles travel costs, response effects, and constant effects for location cards in the Passage Through Mirkwood scenario.

### Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                       Location Ability Resolution Flow                          │
├────────────────────────────────────────────────────────────────────────────────┤
│   travelToLocation(location) ────► canPayTravelCost(state, location, playerId) │
│         │                                       │                               │
│         │                            ┌──────────┴──────────┐                    │
│         │                        canPay=true          canPay=false              │
│         │                            │                     │                    │
│         ▼                            ▼                     ▼                    │
│   resolveTravelCost() ◄─────────── proceed            block travel              │
│         │                                                                       │
│         ▼                                                                       │
│   resolveAfterTraveling() ────► Response effects (ready character, etc.)       │
│         │                                                                       │
│         ▼                                                                       │
│   hasWhileActiveEffect() ────► Track constant effects (willpower mod, etc.)    │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Core Types

```typescript
// locationAbilities.ts - Location ability types and handlers

type LocationAbilityType =
    | 'travel_cost'        // Cost to travel (checked before travel)
    | 'after_traveling'    // Response after becoming active location
    | 'while_active'       // Constant effect while location is active
    | 'after_exploring';   // Response after location is explored

interface LocationAbility {
    code: string;           // Card code (e.g., '01099')
    name: string;           // Card name (e.g., 'Old Forest Road')
    type: LocationAbilityType;
    description: string;    // Human-readable effect description
    canExecute?: (state: GameState, playerId: string) => { canExecute: boolean; reason?: string };
    execute: (state: GameState, location: EncounterCard, playerId: string) => LocationAbilityResult;
}

interface LocationAbilityResult {
    state: GameState;       // Updated game state
    log: string[];          // Messages for game log
    success: boolean;       // Whether effect resolved successfully
    error?: string;         // Error message if failed
    blockTravel?: boolean;  // If true, prevent travel action
}
```

### Location Ability Registry

Abilities are registered by card code in a map:

```typescript
const locationAbilityRegistry: Map<string, LocationAbility[]> = new Map();

registerLocationAbility({
    code: '01099',
    name: 'Old Forest Road',
    type: 'after_traveling',
    description: 'The first player may choose and ready 1 character he controls.',
    execute: (state, location, playerId) => {
        // Find exhausted character and ready it
        // Return updated state with log message
    }
});
```

### Implemented Location Abilities

| Code | Location | Type | Effect |
|------|----------|------|--------|
| 01099 | Old Forest Road | after_traveling | First player may ready 1 character |
| 01100 | Forest Gate | travel_cost | Player with highest threat exhausts 1 hero |
| 01101 | Mountains of Mirkwood | while_active | Card effects cannot place progress on quest |
| 01095 | Enchanted Stream | while_active | Each character gets -1 willpower |

### Helper Functions

```typescript
// Check if travel cost can be paid
function canPayTravelCost(state: GameState, location: EncounterCard, playerId: string):
    { canPay: boolean; reason?: string };

// Resolve travel cost (exhaust hero, etc.)
function resolveTravelCost(state: GameState, location: EncounterCard, playerId: string):
    LocationAbilityResult;

// Resolve "after traveling" response effects
function resolveAfterTraveling(state: GameState, location: EncounterCard, playerId: string):
    LocationAbilityResult;

// Resolve "after exploring" response effects
function resolveAfterExploring(state: GameState, location: EncounterCard, playerId: string):
    LocationAbilityResult;

// Check if active location has "while active" effect
function hasWhileActiveEffect(state: GameState): boolean;

// Get description of "while active" effect
function getWhileActiveEffectDescription(state: GameState): string | null;

// Check specific active locations
function isEnchantedStreamActive(state: GameState): boolean;
function isMountainsOfMirkwoodActive(state: GameState): boolean;

// Get willpower modifier from active location
function getActiveLocationWillpowerModifier(state: GameState): number;

// Check if card effects can place quest progress
function canCardEffectsPlaceQuestProgress(state: GameState): boolean;
```

### Integration with Game Store

The `travelToLocation()` action in `gameStore.ts` integrates location abilities:

```typescript
travelToLocation: (location) => {
    const gameState = get();
    const playerId = gameState.players[0].id;

    // 1. Check if travel cost can be paid
    const canPay = canPayTravelCost(gameState, location, playerId);
    if (!canPay.canPay) {
        set({ messages: [...msgs, `Cannot travel: ${canPay.reason}`] });
        return;
    }

    // 2. Resolve travel cost
    const travelCostResult = resolveTravelCost(gameState, location, playerId);
    let updatedState = travelCostResult.state;
    msgs.push(...travelCostResult.log);

    // 3. Move location to active location
    updatedState = { ...updatedState, activeLocation: { card: location, progress: 0 } };

    // 4. Resolve "after traveling" effects
    const afterTravelingResult = resolveAfterTraveling(updatedState, location, playerId);
    updatedState = afterTravelingResult.state;
    msgs.push(...afterTravelingResult.log);

    // 5. Check for "while active" effects
    if (hasWhileActiveEffect(updatedState)) {
        const desc = getWhileActiveEffectDescription(updatedState);
        msgs.push(`⚠️ While ${location.name} is active: ${desc}`);
    }

    set({ ...updatedState, messages: msgs });
};
```

### Test Coverage

| Category | Tests |
|----------|-------|
| Registry | 5 tests (location registration, ability type lookup) |
| Old Forest Road | 3 tests (ready hero, ready ally, no exhausted chars) |
| Forest Gate | 3 tests (can pay cost, cannot pay, resolve cost) |
| Mountains of Mirkwood | 3 tests (while active detection, blocks progress) |
| Enchanted Stream | 3 tests (while active, willpower modifier) |
| While Active Helpers | 4 tests (effect detection, descriptions) |
| Locations Without Abilities | 4 tests (graceful handling) |

Run tests with:
```bash
npm test
```

### File Locations

- `src/engine/locationAbilities.ts` - Location ability handlers and resolution system
- `src/engine/locationAbilities.test.ts` - Unit tests (31 tests)
- `src/store/gameStore.ts` - `travelToLocation()` integration with location abilities

---

## 23. Enemy Ability System

The Enemy Ability System handles forced effects, when engaged effects, when revealed effects, and end-of-combat effects for enemy cards in the Passage Through Mirkwood scenario.

### Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        Enemy Ability Resolution Flows                           │
├────────────────────────────────────────────────────────────────────────────────┤
│   Engagement Phase:                                                             │
│   engageEnemy() ────► resolveWhenEngaged(state, enemy, playerId)               │
│         │                                                                       │
│         ▼                                                                       │
│   Forest Spider: +1 Attack bonus tracked on ActiveEnemy                        │
│   Hummerhorns: 5 damage to a hero                                              │
├────────────────────────────────────────────────────────────────────────────────┤
│   Staging Phase:                                                                │
│   revealStaging() ────► resolveEnemyWhenRevealed(state, enemy, playerId)       │
│         │                                                                       │
│         ▼                                                                       │
│   King Spider: Each player exhausts 1 character                                │
│   Ungoliant's Spawn: Raise threat by 4 per Spider in play                      │
├────────────────────────────────────────────────────────────────────────────────┤
│   End of Combat Phase (future):                                                 │
│   stepCombat() ────► resolveEndOfCombatEffects(state)                          │
│         │                                                                       │
│         ▼                                                                       │
│   Chieftain Ufthak: Attacks from staging area                                  │
├────────────────────────────────────────────────────────────────────────────────┤
│   Refresh Phase:                                                                │
│   stepRefresh() ────► clearRoundBasedModifiers(state)                          │
│         │                                                                       │
│         ▼                                                                       │
│   Forest Spider: +1 Attack bonus cleared                                       │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Core Types

```typescript
// enemyAbilities.ts - Enemy ability types and handlers

type EnemyAbilityType =
    | 'when_engaged'    // Forced: After engages player
    | 'when_revealed'   // When Revealed from encounter deck
    | 'when_attacks'    // When enemy attacks (modify shadow cards)
    | 'constant'        // Passive modifier while in play
    | 'end_of_combat';  // End of combat phase trigger

interface EnemyAbilityResult {
    state: GameState;
    log: string[];
    success: boolean;
    error?: string;
    additionalShadowCards?: number;  // For when_attacks
    attackModifier?: number;         // For tracking bonuses
}

interface EnemyAbility {
    code: string;           // Card code (e.g., '01096')
    name: string;           // Card name (e.g., 'Forest Spider')
    type: EnemyAbilityType;
    description: string;    // Human-readable effect description
    execute: (state: GameState, enemy: EncounterCard | ActiveEnemy, playerId: string) => EnemyAbilityResult;
}
```

### ActiveEnemy Attack Bonus

The `ActiveEnemy` interface includes an optional `attackBonus` field for tracking round-based attack modifiers:

```typescript
interface ActiveEnemy {
    card: EncounterCard;
    damage: number;
    shadowCards: EncounterCard[];
    engagedPlayerId: string;
    exhausted: boolean;
    attackBonus?: number;  // Round-based attack modifier (e.g., Forest Spider +1)
}
```

### Enemy Ability Registry

Abilities are registered by card code in a map:

```typescript
const enemyAbilityRegistry: Map<string, EnemyAbility[]> = new Map();

registerEnemyAbility({
    code: '01096',
    name: 'Forest Spider',
    type: 'when_engaged',
    description: 'Gets +1 Attack until end of round.',
    execute: (state, enemy, playerId) => {
        // Add attackBonus to the engaged enemy
        // Return updated state with log message
    }
});
```

### Implemented Enemy Abilities

| Code | Enemy | Type | Effect |
|------|-------|------|--------|
| 01096 | Forest Spider | when_engaged | +1 Attack until end of round |
| 01074 | King Spider | when_revealed | Each player exhausts 1 character |
| 01075 | Hummerhorns | when_engaged | Deal 5 damage to a hero |
| 01076 | Ungoliant's Spawn | when_revealed | Raise threat by 4 per Spider in play |
| 01098 | Chieftain Ufthak | end_of_combat | Attacks from staging area |

### Resolution Functions

```typescript
// Resolve "When Engaged" effect after enemy engages player
function resolveWhenEngaged(
    state: GameState,
    enemy: EncounterCard | ActiveEnemy,
    playerId: string
): EnemyAbilityResult;

// Resolve "When Revealed" effect during staging
function resolveEnemyWhenRevealed(
    state: GameState,
    enemy: EncounterCard,
    playerId: string
): EnemyAbilityResult;

// Resolve end-of-combat effects (e.g., Chieftain Ufthak)
function resolveEndOfCombatEffects(state: GameState): EnemyAbilityResult;

// Clear round-based modifiers at end of round
function clearRoundBasedModifiers(state: GameState): GameState;

// Helper: Get attack modifier for enemy
function getEnemyAttackModifier(enemy: ActiveEnemy): number;

// Helper: Get total attack including modifiers
function getEnemyTotalAttack(enemy: ActiveEnemy): number;
```

### Integration with Game Engine

**Engagement Phase** (gameEngine.ts):
```typescript
export function engageEnemy(state, enemy, enemyIndex, playerId) {
    // ... move enemy to engaged enemies ...

    // Resolve "When Engaged" effect using the enemy abilities module
    const engagementEffect = resolveWhenEngaged(nextState, enemy, playerId);
    nextState = engagementEffect.state;
    logs.push(...engagementEffect.log);

    return { state: nextState, log: logs };
}
```

**Staging Phase** (gameStore.ts):
```typescript
revealStaging: () => {
    // ... reveal card ...

    if (revealed.type_code === 'enemy') {
        const enemyResult = resolveEnemyWhenRevealed(updatedState, revealed, playerId);
        updatedState = enemyResult.state;
        msgs.push(...enemyResult.log);
    }
}
```

**Refresh Phase** (gameEngine.ts):
```typescript
export function stepRefresh(state) {
    // Clear round-based attack modifiers from engaged enemies
    let nextState = clearRoundBasedModifiers(state);

    // ... ready characters, raise threat ...
}
```

### Test Coverage

| Category | Tests |
|----------|-------|
| Registry | 8 tests (enemy registration, ability type lookup) |
| Forest Spider | 3 tests (+1 attack, bonus tracking) |
| Hummerhorns | 3 tests (5 damage, defeat hero, no heroes) |
| King Spider | 3 tests (exhaust character, ally fallback, no ready chars) |
| Ungoliant's Spawn | 4 tests (threat raise, elimination, count spiders, game over) |
| Chieftain Ufthak | 3 tests (staging attack, not in staging, highest threat) |
| Attack Modifier Helpers | 3 tests (no bonus, with bonus, total attack) |
| Clear Modifiers | 2 tests (single player, multiple players) |
| Unknown Enemies | 2 tests (graceful handling) |

Run tests with:
```bash
npm test
```

### File Locations

- `src/engine/enemyAbilities.ts` - Enemy ability handlers and resolution system
- `src/engine/enemyAbilities.test.ts` - Unit tests (35 tests)
- `src/engine/types.ts` - `ActiveEnemy.attackBonus` field
- `src/engine/gameEngine.ts` - Integration with engagement and refresh phases
- `src/store/gameStore.ts` - Integration with staging phase

---

*Updated on 2026-02-26 with Enemy Ability System documentation.*

---

## Section 24: Card Ability System (Player Cards)

### Overview

The Card Ability System handles hero, ally, and attachment abilities. It provides a unified architecture for:
- **Action abilities**: Manually activated by players (e.g., Aragorn's ready ability)
- **Response abilities**: Triggered after specific game events (e.g., Legolas progress on kill)
- **Passive abilities**: Constant stat modifiers while in play (e.g., Celebrían's Stone +2 willpower)
- **Enter Play abilities**: Choices when a card enters play (e.g., Gandalf)

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Card Ability System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Registry   │    │ Cost System  │    │ Limit System │       │
│  │              │    │              │    │              │       │
│  │ Map<code,    │    │ exhaustSelf  │    │ once_per_    │       │
│  │  abilities>  │    │ resources    │    │   phase      │       │
│  └──────────────┘    └──────────────┘    │ once_per_    │       │
│         │                   │            │   round      │       │
│         └───────────┬───────┘            │ unlimited    │       │
│                     │                    └──────────────┘       │
│                     ▼                                           │
│            ┌─────────────────┐                                  │
│            │ activateAbility │                                  │
│            │                 │                                  │
│            │ 1. Check limit  │                                  │
│            │ 2. Check cost   │                                  │
│            │ 3. Pay cost     │                                  │
│            │ 4. Resolve      │                                  │
│            │ 5. Mark used    │                                  │
│            └─────────────────┘                                  │
│                     │                                           │
│                     ▼                                           │
│            ┌─────────────────┐                                  │
│            │ Effect Handlers │                                  │
│            │                 │                                  │
│            │ ready_self      │                                  │
│            │ gain_resources  │                                  │
│            │ draw_cards      │                                  │
│            │ deal_damage     │                                  │
│            │ reduce_threat   │                                  │
│            │ place_progress  │                                  │
│            │ stat_modifier   │                                  │
│            │ choice          │                                  │
│            └─────────────────┘                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Types

**Ability Definition**:
```typescript
interface CardAbility {
    id: string;               // Unique ability identifier
    cardCode: string;         // Card code (e.g., '01001' for Aragorn)
    cardName: string;         // Card name for logging
    type: AbilityType;        // 'action' | 'response' | 'forced' | 'passive' | 'enter_play'
    trigger: AbilityTrigger;  // 'manual' | 'after_enemy_destroyed' | 'on_enter_play' | etc.
    cost?: AbilityCost;       // Optional cost to activate
    effect: AbilityEffect;    // Effect to resolve
    limit: AbilityLimit;      // 'once_per_phase' | 'once_per_round' | 'unlimited'
    description: string;      // Human-readable description
    condition?: Function;     // Optional condition check
}

interface AbilityCost {
    exhaustSelf?: boolean;       // Exhaust this card
    resources?: number;          // Pay X resources
    resourcesFromPool?: string;  // Pay from specific hero's pool
}

interface AbilityEffect {
    type: EffectType;
    amount?: number;
    stat?: 'attack' | 'defense' | 'willpower' | 'health';
    target?: 'self' | 'attached_hero' | 'any_hero' | 'any_enemy';
    choices?: AbilityEffect[];       // For 'choice' type
    choiceDescriptions?: string[];   // UI labels for choices
}
```

**Attachment Exhaustion**:
```typescript
interface AttachedCard extends PlayerCard {
    exhausted: boolean;  // Track if attachment is exhausted
}

interface Hero {
    // ... other fields
    attachments: AttachedCard[];  // Attachments with exhaust state
}
```

### Ability Registry

Abilities are registered at module initialization:

```typescript
// Aragorn (01001) - Action: Spend 1 resource to ready
registerAbility({
    id: 'aragorn-ready',
    cardCode: '01001',
    cardName: 'Aragorn',
    type: 'action',
    trigger: 'manual',
    cost: { resources: 1, resourcesFromPool: '01001' },
    effect: { type: 'ready_self' },
    limit: 'once_per_phase',
    description: 'Spend 1 resource to ready Aragorn.',
});

// Steward of Gondor (01026) - Action: Exhaust to add 2 resources
registerAbility({
    id: 'steward-resources',
    cardCode: '01026',
    cardName: 'Steward of Gondor',
    type: 'action',
    trigger: 'manual',
    cost: { exhaustSelf: true },
    effect: { type: 'gain_resources', amount: 2, target: 'attached_hero' },
    limit: 'unlimited',
    description: 'Exhaust to add 2 resources to attached hero.',
});

// Gandalf (01061) - Enter play: Choose one effect
registerAbility({
    id: 'gandalf-enter-play',
    cardCode: '01061',
    cardName: 'Gandalf',
    type: 'enter_play',
    trigger: 'on_enter_play',
    effect: {
        type: 'choice',
        choices: [
            { type: 'draw_cards', amount: 3 },
            { type: 'deal_damage', amount: 4, target: 'any_enemy' },
            { type: 'reduce_threat', amount: 5 },
        ],
        choiceDescriptions: ['Draw 3 cards', 'Deal 4 damage to an enemy', 'Reduce threat by 5'],
    },
    limit: 'unlimited',
    description: 'Choose: Draw 3, Deal 4 damage, or -5 threat.',
});
```

### UI Components

**HeroCard Abilities Dropdown**:
```tsx
// HeroCard.tsx
const abilities = getAvailableAbilities(playerId, hero.code);
const hasActivatableAbility = abilities.some(a => a.canActivate);

<button
    className={`hero-card__ability-btn ${hasActivatableAbility ? 'has-activatable' : ''}`}
    onClick={() => setShowAbilities(!showAbilities)}
>
    ⚡ Ability
</button>

{showAbilities && (
    <AbilitiesDropdown
        abilities={abilities}
        onActivate={handleAbilityActivate}
        onClose={() => setShowAbilities(false)}
    />
)}
```

**ChoiceModal (for enter_play abilities)**:
```tsx
// GameTable.tsx - Gandalf enters play
{pendingChoice && (
    <ChoiceModal
        title={`${pendingChoice.cardName} enters play`}
        description="Choose one effect:"
        choices={pendingChoice.choices}
        onSelect={(choiceIndex) => {
            // Check if choice needs target selection
            if (choiceRequiresTarget(choiceIndex)) {
                setPendingTarget({ ... });
            } else {
                activateCardAbility(playerId, abilityId, undefined, choiceIndex);
            }
        }}
    />
)}
```

**TargetSelectionModal (for targeted effects)**:
```tsx
// GameTable.tsx - "Deal 4 damage to an enemy"
{pendingTarget && (
    <TargetSelectionModal
        title={pendingTarget.cardName}
        description={pendingTarget.effectDescription}
        targetType={pendingTarget.targetType}
        targets={buildEnemyTargets(player.engagedEnemies)}
        onSelect={(targetId) => {
            activateCardAbility(playerId, abilityId, undefined, choiceIndex, targetIndex);
        }}
        onCancel={() => setPendingTarget(null)}
    />
)}
```

### Attachment Exhaustion

Attachments can be exhausted as part of their cost (e.g., Steward of Gondor):

**Exhaust Check**:
```typescript
function canPayAbilityCost(state, playerId, ability, sourceHeroCode) {
    if (cost.exhaustSelf) {
        const isAttachmentAbility = ability.cardCode !== sourceHeroCode;

        if (isAttachmentAbility) {
            const attachment = hero.attachments.find(a => a.code === ability.cardCode);
            if (attachment?.exhausted) {
                return { canPay: false, reason: `${ability.cardName} is already exhausted.` };
            }
        }
    }
}
```

**Exhaust Payment**:
```typescript
function payAbilityCost(state, playerId, ability, sourceHeroCode) {
    if (cost.exhaustSelf) {
        if (isAttachmentAbility) {
            // Exhaust the attachment
            updatedHeroes = heroes.map(h => ({
                ...h,
                attachments: h.attachments.map(a =>
                    a.code === ability.cardCode ? { ...a, exhausted: true } : a
                ),
            }));
        }
    }
}
```

**Refresh Phase Readying**:
```typescript
// gameEngine.ts - stepRefresh()
const readiedHeroes = player.heroes.map((h) => {
    // Ready all attachments on this hero
    const readiedAttachments = h.attachments.map((att) => {
        if (att.exhausted) {
            logs.push(`${att.name} (on ${h.name}) readied.`);
            return { ...att, exhausted: false };
        }
        return att;
    });

    return { ...h, exhausted: false, attachments: readiedAttachments };
});
```

### GameStore Integration

**Actions**:
```typescript
interface GameStore {
    activateCardAbility: (
        playerId: string,
        abilityId: string,
        sourceHeroCode?: string,
        choiceIndex?: number,
        targetIndex?: number
    ) => void;

    getAvailableAbilities: (
        playerId: string,
        heroCode: string
    ) => AbilityInfo[];
}
```

**getAvailableAbilities** returns abilities from both the hero AND their attachments:
```typescript
getAvailableAbilities: (playerId, heroCode) => {
    // Get abilities from the hero itself
    const heroAbilities = getAbilities(heroCode);

    // Get abilities from attachments on this hero
    const hero = player.heroes.find(h => h.code === heroCode);
    const attachmentAbilities = hero?.attachments
        .flatMap(att => getAbilities(att.code)) ?? [];

    return [...heroAbilities, ...attachmentAbilities]
        .filter(a => a.type === 'action' && a.trigger === 'manual')
        .map(ability => ({
            id: ability.id,
            name: ability.cardName,
            description: ability.description,
            canActivate: canPay && canUse,
            reason: whyNot,
        }));
}
```

### Test Coverage

| Category | Tests |
|----------|-------|
| Registry | 8 tests (ability registration, lookup) |
| Cost Checking | 6 tests (resources, exhaust, attachment exhaust) |
| Limit Checking | 5 tests (once per phase, once per round, reset) |
| Aragorn | 4 tests (ready ability, cost, limit) |
| Gimli | 3 tests (damage bonus, no damage, calculation) |
| Legolas | 3 tests (progress on kill, condition check) |
| Steward of Gondor | 4 tests (gain resources, exhaust, already exhausted) |
| Celebrían's Stone | 2 tests (willpower bonus, passive registration) |
| Blade of Gondolin | 3 tests (attack bonus, progress on Orc) |
| Gandalf | 5 tests (enter play, all 3 choices, targeting) |
| Attachment Readying | 6 tests (refresh phase, multiple attachments, logging) |

Run tests with:
```bash
npm test
```

### File Locations

- `src/engine/cardAbilities.ts` - Ability system, registry, effect resolution
- `src/engine/cardAbilities.test.ts` - Unit tests (43 tests)
- `src/engine/types.ts` - `AttachedCard` interface with `exhausted` field
- `src/engine/gameEngine.ts` - Attachment readying in `stepRefresh()`
- `src/engine/gameEngine.test.ts` - Attachment readying tests (6 tests)
- `src/store/gameStore.ts` - `activateCardAbility`, `getAvailableAbilities`
- `src/components/HeroCard.tsx` - Abilities button and dropdown
- `src/components/HeroCard.css` - Abilities UI styling
- `src/components/ChoiceModal.tsx` - Enter play choice modal
- `src/components/ChoiceModal.css` - Choice modal styling
- `src/components/TargetSelectionModal.tsx` - Target selection modal
- `src/components/TargetSelectionModal.css` - Target modal styling
- `src/components/GameTable.tsx` - Modal integration

---

*Updated on 2026-02-26 with Card Ability System documentation.*
