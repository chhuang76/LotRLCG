# Card Abilities: File Structure & Unit Tests

This document describes how individual card abilities are organized as standalone
per-card modules with colocated unit tests, and how to add a new one.

> Card **data** (stats, traits, printed text) lives in `src/data/sets/{setId}/` and is
> **not** covered here — this document is only about card **behavior** (abilities/rules).
> See [ProjectStructure.md](./ProjectStructure.md) for the data layout.

## Overview

Card behavior is split into two layers:

1. **Shared engine machinery** — the registries, type vocabularies, cost/limit checking,
   effect resolution, and stat queries. These live in the engine modules and are not
   per-card.
2. **Per-card ability modules** — one file per card under `src/engine/cards/`, each
   self-registering its ability via the engine's `register*` functions, plus a colocated
   `*.test.ts`.

A card module is a **declarative registration** that runs as a side-effect on import. A
**barrel** (`src/engine/cards/index.ts`) imports every card module so that importing the
barrel once registers all cards.

## Directory Layout

```text
/src/engine
  cardAbilities.ts        - Player card machinery: registry, AbilityType/Trigger/Limit/
                            EffectType, cost & limit checks, resolveAbilityEffect,
                            stat modifiers, getEffective{Attack,Willpower,Defense}.
  enemyAbilities.ts       - Enemy machinery: registry, EnemyAbilityType, resolveWhenEngaged,
                            resolveEnemyWhenRevealed, resolveEndOfCombatEffects, etc.
  locationAbilities.ts    - Location machinery: registry, LocationAbilityType, travel cost
                            / after-traveling / while-active resolution.
  /cards
    index.ts              - Barrel. Side-effect imports of every per-card module.
    testUtils.ts          - Shared player-card test fixtures (makeTestHero/State/...).
    encounterTestUtils.ts - Shared encounter test fixtures (createHero/Player/Enemy/...).
    /01                   - Core Set (set id 01) card modules. Player cards
                            (heroes/allies/attachments) and encounter cards
                            (enemies/locations) all live here; each self-registers
                            on import and has a colocated *.test.ts.
      01001-aragorn.ts          (hero, response + cost hooks)
      01004-gimli.ts            (hero, dynamic passive)
      01007-eowyn.ts            (hero, action + cost hooks)
      01026-steward-of-gondor.ts(attachment, declarative action)
      01061-gandalf.ts          (ally, enter-play choice)
      01074-king-spider.ts      (enemy, when revealed)
      01096-forest-spider.ts    (enemy, when engaged)
      01078-mountains-of-mirkwood.ts (location, travel cost)
      01099-old-forest-road.ts  (location, after traveling)
```

> The engine files (`cardAbilities.ts`, `enemyAbilities.ts`, `locationAbilities.ts`)
> contain **only shared machinery** — registries, type vocabularies, cost/limit
> checks, effect resolution, helpers, and stat queries. They no longer hold any
> per-card definitions; every card is a module under `src/engine/cards/`.

### Naming convention
- Module file: `{cardCode}-{kebab-name}.ts` (e.g. `01001-aragorn.ts`).
- Test file: `{cardCode}-{kebab-name}.test.ts`, colocated next to the module.
- Folder: `src/engine/cards/{setId}/` (e.g. `01` for the Core Set).
- Both player cards and encounter cards live under the same `{setId}` folder; card codes
  are globally unique so there is no collision.

## How Registration Works

Each module calls the appropriate `register*` function at import time:

| Card kind | Registers via | From |
|-----------|---------------|------|
| Hero / ally / attachment | `registerAbility(...)` | `cardAbilities.ts` |
| Hero passive computed from live state | `registerAbility(...)` + `registerDynamicStatModifier(...)` | `cardAbilities.ts` |
| Enemy | `registerEnemyAbility(...)` | `enemyAbilities.ts` |
| Location | `registerLocationAbility(...)` | `locationAbilities.ts` |

The barrel `src/engine/cards/index.ts` imports every module for its side-effects:

```ts
// Player cards
import './01/01001-aragorn';
import './01/01026-steward-of-gondor';
// Encounter cards - enemies
import './01/01074-king-spider';
import './01/01096-forest-spider';
// Encounter cards - locations
import './01/01078-mountains-of-mirkwood';
```

The barrel is imported **once** by the app's registration entry point
(`src/store/gameStore.ts` does `import '../engine/cards';`), which guarantees all cards are
registered before gameplay.

> **Registration & tests:** because registration is a module-import side-effect, any test
> (or module) that needs a card registered must import it. Per-card test files import their
> own module directly (`import './01001-aragorn';`). Engine-level tests that exercise a card
> indirectly through the engine import the barrel (`import './cards';`) — see
> `enemyAbilities.test.ts` and `engagement.test.ts`.

## Ability Vocabulary (named constants)

