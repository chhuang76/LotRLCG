/**
 * Unit tests for quest stage effects (Task 2.4)
 *
 * Tests the quest stage transition system:
 * 1. Stage 2 "When Revealed" - Add Caught in a Web to staging
 * 2. Stage 2 Forced - Reveal card if no enemies in play
 * 3. Stage 3 special - Reveal 2 cards instead of 1
 * 4. Victory condition - Empty encounter deck on Stage 3
 */

import { describe, it, expect } from 'vitest';
import {
    resolveQuestStageTransition,
    getEncounterCardsToReveal,
    checkVictoryCondition,
    checkStage2ForcedEffect,
    getCurrentStageNumber,
    isOnFinalStage,
} from './questStageEffects';
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

function createTestQuest(stage: number, code: string, name: string, questPoints: number = 10): EncounterCard {
    return {
        code,
        name,
        type_code: 'quest',
        stage,
        quest_points: questPoints,
        quantity: 1,
    };
}

function createTestGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'quest_staging',
        round: 1,
        players: [
            {
                id: 'player1',
                name: 'Test Player',
                threat: 28,
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
        currentQuest: createTestQuest(1, '01119A', 'Flies and Spiders', 8),
        questProgress: 0,
        firstPlayerId: 'player1',
        combatState: null,
        questCommitment: [],
        ...overrides,
    };
}

// ── Test: resolveQuestStageTransition ────────────────────────────────────────

describe('resolveQuestStageTransition', () => {
    it('should handle Stage 1 transition with no effect', () => {
        const state = createTestGameState();
        const stage1 = createTestQuest(1, '01119A', 'Flies and Spiders', 8);

        const result = resolveQuestStageTransition(state, stage1);

        expect(result.log.some((l) => l.includes('Flies and Spiders'))).toBe(true);
        expect(result.state.stagingArea.length).toBe(0); // No cards added
    });

    it('should add Caught in a Web to staging on Stage 2 transition', () => {
        const state = createTestGameState();
        state.stagingArea = []; // Start with empty staging
        const stage2 = createTestQuest(2, '01120A', 'A Fork in the Road', 10);

        const result = resolveQuestStageTransition(state, stage2);

        expect(result.log.some((l) => l.includes('A Fork in the Road'))).toBe(true);
        expect(result.log.some((l) => l.includes('Caught in a Web'))).toBe(true);
        expect(result.state.stagingArea.length).toBe(1);
        const stagingItem = result.state.stagingArea[0];
        // Check if it's an EncounterCard (not ActiveEnemy)
        expect('name' in stagingItem && stagingItem.name).toBe('Caught in a Web');
        expect('type_code' in stagingItem && stagingItem.type_code).toBe('treachery');
    });

    it('should handle Stage 3 transition with special rules logged', () => {
        const state = createTestGameState();
        const stage3 = createTestQuest(3, '01121A', 'Escape from Mirkwood', 0);

        const result = resolveQuestStageTransition(state, stage3);

        expect(result.log.some((l) => l.includes('Escape from Mirkwood'))).toBe(true);
        expect(result.log.some((l) => l.toLowerCase().includes('reveal 2'))).toBe(true);
        expect(result.log.some((l) => l.toLowerCase().includes('victory'))).toBe(true);
    });

    it('should handle unknown quest stages gracefully', () => {
        const state = createTestGameState();
        const unknownQuest = createTestQuest(99, '99999', 'Unknown Quest', 50);

        const result = resolveQuestStageTransition(state, unknownQuest);

        expect(result.log.some((l) => l.includes('Unknown Quest'))).toBe(true);
        expect(result.state).toBe(state); // State unchanged
    });
});

// ── Test: getEncounterCardsToReveal ──────────────────────────────────────────

describe('getEncounterCardsToReveal', () => {
    it('should return 1 for Stage 1', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(1, '01119A', 'Flies and Spiders', 8),
        });

        expect(getEncounterCardsToReveal(state)).toBe(1);
    });

    it('should return 1 for Stage 2', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(2, '01120A', 'A Fork in the Road', 10),
        });

        expect(getEncounterCardsToReveal(state)).toBe(1);
    });

    it('should return 2 for Stage 3', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(3, '01121A', 'Escape from Mirkwood', 0),
        });

        expect(getEncounterCardsToReveal(state)).toBe(2);
    });

    it('should return 1 if no current quest', () => {
        const state = createTestGameState({ currentQuest: null });

        expect(getEncounterCardsToReveal(state)).toBe(1);
    });
});

// ── Test: checkVictoryCondition ──────────────────────────────────────────────

