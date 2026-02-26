/**
 * Unit tests for the game engine
 */

import { describe, it, expect } from 'vitest';
import {
    advancePhase,
    stepResource,
    stepRefresh,
} from './gameEngine';
import type { GameState, Hero, AttachedCard } from './types';

// Helper to create a minimal game state for testing
function createTestGameState(overrides: Partial<GameState> = {}): GameState {
    const defaultHero: Hero = {
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
    };

    return {
        phase: 'resource',
        round: 1,
        players: [
            {
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                hand: [],
                deck: [],
                discard: [],
                heroes: [defaultHero],
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

// Helper to create a test attachment
function createTestAttachment(overrides: Partial<AttachedCard> = {}): AttachedCard {
    return {
        code: 'test-attachment',
        name: 'Test Attachment',
        type_code: 'attachment',
        sphere_code: 'leadership',
        cost: 1,
        quantity: 1,
        exhausted: false,
        ...overrides,
    };
}

describe('gameEngine', () => {
    describe('stepResource', () => {
        it('should add 1 resource to each hero', () => {
            const state = createTestGameState();
            const result = stepResource(state);

            expect(result.state.players[0].heroes[0].resources).toBe(1);
        });

        it('should add resources to multiple heroes', () => {
            const secondHero: Hero = {
                code: 'test-hero-2',
                name: 'Second Hero',
                type_code: 'hero',
                sphere_code: 'tactics',
                willpower: 1,
                attack: 4,
                defense: 3,
                health: 4,
                threat: 12,
                quantity: 1,
                currentHealth: 4,
                damage: 0,
                exhausted: false,
                resources: 0,
                attachments: [],
            };

            const state = createTestGameState();
            state.players[0].heroes.push(secondHero);

            const result = stepResource(state);

            expect(result.state.players[0].heroes[0].resources).toBe(1);
            expect(result.state.players[0].heroes[1].resources).toBe(1);
        });

        it('should draw a card if deck has cards', () => {
            const testCard = {
                code: 'test-card',
                name: 'Test Card',
                type_code: 'ally' as const,
                quantity: 1,
            };

            const state = createTestGameState();
            state.players[0].deck = [testCard as any];

            const result = stepResource(state);

            expect(result.state.players[0].hand.length).toBe(1);
            expect(result.state.players[0].deck.length).toBe(0);
        });

        it('should not draw a card if deck is empty', () => {
            const state = createTestGameState();
            state.players[0].deck = [];
            state.players[0].hand = [];

            const result = stepResource(state);

            expect(result.state.players[0].hand.length).toBe(0);
        });
    });

    describe('advancePhase', () => {
        it('should advance from resource to planning', () => {
            const state = createTestGameState({ phase: 'resource' });
            const result = advancePhase(state);

            expect(result.state.phase).toBe('planning');
        });

        it('should advance from planning to quest', () => {
            const state = createTestGameState({ phase: 'planning' });
            const result = advancePhase(state);

            expect(result.state.phase).toBe('quest');
        });

        it('should advance from refresh to resource and increment round', () => {
            const state = createTestGameState({ phase: 'refresh', round: 1 });
            const result = advancePhase(state);

            expect(result.state.phase).toBe('resource');
            expect(result.state.round).toBe(2);
        });
    });

    describe('stepRefresh', () => {
        it('should raise threat by 1 and log it', () => {
            const state = createTestGameState({ phase: 'refresh', round: 1 });
            state.players[0].threat = 28;

            const result = stepRefresh(state);

            // Threat should be raised by 1
            expect(result.state.players[0].threat).toBe(29);

            // Log should contain threat raise message
            const threatLog = result.log.find((msg) => msg.includes('threat raised'));
            expect(threatLog).toBeDefined();
            expect(threatLog).toContain('29');
        });

        it('should ready all exhausted heroes', () => {
            const state = createTestGameState({ phase: 'refresh', round: 1 });
            state.players[0].heroes[0].exhausted = true;

            const result = stepRefresh(state);

            expect(result.state.players[0].heroes[0].exhausted).toBe(false);
        });

        it('should advance to resource phase and increment round', () => {
            const state = createTestGameState({ phase: 'refresh', round: 2 });

            const result = stepRefresh(state);

            expect(result.state.phase).toBe('resource');
            expect(result.state.round).toBe(3);
        });

        it('should ready exhausted attachments on heroes', () => {
            const exhaustedAttachment = createTestAttachment({
                code: 'steward-gondor',
                name: 'Steward of Gondor',
                exhausted: true,
            });

            const state = createTestGameState({ phase: 'refresh', round: 1 });
            state.players[0].heroes[0].attachments = [exhaustedAttachment];

            const result = stepRefresh(state);

            expect(result.state.players[0].heroes[0].attachments[0].exhausted).toBe(false);
        });

        it('should log attachment readying', () => {
            const exhaustedAttachment = createTestAttachment({
                code: 'steward-gondor',
                name: 'Steward of Gondor',
                exhausted: true,
            });

            const state = createTestGameState({ phase: 'refresh', round: 1 });
            state.players[0].heroes[0].attachments = [exhaustedAttachment];

            const result = stepRefresh(state);

            const attachmentLog = result.log.find((msg) =>
                msg.includes('Steward of Gondor') && msg.includes('readied')
            );
            expect(attachmentLog).toBeDefined();
        });

        it('should ready multiple exhausted attachments', () => {
            const attachment1 = createTestAttachment({
                code: 'steward-gondor',
                name: 'Steward of Gondor',
                exhausted: true,
            });
            const attachment2 = createTestAttachment({
                code: 'unexpected-courage',
                name: 'Unexpected Courage',
                exhausted: true,
            });

            const state = createTestGameState({ phase: 'refresh', round: 1 });
            state.players[0].heroes[0].attachments = [attachment1, attachment2];

            const result = stepRefresh(state);

            expect(result.state.players[0].heroes[0].attachments[0].exhausted).toBe(false);
            expect(result.state.players[0].heroes[0].attachments[1].exhausted).toBe(false);
        });

        it('should not log attachments that are already ready', () => {
            const readyAttachment = createTestAttachment({
                code: 'celebrians-stone',
                name: "Celebrían's Stone",
                exhausted: false,
            });

            const state = createTestGameState({ phase: 'refresh', round: 1 });
            state.players[0].heroes[0].attachments = [readyAttachment];

            const result = stepRefresh(state);

            const attachmentLog = result.log.find((msg) =>
                msg.includes("Celebrían's Stone") && msg.includes('readied')
            );
            expect(attachmentLog).toBeUndefined();
        });

        it('should ready attachments on multiple heroes', () => {
            const attachment1 = createTestAttachment({
                code: 'steward-gondor',
                name: 'Steward of Gondor',
                exhausted: true,
            });
            const attachment2 = createTestAttachment({
                code: 'unexpected-courage',
                name: 'Unexpected Courage',
                exhausted: true,
            });

            const secondHero: Hero = {
                code: 'test-hero-2',
                name: 'Second Hero',
                type_code: 'hero',
                sphere_code: 'tactics',
                willpower: 1,
                attack: 4,
                defense: 3,
                health: 4,
                threat: 12,
                quantity: 1,
                currentHealth: 4,
                damage: 0,
                exhausted: true,
                resources: 0,
                attachments: [attachment2],
            };

            const state = createTestGameState({ phase: 'refresh', round: 1 });
            state.players[0].heroes[0].attachments = [attachment1];
            state.players[0].heroes.push(secondHero);

            const result = stepRefresh(state);

            // Both heroes' attachments should be ready
            expect(result.state.players[0].heroes[0].attachments[0].exhausted).toBe(false);
            expect(result.state.players[0].heroes[1].attachments[0].exhausted).toBe(false);
        });

        it('should include attachment name and hero name in log', () => {
            const exhaustedAttachment = createTestAttachment({
                code: 'steward-gondor',
                name: 'Steward of Gondor',
                exhausted: true,
            });

            const state = createTestGameState({ phase: 'refresh', round: 1 });
            state.players[0].heroes[0].name = 'Aragorn';
            state.players[0].heroes[0].attachments = [exhaustedAttachment];

            const result = stepRefresh(state);

            const attachmentLog = result.log.find((msg) =>
                msg.includes('Steward of Gondor') && msg.includes('Aragorn')
            );
            expect(attachmentLog).toBeDefined();
        });
    });
});
