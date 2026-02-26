/**
 * Unit tests for the game store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';

describe('gameStore', () => {
    beforeEach(() => {
        // Reset the store state before each test
        useGameStore.setState({
            gameState: {
                phase: 'setup',
                round: 0,
                players: [],
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
            },
            log: [],
            showMulliganModal: false,
        });
    });

    describe('adjustThreat', () => {
        it('should increase player threat', () => {
            // Setup: create a player with threat 28
            useGameStore.setState({
                gameState: {
                    ...useGameStore.getState().gameState,
                    players: [
                        {
                            id: 'player1',
                            name: 'Test Player',
                            threat: 28,
                            hand: [],
                            deck: [],
                            discard: [],
                            heroes: [],
                            allies: [],
                            engagedEnemies: [],
                        },
                    ],
                },
            });

            // Action: increase threat by 3
            useGameStore.getState().adjustThreat('player1', 3);

            // Assert: threat should be 31
            const state = useGameStore.getState();
            expect(state.gameState.players[0].threat).toBe(31);
        });

        it('should decrease player threat', () => {
            useGameStore.setState({
                gameState: {
                    ...useGameStore.getState().gameState,
                    players: [
                        {
                            id: 'player1',
                            name: 'Test Player',
                            threat: 30,
                            hand: [],
                            deck: [],
                            discard: [],
                            heroes: [],
                            allies: [],
                            engagedEnemies: [],
                        },
                    ],
                },
            });

            useGameStore.getState().adjustThreat('player1', -5);

            const state = useGameStore.getState();
            expect(state.gameState.players[0].threat).toBe(25);
        });

        it('should cap threat at 50', () => {
            useGameStore.setState({
                gameState: {
                    ...useGameStore.getState().gameState,
                    phase: 'planning',
                    players: [
                        {
                            id: 'player1',
                            name: 'Test Player',
                            threat: 48,
                            hand: [],
                            deck: [],
                            discard: [],
                            heroes: [],
                            allies: [],
                            engagedEnemies: [],
                        },
                    ],
                },
            });

            useGameStore.getState().adjustThreat('player1', 5);

            const state = useGameStore.getState();
            // Threat caps at 50
            expect(state.gameState.players[0].threat).toBe(50);
        });
    });

    describe('exhaustHero / readyHero', () => {
        const testHero = {
            code: 'hero1',
            name: 'Test Hero',
            type_code: 'hero' as const,
            sphere_code: 'leadership' as const,
            willpower: 2,
            attack: 3,
            defense: 2,
            health: 5,
            threat: 10,
            quantity: 1,
            currentHealth: 5,
            damage: 0,
            exhausted: false,
            resources: 1,
            attachments: [],
        };

        beforeEach(() => {
            useGameStore.setState({
                gameState: {
                    ...useGameStore.getState().gameState,
                    players: [
                        {
                            id: 'player1',
                            name: 'Test Player',
                            threat: 28,
                            hand: [],
                            deck: [],
                            discard: [],
                            heroes: [testHero],
                            allies: [],
                            engagedEnemies: [],
                        },
                    ],
                },
            });
        });

        it('should exhaust a ready hero', () => {
            useGameStore.getState().exhaustHero('player1', 'hero1');

            const state = useGameStore.getState();
            expect(state.gameState.players[0].heroes[0].exhausted).toBe(true);
        });

        it('should ready an exhausted hero', () => {
            // First exhaust the hero
            useGameStore.getState().exhaustHero('player1', 'hero1');
            expect(useGameStore.getState().gameState.players[0].heroes[0].exhausted).toBe(true);

            // Then ready the hero
            useGameStore.getState().readyHero('player1', 'hero1');

            const state = useGameStore.getState();
            expect(state.gameState.players[0].heroes[0].exhausted).toBe(false);
        });
    });

    describe('spendResource / gainResource', () => {
        const testHero = {
            code: 'hero1',
            name: 'Test Hero',
            type_code: 'hero' as const,
            sphere_code: 'leadership' as const,
            willpower: 2,
            attack: 3,
            defense: 2,
            health: 5,
            threat: 10,
            quantity: 1,
            currentHealth: 5,
            damage: 0,
            exhausted: false,
            resources: 3,
            attachments: [],
        };

        beforeEach(() => {
            useGameStore.setState({
                gameState: {
                    ...useGameStore.getState().gameState,
                    players: [
                        {
                            id: 'player1',
                            name: 'Test Player',
                            threat: 28,
                            hand: [],
                            deck: [],
                            discard: [],
                            heroes: [testHero],
                            allies: [],
                            engagedEnemies: [],
                        },
                    ],
                },
            });
        });

        it('should spend resources from hero', () => {
            useGameStore.getState().spendResource('player1', 'hero1', 2);

            const state = useGameStore.getState();
            expect(state.gameState.players[0].heroes[0].resources).toBe(1);
        });

        it('should clamp resources to 0 when spending more than available', () => {
            useGameStore.getState().spendResource('player1', 'hero1', 5);

            const state = useGameStore.getState();
            // Resources clamp to 0 (doesn't prevent spending)
            expect(state.gameState.players[0].heroes[0].resources).toBe(0);
        });

        it('should gain resources on hero', () => {
            useGameStore.getState().gainResource('player1', 'hero1', 2);

            const state = useGameStore.getState();
            expect(state.gameState.players[0].heroes[0].resources).toBe(5);
        });
    });

    describe('addToLog', () => {
        it('should add a log entry', () => {
            useGameStore.getState().addToLog('Test message', 'info');

            const state = useGameStore.getState();
            expect(state.log.length).toBe(1);
            expect(state.log[0].message).toBe('Test message');
            expect(state.log[0].type).toBe('info');
        });

        it('should preserve previous log entries', () => {
            useGameStore.getState().addToLog('First message', 'info');
            useGameStore.getState().addToLog('Second message', 'damage');

            const state = useGameStore.getState();
            expect(state.log.length).toBe(2);
            expect(state.log[0].message).toBe('First message');
            expect(state.log[1].message).toBe('Second message');
        });
    });
});
