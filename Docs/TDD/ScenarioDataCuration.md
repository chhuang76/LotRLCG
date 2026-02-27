# Scenario Data Curation Workflow

This document describes the process of creating and adding new scenarios to the LOTR Card Game application.

## Overview

Scenarios in the LOTR LCG are organized by **set ID** (e.g., `01` for Core Set). Each scenario consists of:
- **Quest Cards**: Define the stages of the scenario
- **Encounter Sets**: Groups of encounter cards used to build the encounter deck
- **Setup Cards**: Cards placed in staging area during setup

---

## Data Sources

### 1. OCTGN Game Definition (✅ Recommended for Encounter Cards)

**Remote URL**: `https://raw.githubusercontent.com/GeckoTH/Lord-of-the-Rings/master/o8g/Sets/{SetName}/set.xml`

**Local Copy**: `References/octgn_core_set.xml` (Core Set data cached locally)

**Example**: `https://raw.githubusercontent.com/GeckoTH/Lord-of-the-Rings/master/o8g/Sets/Core%20Set/set.xml`

| Feature | Available |
|---------|-----------|
| Player Cards | ✅ Yes |
| Encounter Cards | ✅ Yes |
| Quest Cards | ✅ Yes |
| Objective Cards | ✅ Yes |
| Card Stats | ✅ Full (engagement, threat, attack, defense, health) |
| Card Text | ✅ Yes |
| Shadow Text | ✅ Yes |
| Encounter Set Name | ✅ Yes |
| Quantity | ✅ Yes |
| API Access | ✅ Public (raw GitHub file) |

**Data Format**: XML with structured properties
```xml
<card id="51223bd0-ffd1-11df-a976-0801200c9115" name="Eastern Crows" size="EncounterCard">
    <property name="Card Number" value="115"/>
    <property name="Quantity" value="3"/>
    <property name="Encounter Set" value="Sauron's Reach"/>
    <property name="Type" value="Enemy"/>
    <property name="Traits" value="Creature."/>
    <property name="Keywords" value="Surge."/>
    <property name="Engagement Cost" value="30"/>
    <property name="Threat" value="1"/>
    <property name="Attack" value="1"/>
    <property name="Defense" value="0"/>
    <property name="Health" value="1"/>
    <property name="Text" value="Forced: After Eastern Crows is defeated..."/>
    <property name="Shadow" value="Shadow: attacking enemy gets +1 U..."/>
</card>
```

**Best for**: Encounter cards, quest cards, objective cards - complete data with all stats

---

### 2. RingsDB API (✅ Recommended for Player Cards)

**URL**: `https://ringsdb.com/api/public/cards/{pack_code}`

**Example**: `https://ringsdb.com/api/public/cards/Core`

| Feature | Available |
|---------|-----------|
| Player Cards | ✅ Yes (codes 01001-01073) |
| Encounter Cards | ❌ No |
| Quest Cards | ❌ No |
| Card Stats | ✅ Full |
| Card Text | ✅ Yes |
| Card Images | ✅ URL references |
| API Access | ✅ Public JSON API |

**Data Format**: JSON array
```json
{
    "code": "01001",
    "name": "Aragorn",
    "type_code": "hero",
    "sphere_code": "leadership",
    "traits": "Dúnedain. Noble. Ranger.",
    "willpower": 2,
    "attack": 3,
    "defense": 2,
    "health": 5,
    "text": "Response: After Aragorn commits to a quest..."
}
```

**Best for**: Player cards (heroes, allies, attachments, events) - official API with clean JSON

---

### 3. Hall of Beorn (📖 Reference Only)

**URL**: `https://hallofbeorn.com/LotR/Details/{CardName}-{SetCode}`

**Example**: `https://hallofbeorn.com/LotR/Details/Eastern-Crows-Core`

| Feature | Available |
|---------|-----------|
| Player Cards | ✅ Yes |
| Encounter Cards | ✅ Yes |
| Quest Cards | ✅ Yes |
| Card Images | ✅ Yes |
| API Access | ❌ No (JavaScript-rendered, no public API) |

**Limitations**:
- Pages are JavaScript-rendered, cannot be scraped easily
- No public API available
- Useful for manual verification but not automated extraction

**Best for**: Manual reference and verification of card data

---

### 4. CardGameDB (❌ Not Recommended)

**URL**: `https://www.cardgamedb.com/index.php/lotr/lord-of-the-rings-card-spoiler/`

| Feature | Available |
|---------|-----------|
| Card Data | ✅ Yes |
| API Access | ❌ No (blocks automated requests with CDN protection) |

**Limitations**: Access denied for automated requests (Akamai protection)

