# LOTR Card Game - Implementation TODO

This document tracks remaining features and implementation plans for the browser-based LOTR Card Game.

## Current Status Summary

| Category | Status | Remaining Tasks |
|----------|--------|-----------------|
| Core Engine | ✅ 100% | None |
| UI Components | ✅ 95% | Effect targeting modal (optional), Ability modal (5.3c) |
| Card Playing | ✅ 95% | Card ability system (5.3c) |
| Combat System | ✅ 95% | None for single-player; Ranged/Sentinel for two-handed (5.1) |
| Rules Compliance | ✅ 100% | Phase 3 complete for Mirkwood |
| Deck Management | ❌ 10% | RingsDB import (4.1), Starter deck selection (4.2) |
| Quality of Life | ⚠️ 40% | Save/Load (3.3), Undo/Redo (3.2), Log improvements (3.4) |
| Two-Handed Mode | ❌ 0% | Full implementation (5.1) |

---

## Priority 1: Core Gameplay Completion

### 1.1 Ally Display Zone
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25

**Description**: Allies played from hand now have a dedicated display area in the player zone.

**Implemented**:
- [x] Created `AllyCard` component (similar to `HeroCard` but simpler)
- [x] Added allies section to `GameTable.tsx` player zone
- [x] Show ally stats: Willpower, Attack, Defense, HP
- [x] Support exhausted state toggle
- [x] Support damage tracking on allies
- [x] Auto-destroy allies when damage ≥ HP (moved to discard)

**Files created/modified**:
- `src/components/AllyCard.tsx` (new)
- `src/components/AllyCard.css` (new)
- `src/components/GameTable.tsx`
- `src/components/GameTable.css`
- `src/store/gameStore.ts` - Added `exhaustAlly`, `readyAlly`, `damageAlly`, `healAlly` actions

---

### 1.2 Attachment Display on Heroes
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25

**Description**: Attachments played on heroes are now visually displayed with stat bonuses.

**Implemented**:
- [x] Store full attachment card data (not just codes) in hero state
- [x] Add attachment display area below hero controls
- [x] Show attachment name and stat bonuses
- [x] Apply attachment bonuses to hero stats display (with green +X indicator)
- [x] Click-to-attach targeting flow with hero highlighting
- [ ] Support "Restricted" keyword (max 2 restricted attachments) - Deferred to 2.1

**Files created/modified**:
- `src/engine/types.ts` - Updated `Hero.attachments` from `string[]` to `PlayerCard[]`
- `src/store/gameStore.ts` - Updated `playCard` to store full attachment objects
- `src/components/HeroCard.tsx` - Added attachment display, bonus calculation, onClick handler
- `src/components/HeroCard.css` - Attachment badge styling, stat bonus indicators
- `src/components/GameTable.tsx` - Added `onClick` prop for attachment targeting

---

### 1.3 Shadow Card System
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25
**Effort**: Medium (4-6 hours)

**Description**: During combat, shadow cards are dealt to engaged enemies and resolved during their attacks.

**Implemented**:
- [x] Deal shadow cards at start of combat phase
- [x] Add `shadowCard` property to `ActiveEnemy` type (was already present as `shadowCards: EncounterCard[]`)
- [x] Create shadow card reveal UI (`EngagedEnemyCard` component)
- [x] Implement shadow effect parsing (attack bonuses, direct damage)
- [x] Apply common shadow effects (+attack, damage)
- [x] Discard shadow cards after combat
- [x] Show shadow cards on engaged enemies with visual indicator

**Files created/modified**:
- `src/engine/gameEngine.ts` - Updated `stepCombat()` with shadow card dealing/resolution
- `src/components/EngagedEnemyCard.tsx` (new) - Shadow card display on enemies
- `src/components/EngagedEnemyCard.css` (new) - Styling for shadow cards
- `src/components/GameTable.tsx` - Use EngagedEnemyCard for engaged enemies

---

### 1.4 Manual Combat Resolution
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25
**Effort**: Medium (4-6 hours)

**Description**: Combat is now interactive with manual defender and attacker selection.

**Implemented**:
- [x] Add combat sub-phases: `combat_defend`, `combat_attack`
- [x] Create defender selection UI (click hero/ally to defend)
- [x] Create attacker selection UI (click characters to form attack group)
- [x] Calculate damage with player choices
- [x] Combat preview showing damage calculation
- [x] Shadow card reveal during defense phase
- [x] Support skipping defense (undefended attack) and attack (no damage)
- [ ] Support multiple defenders (deferred - not standard rules)
- [ ] Support ranged/sentinel keywords for multiplayer prep (deferred to 5.1)