The string vocabularies are `as const` object maps with derived union types (not raw string
literals and not TS `enum`s). Use the named constants in card definitions:

- `cardAbilities.ts`: `AbilityType`, `AbilityTrigger`, `AbilityLimit`, `EffectType`
- `enemyAbilities.ts`: `EnemyAbilityType`
- `locationAbilities.ts`: `LocationAbilityType`
- `eventEffects.ts`: `EventTiming`

Example: `type: AbilityType.Response`, `trigger: AbilityTrigger.AfterCommitToQuest`,
`effect: { type: EffectType.ReadySelf }`.

## Anatomy of a Player Card Module

Player abilities support **two complementary styles**. Prefer the self-contained
`resolve()`/cost-hook style for any card with novel behavior — it keeps the card's full
behavior in its own module and requires **no engine edits**.

### 1. Self-contained hooks (preferred)

A `CardAbility` may supply its own behavior functions, which take precedence over the
declarative `effect`/`cost` path:

| Hook | Signature | Purpose |
|------|-----------|---------|
| `resolve` | `(state, playerId, context?, choiceIndex?) => AbilityResult` | Apply the effect. |
| `canPay` | `(state, playerId, sourceHeroCode?) => { canPay, reason? }` | Check the cost. |
| `payCost` | `(state, playerId, sourceHeroCode?) => GameState` | Pay the cost. |

When a hook is present the activation pipeline uses it; when absent it falls back to the
declarative `effect`/`cost`. `effect` and `cost` are therefore **optional**. Compose hooks
from the exported helpers rather than duplicating engine logic.

```ts
// src/engine/cards/01/01001-aragorn.ts
import {
    registerAbility, AbilityType, AbilityTrigger, AbilityLimit,
    readyHero, heroHasResources, spendResources,
} from '../../cardAbilities';

const CARD_CODE = '01001';
const CARD_NAME = 'Aragorn';

registerAbility({
    id: 'aragorn-ready',
    cardCode: CARD_CODE,
    cardName: CARD_NAME,
    type: AbilityType.Response,
    trigger: AbilityTrigger.AfterCommitToQuest,
    limit: AbilityLimit.Unlimited,
    description: 'After committing to a quest, spend 1 resource to ready Aragorn.',
    canPay: (state, playerId) =>
        heroHasResources(state, playerId, CARD_CODE, 1)
            ? { canPay: true }
            : { canPay: false, reason: 'Not enough resources (need 1).' },
    payCost: (state, playerId) => spendResources(state, playerId, CARD_CODE, 1),
    resolve: (state, playerId) => {
        const { state: nextState, log } = readyHero(state, playerId, CARD_CODE, CARD_NAME);
        return { state: nextState, log, success: true };
    },
    condition: (state, playerId, context) => {
        const committed = context?.committedCharacters ?? [];
        if (!committed.some((c) => c.type === 'hero' && c.code === CARD_CODE)) return false;
        const aragorn = state.players.find((p) => p.id === playerId)?.heroes.find((h) => h.code === CARD_CODE);
        return !!aragorn?.exhausted;
    },
});
```

#### Reusable helpers (from `cardAbilities.ts`)

Effect helpers return `{ state, log }` (their last `label` arg prefixes the log line, by
convention the card name); cost helpers return a new `GameState` (payments) or `boolean`
(checks):

| Helper | Kind | What it does |
|--------|------|--------------|
| `readyHero(state, playerId, heroCode, label)` | effect | Un-exhaust a hero. |
| `addResources(state, playerId, heroCode, amount, label)` | effect | Add resources to a hero's pool. |
| `drawCards(state, playerId, amount, label)` | effect | Draw cards into hand. |
| `placeProgress(state, amount, label)` | effect | Place progress on the quest. |
| `reduceThreat(state, playerId, amount, label)` | effect | Lower threat (floored at 0). |
| `dealDamageToFirstEnemy(state, playerId, amount, label)` | effect | Damage/destroy the first engaged enemy. |
| `grantStatModifier(state, playerId, heroCode, stat, amount, sourceCardCode, label)` | effect | Register a stat modifier. |
| `heroHasResources(state, playerId, heroCode, amount)` | cost check | Enough resources? |
| `spendResources(state, playerId, heroCode, amount)` | cost pay | Spend resources. |
| `heroIsReady(state, playerId, heroCode)` | cost check | Hero not exhausted? |
| `exhaustHero(state, playerId, heroCode)` | cost pay | Exhaust the hero. |
| `handSize(state, playerId)` | cost check | Cards in hand. |
| `discardFromHand(state, playerId, count)` | cost pay | Discard from top of hand. |

If a card genuinely needs new state manipulation, add a new helper here (and reuse it)
rather than expanding the declarative `resolveAbilityEffect` switch.

### 2. Declarative effect/cost (legacy)