---

### 5. Official Rulebook (📖 Required for Scenario Setup)

**Location**: Physical rulebook or PDF

| Feature | Available |
|---------|-----------|
| Scenario Descriptions | ✅ Yes |
| Encounter Set Lists | ✅ Yes |
| Setup Instructions | ✅ Yes |
| Quest Stage Text | ✅ Yes |
| Individual Card Stats | ❌ No |

**Best for**: Determining which encounter sets belong to which scenario, setup instructions

---

### Data Source Summary

| Data Type | Recommended Source |
|-----------|-------------------|
| Player Cards (heroes, allies, etc.) | RingsDB API |
| Encounter Cards (enemies, locations, treacheries) | OCTGN GitHub |
| Quest Cards | OCTGN GitHub |
| Objective Cards | OCTGN GitHub |
| Scenario → Encounter Set Mapping | Official Rulebook |
| Setup Instructions | Official Rulebook |
| Card Verification | Hall of Beorn (manual) |

---

## Data Architecture

```
src/data/
├── sets/
│   └── 01/                          # Core Set
│       ├── index.ts                 # Re-exports for set
│       ├── playerCards.ts           # Heroes, allies, events, attachments
│       ├── encounterCards.ts        # All encounter cards by encounter set
│       └── questCards.ts            # Quest cards for all scenarios
├── scenarios/
│   ├── index.ts                     # Scenario registry
│   └── 01/                          # Core Set scenarios
│       ├── passageThroughMirkwood.ts
│       ├── journeyDownTheAnduin.ts
│       └── escapeFromDolGuldur.ts
└── decks/
    └── starter-01.ts                # Pre-built player decks
```

### Key Principle: Separation of Data and Configuration

- **Card DATA** lives in `sets/{setId}/` — contains full card definitions
- **Scenario CONFIGURATION** lives in `scenarios/{setId}/` — contains only card code references
- This prevents data duplication and ensures single source of truth

## Step-by-Step: Adding a New Scenario

### Step 1: Identify Required Encounter Sets

> 📖 **Data Source**: Official Rulebook

Check the rulebook or official sources to determine which encounter sets are used:

| Scenario | Encounter Sets |
|----------|----------------|
| Passage Through Mirkwood | Spiders of Mirkwood, Passage Through Mirkwood, Dol Guldur Orcs |
| Journey Down the Anduin | Journey Down the Anduin, Sauron's Reach, Dol Guldur Orcs, Wilderlands |
| Escape from Dol Guldur | Escape from Dol Guldur, Spiders of Mirkwood, Dol Guldur Orcs |

### Step 2: Add Encounter Set IDs

> 📖 **Data Source**: Official Rulebook (for encounter set names)

In `src/data/sets/01/encounterCards.ts`, add typed constants for any new encounter sets:

```typescript
export const ENCOUNTER_SET_IDS = {
    // Shared encounter sets
    SPIDERS_OF_MIRKWOOD: 'spiders-of-mirkwood',
    DOL_GULDUR_ORCS: 'dol-guldur-orcs',
    SAURONS_REACH: 'saurons-reach',
    WILDERLANDS: 'wilderlands',
    // Scenario-specific encounter sets
    PASSAGE_THROUGH_MIRKWOOD: 'passage-through-mirkwood',
    JOURNEY_DOWN_THE_ANDUIN: 'journey-down-the-anduin',
    ESCAPE_FROM_DOL_GULDUR: 'escape-from-dol-guldur',
} as const;

export type EncounterSetId = typeof ENCOUNTER_SET_IDS[keyof typeof ENCOUNTER_SET_IDS];
```

**Benefits of typed constants:**
- IDE autocomplete when referencing encounter sets
- Compile-time error if a typo is made
- Central place to see all available encounter sets

### Step 3: Add Encounter Cards

> 📦 **Data Source**: OCTGN GitHub (`https://raw.githubusercontent.com/GeckoTH/Lord-of-the-Rings/master/o8g/Sets/Core%20Set/set.xml`)

Add the encounter card data arrays for each new encounter set in `encounterCards.ts`.

**Fetching from OCTGN**: Use PowerShell to fetch and parse the XML:
```powershell
$response = Invoke-WebRequest -Uri "https://raw.githubusercontent.com/GeckoTH/Lord-of-the-Rings/master/o8g/Sets/Core%20Set/set.xml" -UseBasicParsing
$content = $response.Content
# Search for specific card
$content -split '<card' | Where-Object { $_ -match 'Eastern Crows' }
```