**Files created/modified**:
- `src/engine/types.ts` - Added `CombatState`, `CharacterRef`, combat sub-phases, `Ally` interface
- `src/components/CombatPanel.tsx` (new) - Combat UI with defender/attacker selection
- `src/components/CombatPanel.css` (new) - Combat panel styling
- `src/components/GameTable.tsx` - Integrated CombatPanel
- `src/store/gameStore.ts` - Added combat actions: `startCombat`, `selectDefender`, `confirmDefense`, `skipDefense`, `toggleAttacker`, `confirmAttack`, `skipAttack`

---

### 1.5 Event Effect Resolution
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25
**Effort**: Large (8-12 hours)

**Description**: Event cards now resolve their effects when played. Created a comprehensive event effect resolution system with targeting support.

**Implemented**:
- [x] Designed effect resolution architecture with handler registry pattern
- [x] Implemented targeting system (ally, hero, character, enemy, cards in discard)
- [x] Created effect handlers for Core Set events:
  - [x] Ever Vigilant (01020) - Ready an exhausted ally
  - [x] Common Cause (01021) - Exhaust hero to ready another
  - [x] Sneak Attack (01023) - Put ally into play temporarily
  - [x] Grim Resolve (01025) - Ready all characters
  - [x] Blade Mastery (01032) - Character gains +1 Attack/Defense
  - [x] Feint (01034) - Enemy cannot attack this phase
  - [x] Quick Strike (01035) - Immediate attack against enemy
  - [x] Swift Strike (01037) - Deal 2 damage to attacking enemy
  - [x] The Galadhrim's Greeting (01046) - Reduce threat by 6
  - [x] Hasty Stroke (01048) - Cancel shadow effect
  - [x] A Test of Will (01050) - Cancel "When Revealed" effect
  - [x] Stand and Fight (01051) - Play ally from discard
  - [x] A Light in the Dark (01052) - Return enemy to staging
  - [x] Dwarven Tomb (01053) - Return Spirit card from discard to hand
- [x] Integrated with playCard in gameStore
- [x] Event timing validation (Action, Combat Action, Response)
- [x] End-of-phase effects tracking (for Sneak Attack)
- [x] Unit tests for all event handlers (29 tests)

**Event Types Supported**:
| Timing | Description |
|--------|-------------|
| Action | Can be played during any Action window |
| Combat Action | Can only be played during Combat phase |
| Response | Triggered after specific events |

**Files created/modified**:
- `src/engine/eventEffects.ts` (new) - Event effect definitions and resolution system
- `src/engine/eventEffects.test.ts` (new) - Unit tests (29 tests)
- `src/store/gameStore.ts` - Updated `playCard` to resolve event effects

**Testing**:
- Run `npm test` to execute all 159 unit tests
- 29 tests for event effect resolution

---

## Priority 2: Rules Compliance

### 2.1 Keyword Implementation
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25
**Effort**: Medium (4-6 hours)

**Description**: Implemented Surge and Doomed keyword parsing and resolution during encounter card staging.

**Keywords Implemented**:
| Keyword | Effect |
|---------|--------|
| Surge | Reveal additional encounter card |
| Doomed X | All players raise threat by X |

**Implemented**:
- [x] Created keyword parser utility (`keywords.ts`)
- [x] `hasSurge()` - Detects Surge keyword in keywords, traits, or text fields
- [x] `getDoomedValue()` - Extracts Doomed X value from card
- [x] `resolveKeywords()` - Resolves all keywords on a card (raises threat, returns surge flag)
- [x] `parseKeywords()` / `formatKeywords()` - Utility functions for display
- [x] Integrated with `revealStaging` in gameStore:
  - Doomed raises all players' threat by X
  - Surge reveals an additional encounter card
  - Multiple surge cards chain correctly
- [x] Threat elimination check (game over at 50 threat)
- [x] Unit tests for keyword system (38 tests)

**Files created/modified**:
- `src/engine/keywords.ts` (new) - Keyword parser and resolver
- `src/engine/keywords.test.ts` (new) - Unit tests (38 tests)
- `src/store/gameStore.ts` - Updated `revealStaging` to resolve keywords