Older cards describe behavior with a declarative `effect` (and optional `cost`) object;
the generic `resolveAbilityEffect` switch and `canPayAbilityCost`/`payAbilityCost` in
`cardAbilities.ts` execute them. This path remains for the cards still defined inside
`cardAbilities.ts` (Steward of Gondor 01026, Celebrían's Stone 01027, Blade of Gondolin
01044, Gandalf 01061). Passive stat bonuses (e.g. Celebrían's Stone) still use this style.

```ts
registerAbility({
    id: 'steward-resources',
    cardCode: '01026',
    cardName: 'Steward of Gondor',
    type: AbilityType.Action,
    trigger: AbilityTrigger.Manual,
    cost: { exhaustSelf: true },
    effect: { type: EffectType.GainResources, amount: 2, target: 'attached_hero' },
    limit: AbilityLimit.Unlimited,
    description: 'Exhaust to add 2 resources to attached hero.',
});
```

- **Action / Manual** abilities are surfaced as activatable buttons in action windows.
- **Response** abilities are surfaced when their `condition` is currently met (the store's
  `getAvailableAbilities` evaluates `condition` against the current state). Its cost check
  calls `canPayAbilityCost`, which honors a `canPay` hook when present.
- **Passive** abilities apply via the stat-modifier system; passives whose bonus depends on
  live state (e.g. Gimli's +1 Attack per damage) register a **dynamic** stat modifier with
  `registerDynamicStatModifier`, evaluated inside `getEffective*`.

## Anatomy of an Encounter Card Module

Enemy/location abilities are **imperative**: each provides an `execute` (and optional
`canExecute`) function. Keep per-instance effects in the engine machinery rather than
matching by card code inside `execute` (multiple copies share a code) — for example, a
`when_engaged` attack bonus is returned as `attackModifier` and applied by `engageEnemy`
to the specific instance that engaged.

```ts
// src/engine/cards/01/01096-forest-spider.ts
import { registerEnemyAbility, EnemyAbilityType } from '../../enemyAbilities';

registerEnemyAbility({
    code: '01096',
    name: 'Forest Spider',
    type: EnemyAbilityType.WhenEngaged,
    description: 'Gets +1 Attack until end of round.',
    execute: (state, enemy, playerId) => {
        const enemyName = 'card' in enemy ? enemy.card.name : enemy.name;
        return {
            state, // engageEnemy applies the modifier to the engaging instance
            log: [`Forced: ${enemyName} engages ${playerId} - gets +1 Attack until end of round.`],
            success: true,
            attackModifier: 1,
        };
    },
});
```

## Colocated Unit Tests

Each card has a `*.test.ts` next to its module. A test file should:

1. Import the card module for its side-effect registration: `import './01001-aragorn';`
2. Import the engine functions under test and the relevant named constants.
3. Import shared fixtures from `../testUtils` (player) or `../encounterTestUtils` (encounter).

A test file typically covers:
- **Registry** — the ability is registered with the expected id / type / trigger.
- **Trigger / condition** — it fires under the right conditions and not otherwise.
- **Effect** — the resulting state change (and cost) is correct.
- **Lifecycle / edge cases** — limits, expiry, multiple instances, failure paths.

```ts
// src/engine/cards/01/01001-aragorn.test.ts (excerpt)
import './01001-aragorn';
import { getAbilities, getTriggeredAbilities, activateAbility, AbilityType, AbilityTrigger } from '../../cardAbilities';
import { makeTestHero, makeTestState } from '../testUtils';
```

### Shared fixtures
- `src/engine/cards/testUtils.ts` — `makeTestHero`, `makeTestAttachment`, `makeTestEnemy`,
  `makeTestState` (player-card tests).
- `src/engine/cards/encounterTestUtils.ts` — `createHero`, `createPlayer`, `createEnemy`,
  `createActiveEnemy`, `createGameState` (enemy/location tests).

Run the suite with `npm test` (or `npx vitest run`).

## Adding a New Card

1. **(Data, separate)** Ensure the card's data exists in `src/data/sets/{setId}/`.
2. Create `src/engine/cards/{setId}/{code}-{name}.ts` and call the appropriate `register*`
   function using named constants. For novel behavior, supply `resolve()` (and
   `canPay`/`payCost` if the card has a cost) composed from the exported effect/cost
   helpers — this needs **no engine edit**. Only fall back to a declarative `effect` (and a
   new `EffectType` + `case` in `resolveAbilityEffect`) for trivial reuse of an existing
   effect.
3. Add the module to the barrel `src/engine/cards/index.ts` (side-effect import).
4. Create `src/engine/cards/{setId}/{code}-{name}.test.ts` covering registry, trigger,
   effect, and edge cases, using the shared fixtures.
5. Run `npx vitest run` and ensure the suite is green.