**Converting XML to TypeScript**:
```typescript
export const SAURONS_REACH_SET: EncounterCard[] = [
    {
        code: '01079',           // From "Card Number" + set prefix
        name: 'Eastern Crows',   // From card name attribute
        type_code: 'enemy',      // From "Type" property (Enemy → 'enemy')
        traits: 'Creature.',     // From "Traits" property
        engagement_cost: 30,     // From "Engagement Cost" property
        threat: 1,               // From "Threat" property
        attack: 1,               // From "Attack" property
        defense: 0,              // From "Defense" property
        health: 1,               // From "Health" property
        text: 'Surge. When Revealed: Eastern Crows gets +1 [threat] until the end of the phase.',
        shadow: 'Attacking enemy gets +1 [attack].',
        quantity: 3,             // From "Quantity" property
    },
    // ... more cards
];
```

**Required fields for encounter cards:**
- `code`: Unique card code (from RingsDB)
- `name`: Card name
- `type_code`: One of `'enemy'`, `'location'`, `'treachery'`, `'objective'`
- `quantity`: Number of copies in the encounter deck

**Type-specific fields:**
- **Enemy**: `engagement_cost`, `threat`, `attack`, `defense`, `health`
- **Location**: `threat`, `quest_points`
- **Treachery**: `text`
- **Objective**: `text`

### Step 4: Update Lookup Functions

Add the new encounter set to `ALL_ENCOUNTER_CARDS` and `getEncounterSet()`:

```typescript
export const ALL_ENCOUNTER_CARDS: EncounterCard[] = [
    ...SPIDERS_OF_MIRKWOOD,
    ...PASSAGE_THROUGH_MIRKWOOD_SET,
    ...DOL_GULDUR_ORCS_SET,
    ...SAURONS_REACH_SET,           // Add new set
    ...WILDERLANDS_SET,             // Add new set
    // ...
];

export function getEncounterSet(setName: string): EncounterCard[] {
    switch (setName) {
        case ENCOUNTER_SET_IDS.SAURONS_REACH:
            return SAURONS_REACH_SET;
        case ENCOUNTER_SET_IDS.WILDERLANDS:
            return WILDERLANDS_SET;
        // ... other cases
        default:
            return [];
    }
}
```

### Step 5: Add Quest Cards

> 📦 **Data Source**: OCTGN GitHub (same as encounter cards)

In `src/data/sets/01/questCards.ts`, add the quest card array:

```typescript
export const ANDUIN_QUEST_CARDS: EncounterCard[] = [
    {
        code: '01122A',
        name: 'To the River...',
        type_code: 'quest',
        stage: 1,
        quest_points: 8,
        text: '<b>Setup:</b> Search the encounter deck for a Hill Troll...',
        quantity: 1,
    },
    // Stage 2, Stage 3...
];
```

Update `ALL_QUEST_CARDS` and `getQuestCardsForScenario()`:

```typescript
export const ALL_QUEST_CARDS: EncounterCard[] = [
    ...MIRKWOOD_QUEST_CARDS,
    ...ANDUIN_QUEST_CARDS,        // Add new scenario quests
    ...DOL_GULDUR_QUEST_CARDS,
];

export function getQuestCardsForScenario(scenarioId: string): EncounterCard[] {
    switch (scenarioId) {
        case 'journey-down-the-anduin':
            return ANDUIN_QUEST_CARDS;
        // ... other cases
    }
}
```

### Step 6: Create Scenario File

Create `src/data/scenarios/01/{scenarioName}.ts`:

```typescript
/**
 * Journey Down the Anduin - Scenario Definition
 *
 * This file contains only references (card codes), not card data.
 * Card data is stored in src/data/sets/01/
 */

import type { EncounterCard } from '../../../engine/types';
import { getEncounterSet, getQuestCardsForScenario } from '../../sets/01';
import { getEncounterCards, ENCOUNTER_SET_IDS } from '../../sets/01/encounterCards';

// ── Scenario Metadata ─────────────────────────────────────────────────────────

export const SCENARIO_ID = 'journey-down-the-anduin';
export const SCENARIO_NAME = 'Journey Down the Anduin';
export const SCENARIO_SET = '01';
export const SCENARIO_NUMBER = 2;
export const SCENARIO_DIFFICULTY = 'Medium';

// ── Quest Card Codes ──────────────────────────────────────────────────────────

export const QUEST_CODES = ['01122A', '01123A', '01124A'];

// ── Encounter Sets Used ───────────────────────────────────────────────────────

export const ENCOUNTER_SET_NAMES = [
    ENCOUNTER_SET_IDS.JOURNEY_DOWN_THE_ANDUIN,
    ENCOUNTER_SET_IDS.SAURONS_REACH,
    ENCOUNTER_SET_IDS.DOL_GULDUR_ORCS,
    ENCOUNTER_SET_IDS.WILDERLANDS,
];

// ── Setup Cards ──────────────────────────────────────────────────────────────

export const SETUP_CARD_CODES = {
    HILL_TROLL: '01085',
};

// ── Build Functions ──────────────────────────────────────────────────────────

export function getQuestDeck(): EncounterCard[] {
    return getQuestCardsForScenario(SCENARIO_ID);
}

export function getEncounterDeckCards(): EncounterCard[] {
    return ENCOUNTER_SET_NAMES.flatMap((setName) => getEncounterSet(setName));
}

export function getSetupCards(): EncounterCard[] {
    return getEncounterCards([SETUP_CARD_CODES.HILL_TROLL]);
}

export function buildEncounterDeck(): EncounterCard[] {
    const cards = getEncounterDeckCards();
    const deck: EncounterCard[] = [];
    for (const card of cards) {
        const qty = card.quantity ?? 1;
        for (let i = 0; i < qty; i++) {
            deck.push({ ...card });
        }
    }
    return deck;
}

// ── Scenario Export ──────────────────────────────────────────────────────────

export const ANDUIN_SCENARIO = {
    id: SCENARIO_ID,
    name: SCENARIO_NAME,
    set: SCENARIO_SET,
    number: SCENARIO_NUMBER,
    difficulty: SCENARIO_DIFFICULTY,
    questCodes: QUEST_CODES,
    encounterSets: ENCOUNTER_SET_NAMES,
    setupCards: SETUP_CARD_CODES,
    getQuestDeck,
    getEncounterDeckCards,
    getSetupCards,
    buildEncounterDeck,
};

export default ANDUIN_SCENARIO;
```

### Step 7: Register in Scenario Index

Update `src/data/scenarios/index.ts`:

```typescript
import { ANDUIN_SCENARIO } from './01/journeyDownTheAnduin';

export const SCENARIO_REGISTRY: Record<string, ScenarioInfo> = {
    'journey-down-the-anduin': {
        id: 'journey-down-the-anduin',
        name: 'Journey Down the Anduin',
        set: '01',
        number: 2,
        difficulty: 'Medium',
    },
    // ... other scenarios
};

export const SCENARIOS = {
    'journey-down-the-anduin': ANDUIN_SCENARIO,
    // ... other scenarios
};

export { ANDUIN_SCENARIO };
```

## Core Set Scenarios Reference

### Passage Through Mirkwood (Difficulty: Easy)
- **Encounter Sets**: Spiders of Mirkwood, Passage Through Mirkwood, Dol Guldur Orcs
- **Quest Stages**: Flies and Spiders → A Fork in the Road → Escape from Mirkwood
- **Setup**: Add Forest Spider + Old Forest Road to staging

### Journey Down the Anduin (Difficulty: Medium)
- **Encounter Sets**: Journey Down the Anduin, Sauron's Reach, Dol Guldur Orcs, Wilderlands
- **Quest Stages**: To the River... → Anduin Passage → Ambush on the Shore
- **Setup**: Add Hill Troll to staging

### Escape from Dol Guldur (Difficulty: Hard)
- **Encounter Sets**: Escape from Dol Guldur, Spiders of Mirkwood, Dol Guldur Orcs
- **Quest Stages**: The Necromancer's Tower → Through the Caverns → Out of the Dungeons
- **Setup**: Place 3 objective cards in staging, randomly capture 1 hero as prisoner

## Card Code Reference

### Core Set Card Code Ranges

| Range | Content |
|-------|---------|
| 01001 - 01012 | Heroes |
| 01013 - 01072 | Player cards (allies, attachments, events) |
| 01073 | Gandalf (neutral ally) |
| 01074 - 01080 | Spiders of Mirkwood encounter set |
| 01081 - 01088 | Wilderlands encounter set |
| 01089 - 01095 | Dol Guldur Orcs encounter set |
| 01096 - 01100 | Passage Through Mirkwood encounter set |
| 01101 - 01110 | Escape from Dol Guldur encounter set |
| 01111 - 01114 | Journey Down the Anduin encounter set |
| 01115 - 01118 | Sauron's Reach encounter set |
| 01119 - 01122 | Passage Through Mirkwood quest cards |
| 01126 - 01128 | Journey Down the Anduin quest cards |
| 01123 - 01125 | Escape from Dol Guldur quest cards |

*Note: Card code ranges verified against OCTGN game definition (`References/octgn_core_set.xml`)*

---

*Last updated: 2026-02-27*