**Remaining Keywords (deferred)**:
- [ ] Ranged - Can attack enemies engaged with other players (5.1)
- [ ] Sentinel - Can defend for other players (5.1)
- [ ] Restricted - Max 2 restricted attachments per character
- [ ] Unique - Only 1 copy in play at a time

**Testing**:
- Run `npm test` to execute all 130 unit tests
- 38 tests for keyword parsing and resolution

---

### 2.2 Treachery Card Handling
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25
**Effort**: Medium (4-6 hours)

**Description**: Treachery cards have "When Revealed" effects that need resolution. Implemented a treachery effect resolution system that handles all 5 treachery cards in the Mirkwood scenario.

**Implemented**:
- [x] Created treachery effect resolution system (`treacheryEffects.ts`)
- [x] Implemented handlers for all Mirkwood scenario treacheries:
  - [x] The Necromancer's Reach (01102) - Assign 1 damage to each exhausted character
  - [x] Driven by Shadow (01103) - Place progress per staging card (beneficial!)
  - [x] Despair (01104) - Raise each player's threat by 3
  - [x] Great Forest Web (01077) - Attach condition to hero (cannot ready without paying 2 resources)
  - [x] Caught in a Web (01078) - Attach condition to hero (cannot collect resources)
- [x] Condition attachments attach to heroes visually
- [x] Integrated with staging phase (`revealStaging` in gameStore)
- [x] Unit tests for all 5 treachery handlers (25 tests)
- [x] Graceful handling of unknown treachery cards
- [x] Proper game over detection (all heroes defeated, threat elimination)

**Files created/modified**:
- `src/engine/treacheryEffects.ts` (new) - Treachery effect handlers and resolution system
- `src/engine/treacheryEffects.test.ts` (new) - Unit tests for all treachery cards (25 tests)
- `src/store/gameStore.ts` - Updated `revealStaging` to use treachery resolution system

**Testing**:
- Run `npm test` to execute all 45 unit tests
- 25 tests for treachery effects, 10 for game engine, 10 for game store

---

### 2.3 Mulligan System
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25
**Effort**: Small (2-3 hours)

**Description**: Allow players to redraw their starting hand once.

**Implemented**:
- [x] Add mulligan state to game setup (`mulliganAvailable`, `showMulliganModal`)
- [x] Create mulligan UI modal at game start (`MulliganModal.tsx`)
- [x] "Keep Hand" button proceeds to game
- [x] "Mulligan" button shuffles and redraws 6 cards
- [x] Disable mulligan after first use
- [x] Modal displays current hand cards for review
- [x] Smooth animations for modal appearance

**Files created/modified**:
- `src/store/gameStore.ts` - Added `takeMulligan`, `keepHand` actions
- `src/components/MulliganModal.tsx` (new) - Modal component
- `src/components/MulliganModal.css` (new) - Modal styling
- `src/components/GameTable.tsx` - Renders modal when `showMulliganModal` is true

---

### 2.4 Quest Stage Transitions
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25
**Effort**: Small (2-3 hours)

**Description**: Quest stage transitions now have proper "When Revealed" effect handling and special stage rules.

**Implemented**:
- [x] Created quest stage effects system (`questStageEffects.ts`)
- [x] Stage 2 "When Revealed": Add "Caught in a Web" set-aside card to staging area
- [x] Stage 3 special rule: Reveal 2 encounter cards instead of 1
- [x] Stage 3 victory condition: Players win when encounter deck and discard are both empty
- [x] Stage 2 Forced effect: Reveal encounter card at end of encounter phase if no enemies in play
- [x] Quest stage transition logging
- [x] Unit tests for all stage effects (26 tests)

**Files created/modified**:
- `src/engine/questStageEffects.ts` (new) - Quest stage effect handlers and utilities
- `src/engine/questStageEffects.test.ts` (new) - Unit tests for quest stages (26 tests)
- `src/engine/gameEngine.ts` - Added Stage 2 Forced effect check in `stepEncounter`
- `src/store/gameStore.ts` - Updated `resolveQuest` to use transition effects, updated `revealStaging` to reveal multiple cards

**Testing**:
- Run `npm test` to execute all 92 unit tests
- 26 tests for quest stage effects

---

### 2.5 Engagement Rules Compliance
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25
**Effort**: Medium (3-4 hours)

**Description**: The engagement phase is now rules-compliant with iterative engagement (highest cost first), optional engagement, and "When Engaged" effects.

