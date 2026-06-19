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
    /01                   - Core Set (set id 01) card modules.
      01001-aragorn.ts          + 01001-aragorn.test.ts        (hero)
      01004-gimli.ts            + 01004-gimli.test.ts          (hero, dynamic passive)
      01005-legolas.ts          + 01005-legolas.test.ts        (hero, response)
      01096-forest-spider.ts    + 01096-forest-spider.test.ts  (enemy, when engaged)
```

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
import './01/01001-aragorn';
import './01/01004-gimli';
import './01/01005-legolas';
// Encounter cards
import './01/01096-forest-spider';
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

Player abilities are **declarative**: a `CardAbility` object describing `type`, `trigger`,
`cost`, `effect`, `limit`, and an optional `condition` predicate. The generic
`resolveAbilityEffect` switch in `cardAbilities.ts` executes the effect — there is no
per-card imperative resolution code.

```ts
// src/engine/cards/01/01001-aragorn.ts
import { registerAbility, AbilityType, AbilityTrigger, AbilityLimit, EffectType } from '../../cardAbilities';

registerAbility({
    id: 'aragorn-ready',
    cardCode: '01001',
    cardName: 'Aragorn',
    type: AbilityType.Response,
    trigger: AbilityTrigger.AfterCommitToQuest,
    cost: { resources: 1, resourcesFromPool: '01001' },
    effect: { type: EffectType.ReadySelf },
    limit: AbilityLimit.Unlimited,
    description: 'After committing to a quest, spend 1 resource to ready Aragorn.',
    condition: (state, playerId, context) => {
        const committed = context?.committedCharacters ?? [];
        const isCommitted = committed.some((c) => c.type === 'hero' && c.code === '01001');
        if (!isCommitted) return false;
        const aragorn = state.players.find((p) => p.id === playerId)?.heroes.find((h) => h.code === '01001');
        return !!aragorn?.exhausted;
    },
});
```

- **Action / Manual** abilities are surfaced as activatable buttons in action windows.
- **Response** abilities are surfaced when their `condition` is currently met (the store's
  `getAvailableAbilities` evaluates `condition` against the current state).
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
   function using named constants. Reuse existing `EffectType`s where possible; only add a
   new `EffectType` + a `case` in `resolveAbilityEffect` if the effect is genuinely new.
3. Add the module to the barrel `src/engine/cards/index.ts` (side-effect import).
4. Create `src/engine/cards/{setId}/{code}-{name}.test.ts` covering registry, trigger,
   effect, and edge cases, using the shared fixtures.
5. Run `npx vitest run` and ensure the suite is green.