describe('checkVictoryCondition', () => {
    it('should not trigger victory on Stage 1 with empty deck', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(1, '01119A', 'Flies and Spiders', 8),
            encounterDeck: [],
            encounterDiscard: [],
        });

        const result = checkVictoryCondition(state);

        expect(result.victory).toBe(false);
    });

    it('should not trigger victory on Stage 2 with empty deck', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(2, '01120A', 'A Fork in the Road', 10),
            encounterDeck: [],
            encounterDiscard: [],
        });

        const result = checkVictoryCondition(state);

        expect(result.victory).toBe(false);
    });

    it('should trigger victory on Stage 3 when deck and discard are empty', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(3, '01121A', 'Escape from Mirkwood', 0),
            encounterDeck: [],
            encounterDiscard: [],
        });

        const result = checkVictoryCondition(state);

        expect(result.victory).toBe(true);
        expect(result.reason).toContain('VICTORY');
        expect(result.reason).toContain('escaped Mirkwood');
    });

    it('should NOT trigger victory on Stage 3 if deck has cards', () => {
        const enemy: EncounterCard = {
            code: 'enemy1',
            name: 'Enemy',
            type_code: 'enemy',
            quantity: 1,
        };
        const state = createTestGameState({
            currentQuest: createTestQuest(3, '01121A', 'Escape from Mirkwood', 0),
            encounterDeck: [enemy],
            encounterDiscard: [],
        });

        const result = checkVictoryCondition(state);

        expect(result.victory).toBe(false);
    });

    it('should NOT trigger victory on Stage 3 if discard has cards', () => {
        const enemy: EncounterCard = {
            code: 'enemy1',
            name: 'Enemy',
            type_code: 'enemy',
            quantity: 1,
        };
        const state = createTestGameState({
            currentQuest: createTestQuest(3, '01121A', 'Escape from Mirkwood', 0),
            encounterDeck: [],
            encounterDiscard: [enemy],
        });

        const result = checkVictoryCondition(state);

        expect(result.victory).toBe(false);
    });
});

// ── Test: checkStage2ForcedEffect ────────────────────────────────────────────

describe('checkStage2ForcedEffect', () => {
    it('should return false on Stage 1', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(1, '01119A', 'Flies and Spiders', 8),
        });

        expect(checkStage2ForcedEffect(state)).toBe(false);
    });

    it('should return false on Stage 3', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(3, '01121A', 'Escape from Mirkwood', 0),
        });

        expect(checkStage2ForcedEffect(state)).toBe(false);
    });

    it('should return true on Stage 2 when no enemies in play', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(2, '01120A', 'A Fork in the Road', 10),
            stagingArea: [], // No enemies in staging
            players: [
                {
                    ...createTestGameState().players[0],
                    engagedEnemies: [], // No enemies engaged
                },
            ],
        });

        expect(checkStage2ForcedEffect(state)).toBe(true);
    });

    it('should return false on Stage 2 when enemy in staging', () => {
        const enemy: EncounterCard = {
            code: 'enemy1',
            name: 'Test Enemy',
            type_code: 'enemy',
            engagement_cost: 25,
            quantity: 1,
        };
        const state = createTestGameState({
            currentQuest: createTestQuest(2, '01120A', 'A Fork in the Road', 10),
            stagingArea: [enemy],
        });

        expect(checkStage2ForcedEffect(state)).toBe(false);
    });

    it('should return false on Stage 2 when enemy engaged with player', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(2, '01120A', 'A Fork in the Road', 10),
            stagingArea: [],
            players: [
                {
                    ...createTestGameState().players[0],
                    engagedEnemies: [
                        {
                            card: {
                                code: 'enemy1',
                                name: 'Test Enemy',
                                type_code: 'enemy',
                                quantity: 1,
                            },
                            damage: 0,
                            shadowCards: [],
                            engagedPlayerId: 'player1',
                            exhausted: false,
                        },
                    ],
                },
            ],
        });

        expect(checkStage2ForcedEffect(state)).toBe(false);
    });

    it('should return false when only location in staging (no enemies)', () => {
        const location: EncounterCard = {
            code: 'location1',
            name: 'Test Location',
            type_code: 'location',
            threat: 2,
            quest_points: 3,
            quantity: 1,
        };
        const state = createTestGameState({
            currentQuest: createTestQuest(2, '01120A', 'A Fork in the Road', 10),
            stagingArea: [location], // Location but no enemy
        });

        // Location is not an enemy, so the forced effect should trigger
        expect(checkStage2ForcedEffect(state)).toBe(true);
    });
});

// ── Test: Helper Functions ───────────────────────────────────────────────────

describe('getCurrentStageNumber', () => {
    it('should return 1 for Stage 1', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(1, '01119A', 'Flies and Spiders', 8),
        });

        expect(getCurrentStageNumber(state)).toBe(1);
    });

    it('should return 2 for Stage 2', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(2, '01120A', 'A Fork in the Road', 10),
        });

        expect(getCurrentStageNumber(state)).toBe(2);
    });

    it('should return 3 for Stage 3', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(3, '01121A', 'Escape from Mirkwood', 0),
        });

        expect(getCurrentStageNumber(state)).toBe(3);
    });

    it('should return 0 if no current quest', () => {
        const state = createTestGameState({ currentQuest: null });

        expect(getCurrentStageNumber(state)).toBe(0);
    });
});

describe('isOnFinalStage', () => {
    it('should return false for Stage 1', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(1, '01119A', 'Flies and Spiders', 8),
            questDeck: [
                createTestQuest(2, '01120A', 'A Fork in the Road', 10),
                createTestQuest(3, '01121A', 'Escape from Mirkwood', 0),
            ],
        });

        expect(isOnFinalStage(state)).toBe(false);
    });

    it('should return true for Stage 3', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(3, '01121A', 'Escape from Mirkwood', 0),
            questDeck: [],
        });

        expect(isOnFinalStage(state)).toBe(true);
    });

    it('should return true when quest deck is empty', () => {
        const state = createTestGameState({
            currentQuest: createTestQuest(2, '01120A', 'A Fork in the Road', 10),
            questDeck: [], // Empty quest deck means this is the last stage
        });

        expect(isOnFinalStage(state)).toBe(true);
    });
});