**Implemented**:
- [x] Basic engagement check (enemies with `engagement_cost ≤ player.threat` engage)
- [x] Move enemy from staging area to player's engaged enemies
- [x] Create `ActiveEnemy` object with damage, shadowCards, etc.
- [x] Log engagement events
- [x] **Highest cost first**: Engage enemies iteratively, one at a time, highest cost first
- [x] **Iterative checks**: Loop until no more qualifying enemies
- [x] **Optional engagement**: `optionallyEngageEnemy` action allows voluntary engagement regardless of cost
- [x] **"When Engaged" effects**:
  - Hummerhorns (01082): Deal 5 damage to a hero
  - Forest Spider (01089): Characters get -1 defense (logged, not fully implemented)
- [x] Game over detection when all heroes defeated by When Engaged effects

**Example (Now Fixed)**:
If player has threat 30 and staging has enemies with costs 20, 25, 28:
- **Before**: All three engage at once ❌
- **After**: First check engages cost 28, second check engages 25, third engages 20 ✅

**Files modified**:
- `src/engine/gameEngine.ts` - Refactored `stepEncounter()`, added `engageEnemy()`, `optionalEngagement()`, When Engaged handlers
- `src/store/gameStore.ts` - Added `optionallyEngageEnemy` action
- `src/engine/engagement.test.ts` (new) - 21 unit tests for engagement rules

**Testing**:
- Run `npm test` to execute all 66 unit tests
- 21 tests for engagement rules covering order, optional engagement, When Engaged effects

**Remaining for Two-Handed Mode (5.1)**:
- [ ] Multiplayer engagement order (first player engages first, etc.)

---

### 2.6 Quest Phase Manual Commitment
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25
**Effort**: Medium (4-6 hours)

**Description**: The Quest phase now has manual character commitment. Players choose which heroes and allies to commit to the quest.

**Implemented**:
- [x] Add quest sub-phases: `quest_commit`, `quest_staging`, `quest_resolve`
- [x] Create QuestCommitPanel component
  - [x] Show all ready characters (heroes and allies)
  - [x] Click to toggle commitment (visual selection)
  - [x] Show total Willpower committed
  - [x] Show expected result preview (progress vs threat raise)
  - [x] "Confirm Commitment" button to proceed
  - [x] "Skip" button for 0 willpower commitment
- [x] Update "Start Quest" button to trigger QuestCommitPanel
- [x] Separate staging step (reveal encounter cards)
- [x] Quest resolution counts only committed characters' Willpower
- [x] Add `questCommitment: CharacterRef[]` to game state
- [x] Exhaust only committed characters (not all heroes)
- [x] Log which characters were committed
- [x] PhaseControlBar shows appropriate buttons for each quest sub-phase

**Files created/modified**:
- `src/engine/types.ts` - Added quest sub-phases, `questCommitment` to GameState
- `src/components/QuestCommitPanel.tsx` (new) - Character selection UI
- `src/components/QuestCommitPanel.css` (new) - Panel styling
- `src/components/PhaseControlBar.tsx` - Updated quest phase buttons, added `questActions` prop
- `src/store/gameStore.ts` - Added quest actions: `startQuestCommit`, `toggleQuestCommit`, `confirmQuestCommit`, `revealStaging`, `resolveQuest`
- `src/components/GameTable.tsx` - Integrated QuestCommitPanel

---

### 2.7 Travel Phase Implementation
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25
**Effort**: Small (2-3 hours)

**Description**: The Travel phase allows players to travel to a location in the staging area, making it the active location. Progress must be placed on the active location before the quest can receive progress.

**Implemented**:
- [x] `travelToLocation(location)` action - moves location from staging to active
- [x] `skipTravel()` action - advances to encounter phase without traveling
- [x] StagingArea shows clickable locations during travel phase
- [x] Visual feedback: green border and "🚶 Travel" badge on travelable locations
- [x] Travel hint message shown during travel phase
- [x] Validation: cannot travel if active location already exists
- [x] Validation: only locations in staging area can be traveled to
- [x] Travel effects logged (but not yet resolved)
- [x] PhaseControlBar shows context-aware buttons:
  - "Skip (Location Active)" if active location exists
  - "Skip (No Locations)" if no locations in staging
  - "Skip Travel" if locations exist and can travel
- [x] **Auto-skip Travel phase** when no meaningful action available:
  - Auto-skips if active location already exists
  - Auto-skips if no location cards in staging area
  - Logs reason for auto-skip ("Auto-skipped Travel (active location exists)." or "Auto-skipped Travel (no locations in staging).")

