/**
 * Unit tests for engagement rules (Task 2.5)
 *
 * Tests the rules-compliant engagement system:
 * 1. Engage highest cost enemy first (iteratively)
 * 2. Optional/voluntary engagement
 * 3. "When Engaged" effects
 */

import { describe, it, expect } from 'vitest';
import {
    stepEncounter,
    engageEnemy,
    optionalEngagement,
} from './gameEngine';
import type { GameState, Hero, EncounterCard } from './types';

// ── Test Helpers ─────────────────────────────────────────────────────────────

function createTestHero(overrides: Partial<Hero> = {}): Hero {
    return {
        code: 'test-hero-1',
        name: 'Test Hero',
        type_code: 'hero',
        sphere_code: 'leadership',
        willpower: 2,
        attack: 3,
        defense: 2,
        health: 5,
        threat: 10,
        quantity: 1,
        currentHealth: 5,
        damage: 0,
        exhausted: false,
        resources: 0,
        attachments: [],
        ...overrides,
    };
}

function createTestEnemy(code: string, name: string, engagementCost: number, overrides: Partial<EncounterCard> = {}): EncounterCard {
    return {
        code,
        name,
        type_code: 'enemy',
        engagement_cost: engagementCost,
        threat: 2,
        attack: 2,
        defense: 1,
        health: 3,
        quantity: 1,
        ...overrides,
    };
}

function createTestGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'encounter',
        round: 1,
        players: [
            {
                id: 'player1',
                name: 'Test Player',
                threat: 30,
                hand: [],
                deck: [],
                discard: [],
                heroes: [createTestHero()],
                allies: [],
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

// ── Test: Highest Cost First Engagement ──────────────────────────────────────

describe('stepEncounter - Engagement Order', () => {
    it('should engage enemies in order of highest engagement cost first', () => {
        const state = createTestGameState();
        state.players[0].threat = 35;
        state.stagingArea = [
            createTestEnemy('enemy1', 'Low Cost Enemy', 20),
            createTestEnemy('enemy2', 'High Cost Enemy', 30),
            createTestEnemy('enemy3', 'Mid Cost Enemy', 25),
        ];

        const result = stepEncounter(state);

        // All 3 enemies should engage (all have cost <= 35)
        expect(result.state.players[0].engagedEnemies.length).toBe(3);

        // Check engagement order in logs: highest cost (30) should be first
        const engageLogs = result.log.filter((l) => l.includes('engages'));
        expect(engageLogs[0]).toContain('High Cost Enemy');
        expect(engageLogs[1]).toContain('Mid Cost Enemy');
        expect(engageLogs[2]).toContain('Low Cost Enemy');
    });

    it('should only engage enemies with cost <= player threat', () => {
        const state = createTestGameState();
        state.players[0].threat = 25;
        state.stagingArea = [
            createTestEnemy('enemy1', 'Low Cost Enemy', 20),
            createTestEnemy('enemy2', 'High Cost Enemy', 30), // Should NOT engage
            createTestEnemy('enemy3', 'Mid Cost Enemy', 25),
        ];

        const result = stepEncounter(state);

        // Only 2 enemies should engage (cost 20 and 25)
        expect(result.state.players[0].engagedEnemies.length).toBe(2);

        // High Cost Enemy should remain in staging
        const remainingEnemies = result.state.stagingArea.filter(
            (item) => !('card' in item) && item.type_code === 'enemy'
        );
        expect(remainingEnemies.length).toBe(1);
        expect((remainingEnemies[0] as EncounterCard).name).toBe('High Cost Enemy');
    });

    it('should engage no enemies if all have cost > player threat', () => {
        const state = createTestGameState();
        state.players[0].threat = 15;
        state.stagingArea = [
            createTestEnemy('enemy1', 'Enemy A', 20),
            createTestEnemy('enemy2', 'Enemy B', 25),
        ];

        const result = stepEncounter(state);

        expect(result.state.players[0].engagedEnemies.length).toBe(0);
        expect(result.state.stagingArea.length).toBe(2);
        expect(result.log.some((l) => l.includes('No enemies engaged'))).toBe(true);
    });

    it('should handle empty staging area', () => {
        const state = createTestGameState();
        state.players[0].threat = 30;
        state.stagingArea = [];

        const result = stepEncounter(state);

        expect(result.state.players[0].engagedEnemies.length).toBe(0);
        expect(result.log.some((l) => l.includes('No enemies engaged'))).toBe(true);
    });

    it('should not engage locations or other non-enemy cards', () => {
        const state = createTestGameState();
        state.players[0].threat = 30;
        state.stagingArea = [
            createTestEnemy('enemy1', 'Test Enemy', 25),
            {
                code: 'location1',
                name: 'Test Location',
                type_code: 'location' as const,
                threat: 3,
                quest_points: 2,
                quantity: 1,
            },
        ];

        const result = stepEncounter(state);

        // Only enemy should engage
        expect(result.state.players[0].engagedEnemies.length).toBe(1);
        // Location should remain in staging
        expect(result.state.stagingArea.length).toBe(1);
        expect((result.state.stagingArea[0] as EncounterCard).type_code).toBe('location');
    });
});

// ── Test: engageEnemy function ───────────────────────────────────────────────

describe('engageEnemy', () => {
    it('should move enemy from staging to engaged enemies', () => {
        const state = createTestGameState();
        const enemy = createTestEnemy('enemy1', 'Test Enemy', 25);
        state.stagingArea = [enemy];

        const result = engageEnemy(state, enemy, 0, 'player1');

        expect(result.state.stagingArea.length).toBe(0);
        expect(result.state.players[0].engagedEnemies.length).toBe(1);
        expect(result.state.players[0].engagedEnemies[0].card.name).toBe('Test Enemy');
    });

    it('should create ActiveEnemy with correct initial state', () => {
        const state = createTestGameState();
        const enemy = createTestEnemy('enemy1', 'Test Enemy', 25);
        state.stagingArea = [enemy];

        const result = engageEnemy(state, enemy, 0, 'player1');

        const activeEnemy = result.state.players[0].engagedEnemies[0];
        expect(activeEnemy.damage).toBe(0);
        expect(activeEnemy.shadowCards).toEqual([]);
        expect(activeEnemy.engagedPlayerId).toBe('player1');
        expect(activeEnemy.exhausted).toBe(false);
    });

    it('should log engagement with cost and threat info', () => {
        const state = createTestGameState();
        state.players[0].threat = 30;
        const enemy = createTestEnemy('enemy1', 'Test Enemy', 25);
        state.stagingArea = [enemy];

        const result = engageEnemy(state, enemy, 0, 'player1');

        expect(result.log.some((l) => l.includes('Test Enemy engages'))).toBe(true);
        expect(result.log.some((l) => l.includes('Engagement: 25'))).toBe(true);
        expect(result.log.some((l) => l.includes('Threat: 30'))).toBe(true);
    });
});

// ── Test: Optional Engagement ────────────────────────────────────────────────

describe('optionalEngagement', () => {
    it('should allow engaging enemy regardless of engagement cost', () => {
        const state = createTestGameState();
        state.players[0].threat = 20; // Below engagement cost
        const enemy = createTestEnemy('enemy1', 'High Cost Enemy', 40); // Cost 40 > threat 20
        state.stagingArea = [enemy];

        const result = optionalEngagement(state, 0, 'player1');

        // Enemy should engage even though cost > threat
        expect(result.state.players[0].engagedEnemies.length).toBe(1);
        expect(result.state.stagingArea.length).toBe(0);
        expect(result.log.some((l) => l.includes('optionally engages'))).toBe(true);
    });

    it('should return error for invalid enemy index', () => {
        const state = createTestGameState();
        state.stagingArea = [];

        const result = optionalEngagement(state, 0, 'player1');

        expect(result.log.some((l) => l.includes('Invalid enemy selection'))).toBe(true);
        expect(result.state).toBe(state);
    });

    it('should return error if target is not an enemy', () => {
        const state = createTestGameState();
        state.stagingArea = [
            {
                code: 'location1',
                name: 'Test Location',
                type_code: 'location' as const,
                threat: 3,
                quest_points: 2,
                quantity: 1,
            },
        ];

        const result = optionalEngagement(state, 0, 'player1');

        expect(result.log.some((l) => l.includes('Invalid enemy selection'))).toBe(true);
    });

    it('should trigger When Engaged effects for optionally engaged enemies', () => {
        const state = createTestGameState();
        state.players[0].threat = 10;
        // Hummerhorns has a When Engaged effect (correct code: 01075)
        const hummerhorns = createTestEnemy('01075', 'Hummerhorns', 40, {
            text: 'Forced: After Hummerhorns engages you, deal 5 damage to a single hero you control.',
        });
        state.stagingArea = [hummerhorns];

        const result = optionalEngagement(state, 0, 'player1');

        // Should engage and trigger the When Engaged effect
        expect(result.state.players[0].engagedEnemies.length).toBe(1);
        expect(result.log.some((l) => l.includes('Forced'))).toBe(true);
        expect(result.log.some((l) => l.includes('5 damage'))).toBe(true);
    });
});

// ── Test: When Engaged Effects ───────────────────────────────────────────────

describe('When Engaged Effects', () => {
    it('should trigger Hummerhorns effect: deal 5 damage to hero', () => {
        const state = createTestGameState();
        state.players[0].threat = 50;
        const hummerhorns = createTestEnemy('01075', 'Hummerhorns', 40);
        state.stagingArea = [hummerhorns];

        const result = stepEncounter(state);

        // Hero should have taken 5 damage
        expect(result.state.players[0].heroes[0].damage).toBe(5);
        expect(result.log.some((l) => l.includes('5 damage'))).toBe(true);
    });

    it('should defeat hero if Hummerhorns damage is fatal', () => {
        const state = createTestGameState();
        state.players[0].threat = 50;
        state.players[0].heroes = [createTestHero({ health: 4, damage: 0 })]; // 4 HP hero
        const hummerhorns = createTestEnemy('01075', 'Hummerhorns', 40);
        state.stagingArea = [hummerhorns];

        const result = stepEncounter(state);

        // Hero with 4 HP takes 5 damage -> defeated
        expect(result.state.players[0].heroes[0].damage).toBe(5);
        expect(result.log.some((l) => l.includes('defeated'))).toBe(true);
    });

    it('should trigger game over if all heroes defeated by When Engaged effect', () => {
        const state = createTestGameState();
        state.players[0].threat = 50;
        state.players[0].heroes = [createTestHero({ health: 5, damage: 0 })]; // 5 HP hero
        const hummerhorns = createTestEnemy('01075', 'Hummerhorns', 40);
        state.stagingArea = [hummerhorns];

        const result = stepEncounter(state);

        // Hero with 5 HP takes 5 damage -> defeated -> game over
        expect(result.state.players[0].heroes[0].damage).toBe(5);
        expect(result.state.phase).toBe('game_over');
        expect(result.log.some((l) => l.includes('players lose'))).toBe(true);
    });

    it('should log Forest Spider When Engaged effect', () => {
        const state = createTestGameState();
        state.players[0].threat = 30;
        const forestSpider = createTestEnemy('01096', 'Forest Spider', 25);
        state.stagingArea = [forestSpider];

        const result = stepEncounter(state);

        // Forest Spider should engage and log its effect
        expect(result.state.players[0].engagedEnemies.length).toBe(1);
        expect(result.log.some((l) => l.includes('Forced') && l.includes('Forest Spider'))).toBe(true);
    });

    it('should not trigger When Engaged effect for enemies without one', () => {
        const state = createTestGameState();
        state.players[0].threat = 30;
        const genericEnemy = createTestEnemy('generic', 'Generic Enemy', 25);
        state.stagingArea = [genericEnemy];

        const result = stepEncounter(state);

        // Should engage but no When Engaged logs
        expect(result.state.players[0].engagedEnemies.length).toBe(1);
        expect(result.log.filter((l) => l.includes('When Engaged')).length).toBe(0);
    });
});

// ── Test: Iterative Engagement ───────────────────────────────────────────────

describe('Iterative Engagement', () => {
    it('should engage multiple enemies one at a time in correct order', () => {
        const state = createTestGameState();
        state.players[0].threat = 40;
        state.stagingArea = [
            createTestEnemy('enemy1', 'Enemy Cost 15', 15),
            createTestEnemy('enemy2', 'Enemy Cost 35', 35),
            createTestEnemy('enemy3', 'Enemy Cost 25', 25),
            createTestEnemy('enemy4', 'Enemy Cost 40', 40),
        ];

        const result = stepEncounter(state);

        // All 4 enemies should engage
        expect(result.state.players[0].engagedEnemies.length).toBe(4);
        expect(result.state.stagingArea.length).toBe(0);

        // Check order in engaged enemies (should be highest to lowest)
        const engagedNames = result.state.players[0].engagedEnemies.map((e) => e.card.name);
        expect(engagedNames[0]).toBe('Enemy Cost 40');
        expect(engagedNames[1]).toBe('Enemy Cost 35');
        expect(engagedNames[2]).toBe('Enemy Cost 25');
        expect(engagedNames[3]).toBe('Enemy Cost 15');
    });

    it('should count total enemies engaged', () => {
        const state = createTestGameState();
        state.players[0].threat = 30;
        state.stagingArea = [
            createTestEnemy('enemy1', 'Enemy A', 20),
            createTestEnemy('enemy2', 'Enemy B', 25),
            createTestEnemy('enemy3', 'Enemy C', 30),
        ];

        const result = stepEncounter(state);

        expect(result.log.some((l) => l.includes('3 enemy/enemies engaged'))).toBe(true);
    });
});

// ── Test: Phase Transition ───────────────────────────────────────────────────

describe('stepEncounter - Phase Transition', () => {
    it('should transition to combat phase after engagement', () => {
        const state = createTestGameState();
        state.phase = 'encounter';
        state.stagingArea = [];

        const result = stepEncounter(state);

        expect(result.state.phase).toBe('combat');
    });

    it('should transition to game_over if all heroes defeated', () => {
        const state = createTestGameState();
        state.players[0].threat = 50;
        state.players[0].heroes = [createTestHero({ health: 3, damage: 0 })];
        const hummerhorns = createTestEnemy('01075', 'Hummerhorns', 40);
        state.stagingArea = [hummerhorns];

        const result = stepEncounter(state);

        // 3 HP hero takes 5 damage -> defeated -> game over
        expect(result.state.phase).toBe('game_over');
    });
});
