/**
 * Shared test fixtures for card ability tests.
 *
 * Used by the per-card test files under `src/engine/cards/**` and by the
 * engine-level `cardAbilities.test.ts`.
 */

import type { GameState, Hero, EncounterCard, AttachedCard } from '../types';

export function makeTestHero(overrides: Partial<Hero> = {}): Hero {
    return {
        code: 'test-hero',
        name: 'Test Hero',
        type_code: 'hero',
        sphere_code: 'leadership',
        threat: 10,
        willpower: 2,
        attack: 2,
        defense: 2,
        health: 5,
        currentHealth: 5,
        damage: 0,
        exhausted: false,
        resources: 1,
        attachments: [],
        quantity: 1,
        ...overrides,
    };
}

export function makeTestAttachment(overrides: Partial<AttachedCard> = {}): AttachedCard {
    return {
        code: 'test-attachment',
        name: 'Test Attachment',
        type_code: 'attachment',
        sphere_code: 'leadership',
        cost: 2,
        exhausted: false,
        quantity: 1,
        ...overrides,
    };
}

export function makeTestEnemy(overrides: Partial<EncounterCard> = {}): EncounterCard {
    return {
        code: 'test-enemy',
        name: 'Test Enemy',
        type_code: 'enemy',
        threat: 2,
        attack: 3,
        defense: 1,
        health: 4,
        engagement_cost: 30,
        quantity: 1,
        ...overrides,
    };
}

export function makeTestState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'planning',
        round: 1,
        players: [
            {
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [makeTestHero()],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            },
        ],
        encounterDeck: [],
        encounterDiscard: [],
        stagingArea: [],
        activeLocation: null,
        questDeck: [],
        currentQuest: null,
        questProgress: 0,
        firstPlayerId: 'player1',
        combatState: null,
        questCommitment: [],
        ...overrides,
    };
}