**Files modified**:
- `src/store/gameStore.ts` - Added `travelToLocation`, `skipTravel` actions, auto-skip logic in `resolveQuest()`
- `src/components/StagingArea.tsx` - Added travel phase props, clickable locations
- `src/components/StagingArea.css` - Travel styling (green borders, badges, hints)
- `src/components/PhaseControlBar.tsx` - Travel actions interface and buttons
- `src/components/GameTable.tsx` - Integrated travel props

---

## Priority 3: Quality of Life

### 3.1 Card Zoom/Detail View
**Status**: ✅ COMPLETE
**Completed**: 2025-02-25
**Effort**: Small (2-3 hours)

**Description**: Hover over any card to see a zoomed, detailed view with full stats and ability text.

**Implemented**:
- [x] Hover to zoom card (no right-click or modal needed)
- [x] Zoomed card appears as fixed overlay near the original
- [x] Smart positioning (avoids viewport edges)
- [x] Full card image or enlarged text placeholder
- [x] Shows all card stats and abilities
- [x] Smooth fade-in animation
- [x] Works on all card types (hand, hero, ally, staging, engaged)

**Files modified**:
- `src/components/CardDisplay.tsx` - Added hover state, zoom overlay, position calculation
- `src/components/CardDisplay.css` - Added `.card-display__zoom-overlay`, `.card-display__zoom-card` styles

---

### 3.2 Undo/Redo System
**Status**: ❌ Not Implemented
**Effort**: Medium (4-6 hours)

**Tasks**:
- [ ] Implement state history stack
- [ ] Add undo button (limited to same phase)
- [ ] Add redo button
- [ ] Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

---

### 3.3 Save/Load Game State
**Status**: ❌ Not Implemented
**Effort**: Small (2-3 hours)

**Tasks**:
- [ ] Serialize game state to JSON
- [ ] Save to localStorage
- [ ] Load game button on start screen
- [ ] Auto-save after each phase

---

### 3.4 Game Log Improvements
**Status**: ⚠️ Basic
**Effort**: Small (1-2 hours)

**Tasks**:
- [ ] Add timestamps to log entries
- [ ] Color-code by event type
- [ ] Add "Copy to clipboard" button
- [ ] Expandable card references in log

---

## Priority 4: Deck Management

### 4.1 RingsDB Import
**Status**: ❌ Not Implemented
**Effort**: Medium (4-6 hours)

**Description**: The only way to get decks into the game. No in-app deck builder - users must import from RingsDB.

**Tasks**:
- [ ] Input field for RingsDB deck URL/ID
- [ ] Fetch deck via RingsDB API (`https://ringsdb.com/api/public/decklist/{id}`)
- [ ] Map RingsDB card codes to local `Core.json` data
- [ ] Display import preview with card list
- [ ] Handle missing cards gracefully (show warning, allow partial import)
- [ ] Save imported deck to localStorage for reuse

**API Reference**:
- Deck endpoint: `https://ringsdb.com/api/public/decklist/{id}`
- Card data: Already have in `src/data/Core.json`

---

### 4.2 Starter Deck Selection
**Status**: ❌ Not Implemented
**Effort**: Small (2-3 hours)

**Description**: Pre-built starter decks hosted on RingsDB. Users select from a dropdown or provide their own RingsDB deck URL.

**Tasks**:
- [ ] Create 2-3 Core Set starter decks on RingsDB
- [ ] Hardcode starter deck URLs in app config
- [ ] Create deck selection dropdown on game start screen:
  - Option 1: "Leadership/Tactics Starter" (RingsDB URL 1)
  - Option 2: "Spirit/Lore Starter" (RingsDB URL 2)
  - Option 3: "Custom Deck" (user enters their own RingsDB URL)
- [ ] Fetch selected deck via RingsDB Import (4.1)
- [ ] Store last-used deck preference in localStorage

**UI Flow**:
```
┌─────────────────────────────────────────┐
│         SELECT YOUR DECK                │
├─────────────────────────────────────────┤
│  ○ Leadership/Tactics Starter           │
│  ○ Spirit/Lore Starter                  │
│  ○ Custom Deck:                         │
│    [Enter RingsDB URL or ID...]         │
├─────────────────────────────────────────┤
│         [START GAME]                    │
└─────────────────────────────────────────┘
```

**Files to create/modify**:
- `src/config/starterDecks.ts` (new) - Hardcoded RingsDB URLs
- `src/components/DeckSelector.tsx` (new) - Dropdown UI
- `src/App.tsx` - Show deck selector before game starts

