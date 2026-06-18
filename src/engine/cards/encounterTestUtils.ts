/**
 * Shared test fixtures for encounter card (enemy/location) ability tests.
 *
 * Used by the per-card test files under `src/engine/cards/**` and by the
 * engine-level `enemyAbilities.test.ts`.
 */

import type { GameState, EncounterCard, ActiveEnemy, PlayerState, Hero } from '../types';

export function createHero(overrides: Partial<Hero> = {}): Hero {
    return {
        code: '01001',
        name: 'Test Hero',
        type_code: 'hero',
        quantity: 1,
        willpower: 2,
        attack: 3,
        defense: 2,
        health: 5,
        currentHealth: 5,
        damage: 0,
        exhausted: false,
        resources: 1,
        attachments: [],
        ...overrides,
    };
}

export function createPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
    return {
        id: 'player1',
        name: 'Test Player',
        threat: 25,
        hand: [],
        deck: [],
        discard: [],
        heroes: [createHero()],
        allies: [],
        engagedEnemies: [],
        ...overrides,
    };
}

export function createEnemy(overrides: Partial<EncounterCard> = {}): EncounterCard {
    return {
        code: '01000',
        name: 'Test Enemy',
        type_code: 'enemy',
        quantity: 1,
        engagement_cost: 30,
        threat: 2,
        attack: 3,
        defense: 1,
        health: 4,
        ...overrides,
    };
}

export function createActiveEnemy(overrides: Partial<ActiveEnemy> = {}): ActiveEnemy {
    return {
        card: createEnemy(),
        damage: 0,
        shadowCards: [],
        engagedPlayerId: 'player1',
        exhausted: false,
        ...overrides,
    };
}

export function createGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'encounter',
        round: 1,
        players: [createPlayer()],
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