---

## Priority 5: Future Enhancements

### 5.1 Two-Handed Mode
**Status**: ❌ Not Implemented
**Effort**: Medium (6-8 hours)

**Description**: Allow a single player to control two separate decks/player areas simultaneously. This enables solo players to experience the cooperative aspects of the game designed for multiple players.

**Tasks**:
- [ ] Add player count selection on game start (1 or 2 hands)
- [ ] Create second player state with separate heroes, deck, hand, threat
- [ ] Split player zone UI to show both player areas
- [ ] Add "Switch Active Player" control or tab system
- [ ] Shared staging area between both players
- [ ] Separate engagement checks per player (based on each player's threat)
- [ ] Support Ranged keyword (attack enemies engaged with other player)
- [ ] Support Sentinel keyword (defend for other player)
- [ ] Turn structure: both players act together in each phase
- [ ] First player token rotation between rounds

**Files to modify**:
- `src/store/gameStore.ts` - Support multiple players
- `src/engine/gameEngine.ts` - Multi-player phase logic
- `src/components/GameTable.tsx` - Dual player zone layout
- `src/components/GameTable.css` - Two-handed layout styles
- `src/components/PlayerSelector.tsx` (new) - Switch between players
- `src/App.tsx` - Player count selection on init

---

### 5.2 Additional Scenarios
**Status**: ❌ Not Implemented
**Effort**: Medium per scenario (4-6 hours each)

**Scenarios to add**:
- [ ] Journey Along the Anduin (Core Set)
- [ ] Escape from Dol Guldur (Core Set)

---

### 5.3 Card Ability System
**Status**: ⚠️ Partially Split
**Effort**: Very Large (15+ hours total)

**Description**: Split into three parts for incremental implementation:

---

#### 5.3a Enemy Forced/When Engaged Effects (Mirkwood)
**Status**: ✅ COMPLETE
**Completed**: 2026-02-26
**Effort**: Medium (4-6 hours)

**Description**: Enemy abilities for the Passage Through Mirkwood scenario.

**Implemented**:
- [x] Enemy ability registry with type-safe handlers
- [x] "When Engaged" effects (Forced triggers after engagement)
- [x] "When Revealed" effects for enemies during staging
- [x] "End of Combat" effects (Chieftain Ufthak staging area attack)
- [x] Round-based attack modifiers with clearing at refresh
- [x] Integration with engagement, staging, and refresh phases
- [x] Helper functions for attack modifiers

**Enemies Implemented**:
| Enemy | Code | Effect Type | Effect |
|-------|------|-------------|--------|
| Forest Spider | 01096 | when_engaged | +1 Attack until end of round |
| King Spider | 01074 | when_revealed | Each player exhausts 1 character |
| Hummerhorns | 01075 | when_engaged | Deal 5 damage to a hero |
| Ungoliant's Spawn | 01076 | when_revealed | Raise threat by 4 per Spider in play |
| Chieftain Ufthak | 01098 | end_of_combat | Attacks from staging area |

**Enemy Ability Types**:
- `when_engaged`: Forced effect after enemy engages player
- `when_revealed`: Effect when enemy is revealed during staging
- `when_attacks`: Modify shadow card count (future)
- `constant`: Passive modifier while in play (future)
- `end_of_combat`: Effect at end of combat phase

**Files created/modified**:
- `src/engine/enemyAbilities.ts` (new) - Enemy ability registry and handlers
- `src/engine/enemyAbilities.test.ts` (new) - 35 unit tests
- `src/engine/types.ts` - Added `attackBonus` to `ActiveEnemy`
- `src/engine/gameEngine.ts` - Integrated with engagement and refresh phases
- `src/store/gameStore.ts` - Integrated with staging phase

**Testing**:
- Run `npm test` to execute all 225 unit tests
- 35 tests for enemy abilities covering registry, all 5 enemies, modifiers, and edge cases

---

#### 5.3b Location Travel Costs (Mirkwood)
**Status**: ✅ COMPLETE
**Completed**: 2026-02-26
**Effort**: Small (3-4 hours)

**Description**: Location Travel costs and abilities for Passage Through Mirkwood.

**Implemented**:
- [x] Location ability registry with type-safe handlers
- [x] Travel cost checking and resolution
- [x] "After Traveling" response effects
- [x] "While Active" constant effects (tracked for rule enforcement)
- [x] Helper functions for active location queries
- [x] Integration with `travelToLocation()` in gameStore

**Locations Implemented**:
| Location | Code | Ability Type | Effect |
|----------|------|--------------|--------|
| Old Forest Road | 01099 | after_traveling | First player may ready 1 character |
| Forest Gate | 01100 | travel_cost | Player with highest threat exhausts 1 hero |
| Mountains of Mirkwood | 01101 | while_active | Card effects cannot place progress on quest |
| Enchanted Stream | 01095 | while_active | Each character gets -1 willpower |

**Location Ability Types**:
- `travel_cost`: Cost to travel (checked before travel)
- `after_traveling`: Response after becoming active location
- `while_active`: Constant effect while location is active
- `after_exploring`: Response after location is explored

**Files created/modified**:
- `src/engine/locationAbilities.ts` (new) - Location ability registry and handlers
- `src/engine/locationAbilities.test.ts` (new) - 31 unit tests
- `src/store/gameStore.ts` - Integrated with `travelToLocation()`

**Testing**:
- Run `npm test` to execute all 190 unit tests
- 31 tests for location abilities covering registry, all 4 locations, while active effects, and locations without abilities

---

#### 5.3c Hero/Ally/Attachment Abilities (Player Cards)
**Status**: ⚠️ Partially Implemented (Starting Deck Cards + Full UI)
**Effort**: Large (8-10 hours total, ~8 hours completed)
**Completed**: 2025-02-26 (Core system + starting deck cards + full UI)

**Description**: A comprehensive system for activating player card abilities.

**Implemented**:
- [x] Core ability system with types, registry, and resolution
- [x] Ability cost checking and payment (resources, exhaust)
- [x] Limit tracking (once per phase/round/unlimited)
- [x] Stat modifier system for passive abilities
- [x] Attachment exhaustion state (`AttachedCard.exhausted`)
- [x] Integration with gameStore (`activateCardAbility`, `getAvailableAbilities`)
- [x] 43 unit tests for card abilities
- [x] "⚡ Ability" button on HeroCard to activate abilities
- [x] Abilities dropdown showing all available abilities (hero + attachments)
- [x] Visual indicator for exhausted attachments (💤 icon + grayed out)
- [x] Ready all attachments during Refresh phase (with 6 unit tests)
- [x] Gandalf enter_play choice modal (Draw 3 / Deal 4 / -5 threat)
- [x] Target selection modal for abilities that need targets
- [x] Enemy targeting for Gandalf's "Deal 4 damage to an enemy"

**Starting Deck Cards Implemented**:
| Card | Type | Status |
|------|------|--------|
| Aragorn (01001) | Action: Spend 1 to ready (once/phase) | ✅ Full UI |
| Gimli (01004) | Passive: +1 attack per damage | ✅ |
| Legolas (01005) | Response: +2 progress on kill | ✅ |
| Steward of Gondor (01026) | Action: Exhaust for +2 resources | ✅ Full UI |
| Celebrían's Stone (01027) | Passive: +2 willpower | ✅ |
| Blade of Gondolin (01044) | Passive: +1 attack, Response: +1 progress on Orc kill | ✅ |
| Gandalf (01061) | Enter play: Draw 3 / Deal 4 / -5 threat | ✅ Full UI with target selection |

**Remaining Tasks**:
- [ ] Implement additional Core Set cards (Unexpected Courage, Horn of Gondor, etc.)

**Files created/modified**:
- `src/engine/cardAbilities.ts` (new) - Ability system, definitions, resolution
- `src/engine/cardAbilities.test.ts` (new) - 43 unit tests
- `src/engine/types.ts` - Added `AttachedCard` interface with `exhausted`
- `src/engine/gameEngine.ts` - Added attachment readying to `stepRefresh`
- `src/engine/gameEngine.test.ts` - Added 6 unit tests for attachment readying
- `src/store/gameStore.ts` - Added `activateCardAbility`, `getAvailableAbilities`, enter_play handling, target support
- `src/components/HeroCard.tsx` - Added abilities button and dropdown
- `src/components/HeroCard.css` - Styles for abilities UI and exhausted attachments
- `src/components/ChoiceModal.tsx` (new) - Modal for enter_play choices
- `src/components/ChoiceModal.css` (new) - Styles for choice modal
- `src/components/TargetSelectionModal.tsx` (new) - Modal for target selection
- `src/components/TargetSelectionModal.css` (new) - Styles for target modal
- `src/components/GameTable.tsx` - Integrated ChoiceModal and TargetSelectionModal
- `src/components/LogPanel.tsx` - Added 'ability' and 'error' log types

**Ability Types Supported**:
| Type | Trigger | Examples |
|------|---------|----------|
| Action | Player activates manually | Steward of Gondor, Aragorn's ready ability |
| Response | After specific event | Legolas (after destroying enemy) |
| Passive | Constant modifier while in play | Celebrían's Stone (+2 willpower) |
| Enter Play | When card enters play | Gandalf (draw 3, deal 4, or -5 threat) |

---

### 5.4 Tutorial Mode
**Status**: ❌ Not Implemented
**Effort**: Large (8-12 hours)

**Tasks**:
- [ ] Step-by-step guided first game
- [ ] Highlight zones and explain phases
- [ ] Pause for player confirmation
- [ ] Tooltips on hover

---

### 5.5 Sound Effects & Music
**Status**: ❌ Not Implemented
**Effort**: Medium (4-6 hours)

**Tasks**:
- [ ] Background music (royalty-free fantasy)
- [ ] Card play sounds
- [ ] Combat sounds
- [ ] Victory/defeat fanfares
- [ ] Volume controls

---

## Implementation Phases (Recommended Order)

### ✅ Completed Phases

**Phase 1: Playable MVP** - COMPLETE
- Starting hand, card playing, ally/attachment display, card zoom, mulligan

**Phase 2: Complete Combat** - COMPLETE
- Shadow cards, manual combat resolution, treachery effects

---

### Phase 3: Full Rules Compliance (~1-2 weeks)
Complete the remaining game rules for accurate "Passage Through Mirkwood" play.

| Order | Task | Ref | Effort | Status |
|-------|------|-----|--------|--------|
| 1 | Keyword implementation (Surge, Doomed) | 2.1 | 4-6 hrs | ✅ DONE |
| 2 | Quest stage transitions | 2.4 | 2-3 hrs | ✅ DONE |
| 3 | Engagement rules fix (highest cost first) | 2.5 | 3-4 hrs | ✅ DONE |
| 4 | Event effect resolution | 1.5 | 8-12 hrs | ✅ DONE |
| 5 | Enemy Forced/When Engaged effects (Mirkwood) | 5.3a | 4-6 hrs | ✅ DONE |
| 6 | Location Travel costs (Mirkwood) | 5.3b | 3-4 hrs | ✅ DONE |

**Milestone**: "Passage Through Mirkwood" scenario is fully rules-compliant, including all enemy and location effects. Hero/ally abilities (5.3c) remain for Phase 6.

---

### Phase 4: Deck Management (~1 week)
Enable custom deck selection via RingsDB.

| Order | Task | Ref | Effort | Priority |
|-------|------|-----|--------|----------|
| 1 | RingsDB import | 4.1 | 4-6 hrs | High |
| 2 | Starter deck selection UI | 4.2 | 2-3 hrs | High |

**Milestone**: Players can import decks from RingsDB or select pre-built starters.

---

### Phase 5: Quality of Life (~1 week)
Improve player experience with convenience features.

| Order | Task | Ref | Effort | Priority |
|-------|------|-----|--------|----------|
| 1 | Save/load game state | 3.3 | 2-3 hrs | High |
| 2 | Game log improvements | 3.4 | 1-2 hrs | Medium |
| 3 | Undo/redo system | 3.2 | 4-6 hrs | Low |

**Milestone**: Game state persists, better feedback and error recovery.

---

### Phase 6: Advanced Features (Ongoing)
Long-term enhancements for expanded gameplay.

| Order | Task | Ref | Effort | Priority |
|-------|------|-----|--------|----------|
| 1 | Hero/Ally/Attachment abilities | 5.3c | 8-10 hrs | High |
| 2 | Two-handed mode | 5.1 | 6-8 hrs | Medium |
| 3 | Additional scenarios | 5.2 | 4-6 hrs each | Medium |
| 4 | Tutorial mode | 5.4 | 8-12 hrs | Low |
| 5 | Sound effects & music | 5.5 | 4-6 hrs | Low |

**Milestone**: Full-featured game with multiple play modes and scenarios.

---

## Notes

- All effort estimates assume familiarity with the codebase
- Priority 1 items are required for a minimum viable game
- Priority 2 items make the game rules-accurate
- Priority 3+ items are quality-of-life and expansion features

---

*Last updated: 2025-02-25*
